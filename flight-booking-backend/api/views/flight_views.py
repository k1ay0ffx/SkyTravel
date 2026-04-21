from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, F
from datetime import datetime, timedelta

from core.models import Flight, Airport, Seat, BookedSeat
from ..serializers.flight_serializers import (
    FlightListSerializer,
    FlightDetailSerializer,
    FlightSearchSerializer,
    AirportSerializer
)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_flights(request):
    """
    Поиск рейсов с фильтрацией и сортировкой
    GET /api/v1/flights/search/

    Query params:
    - origin_city: Город вылета (обязательно)
    - destination_city: Город прилета (обязательно)
    - departure_date: Дата вылета (YYYY-MM-DD, обязательно)
    - return_date: Дата возврата (YYYY-MM-DD, опционально)
    - passengers: Количество пассажиров (1-9, по умолчанию 1)
    - seat_class: Класс обслуживания (economy/business/first)
    - sort_by: Сортировка (price/departure_time/duration/available_seats)
    - order: Порядок сортировки (asc/desc, по умолчанию asc)
    """
    serializer = FlightSearchSerializer(data=request.query_params)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = serializer.validated_data

    # Базовый запрос
    queryset = Flight.objects.select_related(
        'origin', 'destination', 'airplane'
    ).filter(
        status='scheduled',
        origin__city__icontains=validated_data['origin_city'],
        destination__city__icontains=validated_data['destination_city'],
        departure_time__date=validated_data['departure_date']
    )

    # Фильтрация по количеству доступных мест
    passengers = validated_data.get('passengers', 1)
    flight_ids = []
    for flight in queryset:
        available_seats = get_available_seats_count(flight, validated_data.get('seat_class'))
        if available_seats >= passengers:
            flight_ids.append(flight.id)

    queryset = queryset.filter(id__in=flight_ids)

    # Сортировка
    sort_by = request.query_params.get('sort_by', 'departure_time')
    order = request.query_params.get('order', 'asc')

    sort_fields = {
        'price': 'price',
        'departure_time': 'departure_time',
        'duration': 'arrival_time',  # Приблизительная сортировка
        'available_seats': 'id'  # Будем сортировать вручную
    }

    if sort_by in ['price', 'departure_time']:
        order_prefix = '' if order == 'asc' else '-'
        queryset = queryset.order_by(f'{order_prefix}{sort_fields[sort_by]}')

    serializer = FlightListSerializer(queryset, many=True)

    # Для сортировки по доступным местам или продолжительности
    flights_data = serializer.data
    if sort_by == 'available_seats':
        flights_data.sort(
            key=lambda x: x['available_seats'],
            reverse=(order == 'desc')
        )
    elif sort_by == 'duration':
        flights_data.sort(
            key=lambda x: calculate_duration_minutes(x),
            reverse=(order == 'desc')
        )

    return Response({
        'count': len(flights_data),
        'results': flights_data,
        'search_params': validated_data
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def flight_detail(request, flight_id):
    """
    Детальная информация о рейсе с картой мест
    GET /api/v1/flights/{flight_id}/
    """
    try:
        flight = Flight.objects.select_related(
            'origin', 'destination', 'airplane'
        ).get(id=flight_id)
    except Flight.DoesNotExist:
        return Response(
            {'error': 'Рейс не найден'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = FlightDetailSerializer(flight)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def airports_list(request):
    """
    Список всех аэропортов для автокомплита
    GET /api/v1/flights/airports/

    Query params:
    - search: Поиск по названию города или аэропорта
    """
    search = request.query_params.get('search', '')
    queryset = Airport.objects.all()

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) |
            Q(city__icontains=search) |
            Q(iata_code__icontains=search)
        )

    queryset = queryset.order_by('city', 'name')[:20]  # Ограничиваем результат
    serializer = AirportSerializer(queryset, many=True)

    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def popular_destinations(request):
    """
    Популярные направления
    GET /api/v1/flights/popular-destinations/
    """
    # Находим самые популярные направления по количеству рейсов
    popular = Airport.objects.annotate(
        flights_count=Count('departures')  # или 'arrivals' - зависит от модели
    ).filter(flights_count__gt=0).order_by('-flights_count')[:10]

    serializer = AirportSerializer(popular, many=True)
    return Response(serializer.data)


# Вспомогательные функции
def get_available_seats_count(flight, seat_class=None):
    """Подсчет доступных мест для рейса"""
    seats_query = Seat.objects.filter(
        airplane=flight.airplane,
        is_available=True
    )

    if seat_class:
        seats_query = seats_query.filter(seat_class=seat_class)

    # Исключаем забронированные места
    booked_seats = BookedSeat.objects.filter(
        flight=flight,
        booking__status__in=['reserved', 'paid']
    ).values_list('seat_id', flat=True)

    return seats_query.exclude(id__in=booked_seats).count()


def calculate_duration_minutes(flight_data):
    """Рассчет продолжительности полета в минутах для сортировки"""
    try:
        departure = datetime.fromisoformat(flight_data['departure_time'].replace('Z', '+00:00'))
        arrival = datetime.fromisoformat(flight_data['arrival_time'].replace('Z', '+00:00'))
        return int((arrival - departure).total_seconds() / 60)
    except:
        return 0