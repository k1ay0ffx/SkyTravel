from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta

from core.models import Flight, Airplane, Airport, Booking
from ..serializers.admin_serializers import (
    AdminFlightSerializer,
    AdminFlightCreateSerializer,
    AdminAirplaneSerializer,
    AdminBookingSerializer,
    AdminUserSerializer,
    AdminStatsSerializer
)

User = get_user_model()


def is_admin_user(user):
    """Проверка прав администратора"""
    return user.is_authenticated and (user.is_staff or user.is_superuser)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    """
    Статистика для админ панели
    GET /api/v1/admin/stats/
    """
    if not is_admin_user(request.user):
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    # Основная статистика
    total_flights = Flight.objects.count()
    active_flights = Flight.objects.filter(status='scheduled').count()
    total_bookings = Booking.objects.count()
    paid_bookings = Booking.objects.filter(status='paid').count()
    total_revenue = Booking.objects.filter(status='paid').aggregate(
        total=Sum('total_price')
    )['total'] or 0
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()

    # Популярные направления
    popular_destinations = list(Airport.objects.annotate(
        flights_count=Count('arrivals')  # ИСПРАВЛЕНО
    ).filter(flights_count__gt=0).order_by('-flights_count')[:5].values(
        'city', 'flights_count'
    ))

    # Доходы по месяцам (последние 6 месяцев)
    monthly_revenue = []
    for i in range(6):
        month_start = (timezone.now() - timedelta(days=30 * i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

        revenue = Booking.objects.filter(
            status='paid',
            created_at__gte=month_start,
            created_at__lte=month_end
        ).aggregate(total=Sum('total_price'))['total'] or 0

        monthly_revenue.append({
            'month': month_start.strftime('%Y-%m'),
            'revenue': float(revenue)
        })

    stats = {
        'total_flights': total_flights,
        'active_flights': active_flights,
        'total_bookings': total_bookings,
        'paid_bookings': paid_bookings,
        'total_revenue': float(total_revenue),
        'total_users': total_users,
        'active_users': active_users,
        'popular_destinations': popular_destinations,
        'monthly_revenue': monthly_revenue[::-1]  # Обращаем порядок
    }

    serializer = AdminStatsSerializer(data=stats)
    if serializer.is_valid():
        return Response(serializer.data)
    return Response(stats)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_flights(request):
    """
    Управление рейсами
    GET /api/v1/admin/flights/ - список всех рейсов
    POST /api/v1/admin/flights/ - создание нового рейса
    """
    if not is_admin_user(request.user):
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        flights = Flight.objects.select_related(
            'origin', 'destination', 'airplane'
        ).prefetch_related('bookings').order_by('-created_at')

        # Фильтрация
        status_filter = request.query_params.get('status')
        if status_filter:
            flights = flights.filter(status=status_filter)

        date_from = request.query_params.get('date_from')
        if date_from:
            flights = flights.filter(departure_time__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            flights = flights.filter(departure_time__lte=date_to)

        serializer = AdminFlightSerializer(flights, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = AdminFlightCreateSerializer(data=request.data)
        if serializer.is_valid():
            flight = serializer.save()
            response_serializer = AdminFlightSerializer(flight)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_flight_detail(request, flight_id):
    """
    Детальное управление рейсом
    GET /api/v1/admin/flights/{id}/ - информация о рейсе
    PUT /api/v1/admin/flights/{id}/ - обновление рейса
    DELETE /api/v1/admin/flights/{id}/ - удаление рейса
    """
    if not is_admin_user(request.user):
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    try:
        flight = Flight.objects.get(id=flight_id)
    except Flight.DoesNotExist:
        return Response({'error': 'Рейс не найден'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AdminFlightSerializer(flight)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = AdminFlightCreateSerializer(flight, data=request.data, partial=True)
        if serializer.is_valid():
            flight = serializer.save()
            response_serializer = AdminFlightSerializer(flight)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Проверяем, есть ли оплаченные бронирования
        if flight.bookings.filter(status='paid').exists():
            return Response(
                {'error': 'Нельзя удалить рейс с оплаченными бронированиями'},
                status=status.HTTP_400_BAD_REQUEST
            )

        flight.delete()
        return Response({'message': 'Рейс удален'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_bookings(request):
    """
    Список всех бронирований для админа
    GET /api/v1/admin/bookings/
    """
    if not is_admin_user(request.user):
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    bookings = Booking.objects.select_related(
        'user', 'flight', 'flight__origin', 'flight__destination'
    ).prefetch_related('booked_seats').order_by('-created_at')

    # Фильтрация
    status_filter = request.query_params.get('status')
    if status_filter:
        bookings = bookings.filter(status=status_filter)

    user_email = request.query_params.get('user_email')
    if user_email:
        bookings = bookings.filter(user__email__icontains=user_email)

    serializer = AdminBookingSerializer(bookings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users(request):
    """
    Список всех пользователей для админа
    GET /api/v1/admin/users/
    """
    if not is_admin_user(request.user):
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    users = User.objects.prefetch_related('bookings').order_by('-date_joined')

    # Фильтрация
    is_active = request.query_params.get('is_active')
    if is_active is not None:
        users = users.filter(is_active=is_active.lower() == 'true')

    search = request.query_params.get('search')
    if search:
        users = users.filter(
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search)
        )

    serializer = AdminUserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_airplanes(request):
    """
    Список всех самолетов для админа
    GET /api/v1/admin/airplanes/
    """
    if not is_admin_user(request.user):
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    airplanes = Airplane.objects.prefetch_related('flights').order_by('model')
    serializer = AdminAirplaneSerializer(airplanes, many=True)
    return Response(serializer.data)