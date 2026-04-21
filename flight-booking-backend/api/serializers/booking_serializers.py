from rest_framework import serializers
from django.db import transaction
from core.models import Booking, BookedSeat, Seat, Flight
from .flight_serializers import SeatSerializer, FlightListSerializer


class BookedSeatSerializer(serializers.ModelSerializer):
    seat = SeatSerializer(read_only=True)

    class Meta:
        model = BookedSeat
        fields = ('id', 'seat')  # ✅ Убираем passenger_name, passenger_email


class BookingSerializer(serializers.ModelSerializer):
    booked_seats = BookedSeatSerializer(many=True, read_only=True)
    flight = FlightListSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'flight', 'user', 'total_price', 'status',
            'created_at', 'updated_at', 'booked_seats'
        )
        read_only_fields = ('user', 'total_price', 'created_at', 'updated_at')


class CreateBookingSerializer(serializers.Serializer):
    flight_id = serializers.IntegerField()
    seats = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        min_length=1,
        max_length=9
    )

    def validate_flight_id(self, value):
        try:
            flight = Flight.objects.get(id=value, status='scheduled')
            return value
        except Flight.DoesNotExist:
            raise serializers.ValidationError("Рейс не найден или недоступен")

    def validate_seats(self, value):
        for seat_data in value:
            # ✅ Проверяем только seat_id
            if 'seat_id' not in seat_data:
                raise serializers.ValidationError("Каждое место должно содержать seat_id")
        return value

    def validate(self, attrs):
        flight = Flight.objects.get(id=attrs['flight_id'])
        seat_ids = [int(seat['seat_id']) for seat in attrs['seats']]

        # Проверяем существование мест
        seats = Seat.objects.filter(id__in=seat_ids, airplane=flight.airplane)
        if len(seats) != len(seat_ids):
            raise serializers.ValidationError("Некоторые места не существуют в этом самолете")

        # Проверяем доступность мест
        booked_seats = BookedSeat.objects.filter(
            flight=flight,
            seat_id__in=seat_ids,
            booking__status__in=['reserved', 'paid']
        )

        if booked_seats.exists():
            raise serializers.ValidationError("Некоторые места уже забронированы")

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        flight = Flight.objects.get(id=validated_data['flight_id'])
        seats_data = validated_data['seats']

        with transaction.atomic():
            # Создаем бронирование
            booking = Booking.objects.create(
                flight=flight,
                user=user,
                total_price=flight.price * len(seats_data),
                status='reserved'
            )

            # ✅ Создаем забронированные места БЕЗ данных пассажиров
            for seat_data in seats_data:
                seat = Seat.objects.get(id=seat_data['seat_id'])
                BookedSeat.objects.create(
                    booking=booking,
                    flight=flight,
                    seat=seat
                    # ❌ Убрали passenger_name и passenger_email
                )

            return booking


class PaymentSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=['card', 'cash'])

    def validate_booking_id(self, value):
        user = self.context['request'].user
        try:
            booking = Booking.objects.get(id=value, user=user, status='reserved')
            return value
        except Booking.DoesNotExist:
            raise serializers.ValidationError("Бронирование не найдено или уже оплачено")