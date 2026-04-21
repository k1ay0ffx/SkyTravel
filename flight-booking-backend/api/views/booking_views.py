from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from datetime import datetime, timedelta

from core.models import Booking, BookedSeat, Flight
from ..serializers.booking_serializers import (
    BookingSerializer,
    CreateBookingSerializer,
    PaymentSerializer
)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_booking(request):
    """
    Создание бронирования
    POST /api/v1/bookings/create/

    Body:
    {
        "flight_id": 1,
        "seats": [
            {
                "seat_id": 15,
                "passenger_name": "Иван Петров",
                "passenger_email": "ivan@example.com"
            }
        ]
    }
    """
    serializer = CreateBookingSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        booking = serializer.save()
        response_serializer = BookingSerializer(booking)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_bookings(request):
    """
    Список бронирований пользователя
    GET /api/v1/bookings/my/
    """
    bookings = Booking.objects.filter(user=request.user).select_related('flight').prefetch_related(
        'booked_seats__seat'
    ).order_by('-created_at')

    serializer = BookingSerializer(bookings, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_detail(request, booking_id):
    """
    Детальная информация о бронировании
    GET /api/v1/bookings/{booking_id}/
    """
    try:
        booking = Booking.objects.select_related('flight').prefetch_related(
            'booked_seats__seat'
        ).get(id=booking_id, user=request.user)
    except Booking.DoesNotExist:
        return Response(
            {'error': 'Бронирование не найдено'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = BookingSerializer(booking)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_booking(request):
    """
    Оплата бронирования (мок)
    POST /api/v1/bookings/pay/

    Body:
    {
        "booking_id": 1,
        "payment_method": "card"
    }
    """
    serializer = PaymentSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    booking_id = serializer.validated_data['booking_id']
    payment_method = serializer.validated_data['payment_method']

    try:
        booking = Booking.objects.get(id=booking_id, user=request.user, status='reserved')

        # Мок оплаты - просто меняем статус
        with transaction.atomic():
            booking.status = 'paid'
            booking.save()

        response_serializer = BookingSerializer(booking)
        return Response({
            'message': 'Оплата прошла успешно',
            'booking': response_serializer.data
        })

    except Booking.DoesNotExist:
        return Response(
            {'error': 'Бронирование не найдено или уже оплачено'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_booking(request, booking_id):
    """
    Отмена бронирования
    POST /api/v1/bookings/{booking_id}/cancel/
    """
    try:
        booking = Booking.objects.get(id=booking_id, user=request.user)

        if booking.status == 'cancelled':
            return Response(
                {'error': 'Бронирование уже отменено'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if booking.status == 'paid':
            # Проверяем, можно ли отменить (например, за 24 часа до вылета)
            time_to_departure = booking.flight.departure_time - datetime.now()
            if time_to_departure < timedelta(hours=24):
                return Response(
                    {'error': 'Отмена невозможна менее чем за 24 часа до вылета'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        booking.status = 'cancelled'
        booking.save()

        serializer = BookingSerializer(booking)
        return Response({
            'message': 'Бронирование отменено',
            'booking': serializer.data
        })

    except Booking.DoesNotExist:
        return Response(
            {'error': 'Бронирование не найдено'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def booking_stats(request):
    """
    Статистика бронирований пользователя
    GET /api/v1/bookings/stats/
    """
    user_bookings = Booking.objects.filter(user=request.user)

    stats = {
        'total_bookings': user_bookings.count(),
        'paid_bookings': user_bookings.filter(status='paid').count(),
        'reserved_bookings': user_bookings.filter(status='reserved').count(),
        'cancelled_bookings': user_bookings.filter(status='cancelled').count(),
        'total_spent': sum([b.total_price for b in user_bookings.filter(status='paid')])
    }

    return Response(stats)