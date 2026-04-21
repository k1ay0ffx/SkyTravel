from rest_framework import serializers
from core.models import Flight, Airplane, Airport, Booking, User
from datetime import datetime


class AdminFlightSerializer(serializers.ModelSerializer):
    origin_name = serializers.CharField(source='origin.name', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)
    airplane_model = serializers.CharField(source='airplane.model', read_only=True)
    bookings_count = serializers.SerializerMethodField()
    revenue = serializers.SerializerMethodField()

    class Meta:
        model = Flight
        fields = '__all__'

    def get_bookings_count(self, obj):
        return obj.bookings.filter(status__in=['reserved', 'paid']).count()

    def get_revenue(self, obj):
        return sum([b.total_price for b in obj.bookings.filter(status='paid')])


class AdminFlightCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flight
        fields = ('origin', 'destination', 'airplane', 'departure_time', 'arrival_time', 'price', 'status')

    def validate(self, attrs):
        if attrs['departure_time'] >= attrs['arrival_time']:
            raise serializers.ValidationError("Время прилета должно быть позже времени вылета")

        if attrs['departure_time'] < datetime.now():
            raise serializers.ValidationError("Время вылета не может быть в прошлом")

        return attrs


class AdminAirplaneSerializer(serializers.ModelSerializer):
    flights_count = serializers.SerializerMethodField()

    class Meta:
        model = Airplane
        fields = '__all__'

    def get_flights_count(self, obj):
        return obj.flights.count()


class AdminBookingSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    flight_info = serializers.SerializerMethodField()
    passengers_count = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'

    def get_user_full_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

    def get_flight_info(self, obj):
        return f"{obj.flight.origin.city} → {obj.flight.destination.city}"

    def get_passengers_count(self, obj):
        return obj.booked_seats.count()


class AdminUserSerializer(serializers.ModelSerializer):
    bookings_count = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    last_booking = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone', 'date_joined',
                  'is_active', 'bookings_count', 'total_spent', 'last_booking')
        read_only_fields = ('date_joined',)

    def get_bookings_count(self, obj):
        return obj.bookings.count()

    def get_total_spent(self, obj):
        return sum([b.total_price for b in obj.bookings.filter(status='paid')])

    def get_last_booking(self, obj):
        last = obj.bookings.order_by('-created_at').first()
        return last.created_at if last else None


class AdminStatsSerializer(serializers.Serializer):
    total_flights = serializers.IntegerField()
    active_flights = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    paid_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_users = serializers.IntegerField()
    active_users = serializers.IntegerField()
    popular_destinations = serializers.ListField()
    monthly_revenue = serializers.ListField()