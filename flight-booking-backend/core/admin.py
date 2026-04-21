from django.contrib import admin
from .models import User, Airport, Airplane, Flight, Seat, Booking, Passenger, BookedSeat, Extra, Payment, Cancellation, Airline, FlightSchedule, FlightInstance

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'username', 'is_staff')

@admin.register(Airport)
class AirportAdmin(admin.ModelAdmin):
    list_display = ('name', 'iata_code', 'city', 'country')
    search_fields = ('iata_code', 'city')

@admin.register(Airline)
class AirlineAdmin(admin.ModelAdmin):
    list_display = ('name', 'iata_code', 'country')
    search_fields = ('iata_code', 'name')

@admin.register(Airplane)
class AirplaneAdmin(admin.ModelAdmin):
    list_display = ('model', 'total_rows', 'seats_per_row')

@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = ('origin', 'destination', 'departure_time', 'status', 'price')
    list_filter = ('status',)
    search_fields = ('origin__iata_code', 'destination__iata_code')

@admin.register(FlightSchedule)
class FlightScheduleAdmin(admin.ModelAdmin):
    list_display = ('flight_number', 'airline', 'origin', 'destination', 'is_active')
    list_filter = ('is_active', 'airline')
    search_fields = ('flight_number', 'origin__iata_code', 'destination__iata_code')

@admin.register(FlightInstance)
class FlightInstanceAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'date', 'status')
    list_filter = ('status', 'date')

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ('airplane', 'row', 'number', 'seat_class', 'is_available')
    list_filter = ('seat_class',)

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('user', 'flight', 'status', 'total_price', 'created_at')
    list_filter = ('status',)

@admin.register(Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'passport_number', 'booking')

@admin.register(BookedSeat)
class BookedSeatAdmin(admin.ModelAdmin):
    list_display = ('booking', 'seat', 'flight')

@admin.register(Extra)
class ExtraAdmin(admin.ModelAdmin):
    list_display = ('booking', 'extra_type', 'price')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'amount', 'status', 'paid_at')

@admin.register(Cancellation)
class CancellationAdmin(admin.ModelAdmin):
    list_display = ('booking', 'refund_amount', 'cancelled_at')
