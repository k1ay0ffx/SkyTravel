from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    passport_number = models.CharField(max_length=50, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email

class Airport(models.Model):
    name = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    iata_code = models.CharField(max_length=3, unique=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.iata_code})"

class Airline(models.Model):
    iata_code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=200)
    country = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.iata_code})"

class Airplane(models.Model):
    model = models.CharField(max_length=100)
    total_rows = models.IntegerField()
    seats_per_row = models.IntegerField()
    business_rows = models.IntegerField()
    
    def __str__(self):
        return self.model

class Flight(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('delayed', 'Delayed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]
    
    airplane = models.ForeignKey(Airplane, on_delete=models.CASCADE)
    origin = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name='departures')
    destination = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name='arrivals')
    departure_time = models.DateTimeField(db_index=True)
    arrival_time = models.DateTimeField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', db_index=True)
    
    def __str__(self):
        return f"{self.origin.iata_code} to {self.destination.iata_code} ({self.departure_time})"

class FlightSchedule(models.Model):
    airline = models.ForeignKey(Airline, on_delete=models.CASCADE, related_name='flight_schedules')
    origin = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name='departure_schedules')
    destination = models.ForeignKey(Airport, on_delete=models.CASCADE, related_name='arrival_schedules')
    airplane = models.ForeignKey(Airplane, on_delete=models.CASCADE, related_name='flight_schedules')
    flight_number = models.CharField(max_length=20, unique=True)
    departure_time = models.TimeField()
    arrival_time = models.TimeField()
    duration_minutes = models.IntegerField()
    days_of_week = models.CharField(max_length=7, help_text="1234567 = Monday to Sunday")
    economy_price = models.DecimalField(max_digits=10, decimal_places=2)
    business_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.airline.iata_code}{self.flight_number}: {self.origin.iata_code} to {self.destination.iata_code}"

class FlightInstance(models.Model):
    schedule = models.ForeignKey(FlightSchedule, on_delete=models.CASCADE, related_name='flight_instances')
    date = models.DateField()
    departure_datetime = models.DateTimeField()
    arrival_datetime = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Flight.STATUS_CHOICES, default='scheduled')
    
    class Meta:
        unique_together = [('schedule', 'date')]
    
    def __str__(self):
        return f"{self.schedule.flight_number} on {self.date}"

class Seat(models.Model):
    CLASS_CHOICES = [
        ('economy', 'Economy'),
        ('business', 'Business'),
        ('first', 'First'),
    ]
    
    airplane = models.ForeignKey(Airplane, on_delete=models.CASCADE, related_name='seats')
    row = models.IntegerField()
    number = models.CharField(max_length=1)
    seat_class = models.CharField(max_length=10, choices=CLASS_CHOICES, default='economy')
    is_available = models.BooleanField(default=True)
    
    class Meta:
        unique_together = [('airplane', 'row', 'number')]
        
    def __str__(self):
        return f"{self.airplane.model} - {self.row}{self.number}"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('reserved', 'Reserved'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='bookings')
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reserved')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"Booking {self.id} for {self.user.email}"

class Passenger(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='passengers')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    passport_number = models.CharField(max_length=50)
    date_of_birth = models.DateField()
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class BookedSeat(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booked_seats')
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE)
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['seat', 'flight'], name='unique_seat_per_flight')
        ]
        
    def __str__(self):
        return f"Seat {self.seat.row}{self.seat.number} on Flight {self.flight.id}"

class Extra(models.Model):
    TYPE_CHOICES = [
        ('baggage', 'Baggage'),
        ('meal', 'Meal'),
        ('insurance', 'Insurance'),
    ]
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='extras')
    extra_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.CharField(max_length=200, blank=True)
    weight_kg = models.FloatField(null=True, blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    
    def __str__(self):
        return f"{self.extra_type} for Booking {self.booking.id}"

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"Payment {self.id} for Booking {self.booking.id}"

class Cancellation(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='cancellation')
    reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(auto_now_add=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    def __str__(self):
        return f"Cancellation for Booking {self.booking.id}"
