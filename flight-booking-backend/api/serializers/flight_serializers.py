from rest_framework import serializers
from core.models import Flight, Airport, Airplane, Seat
from datetime import datetime, time


class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airport
        fields = ('id', 'name', 'city', 'country', 'iata_code')


class AirplaneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airplane
        fields = ('id', 'model', 'total_rows', 'seats_per_row', 'business_rows')


class SeatSerializer(serializers.ModelSerializer):
    is_booked = serializers.SerializerMethodField()

    class Meta:
        model = Seat
        fields = ('id', 'row', 'number', 'seat_class', 'is_available', 'is_booked')

    def get_is_booked(self, obj):
        flight_id = self.context.get('flight_id')
        if flight_id:
            from core.models import BookedSeat
            return BookedSeat.objects.filter(
                seat=obj,
                flight_id=flight_id,
                booking__status__in=['reserved', 'paid']
            ).exists()
        return False


class FlightListSerializer(serializers.ModelSerializer):
    origin = AirportSerializer(read_only=True)
    destination = AirportSerializer(read_only=True)
    airplane = AirplaneSerializer(read_only=True)
    duration = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = Flight
        fields = (
            'id', 'origin', 'destination', 'airplane', 'departure_time',
            'arrival_time', 'price', 'status', 'duration', 'available_seats'
        )

    def get_duration(self, obj):
        """Рассчитываем продолжительность полета"""
        if obj.departure_time and obj.arrival_time:
            duration = obj.arrival_time - obj.departure_time
            hours = duration.seconds // 3600
            minutes = (duration.seconds % 3600) // 60
            return f"{hours}ч {minutes}м"
        return "Неизвестно"

    def get_available_seats(self, obj):
        """Подсчитываем доступные места"""
        from core.models import BookedSeat
        total_seats = obj.airplane.total_rows * obj.airplane.seats_per_row
        booked_seats = BookedSeat.objects.filter(
            flight=obj,
            booking__status__in=['reserved', 'paid']
        ).count()
        return total_seats - booked_seats


class FlightDetailSerializer(FlightListSerializer):
    seats = serializers.SerializerMethodField()

    class Meta(FlightListSerializer.Meta):
        fields = FlightListSerializer.Meta.fields + ('seats',)

    def get_seats(self, obj):
        """Возвращаем схему мест самолета"""
        seats = Seat.objects.filter(airplane=obj.airplane).order_by('row', 'number')
        return SeatSerializer(
            seats,
            many=True,
            context={'flight_id': obj.id}
        ).data


class FlightSearchSerializer(serializers.Serializer):
    origin_city = serializers.CharField(max_length=100, required=True)
    destination_city = serializers.CharField(max_length=100, required=True)
    departure_date = serializers.DateField(required=True)
    return_date = serializers.DateField(required=False)
    passengers = serializers.IntegerField(min_value=1, max_value=9, default=1)
    seat_class = serializers.ChoiceField(
        choices=['economy', 'business', 'first'],
        required=False,
        default='economy'
    )

    def validate_departure_date(self, value):
        if value < datetime.now().date():
            raise serializers.ValidationError("Дата вылета не может быть в прошлом")
        return value

    def validate(self, attrs):
        if attrs.get('return_date'):
            if attrs['return_date'] <= attrs['departure_date']:
                raise serializers.ValidationError({
                    'return_date': 'Дата возврата должна быть позже даты вылета'
                })
        return attrs