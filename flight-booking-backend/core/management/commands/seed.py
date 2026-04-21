import random
from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from core.models import Airport, Airplane, Flight, Seat, BookedSeat

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Create Superuser
        if not User.objects.filter(email='admin@aerobook.kz').exists():
            User.objects.create_superuser(
                email='admin@aerobook.kz',
                username='admin',
                password='admin1234'
            )
            self.stdout.write(self.style.SUCCESS('Superuser created'))

        # 2. Create Airports (Existing + New)
        airports_data = [
            {'iata_code': 'ALA', 'name': 'Almaty International Airport', 'city': 'Almaty', 'country': 'Kazakhstan'},
            {'iata_code': 'NQZ', 'name': 'Nursultan Nazarbayev International Airport', 'city': 'Astana', 'country': 'Kazakhstan'},
            {'iata_code': 'DXB', 'name': 'Dubai International Airport', 'city': 'Dubai', 'country': 'UAE'},
            {'iata_code': 'IST', 'name': 'Istanbul Airport', 'city': 'Istanbul', 'country': 'Turkey'},
            {'iata_code': 'FRA', 'name': 'Frankfurt Airport', 'city': 'Frankfurt', 'country': 'Germany'},
            {'iata_code': 'JFK', 'name': 'John F. Kennedy International Airport', 'city': 'New York', 'country': 'USA'},
            {'iata_code': 'LHR', 'name': 'Heathrow Airport', 'city': 'London', 'country': 'UK'},
            {'iata_code': 'CDG', 'name': 'Charles de Gaulle Airport', 'city': 'Paris', 'country': 'France'},
            {'iata_code': 'SVO', 'name': 'Sheremetyevo Airport', 'city': 'Moscow', 'country': 'Russia'},
            {'iata_code': 'PEK', 'name': 'Beijing Capital Airport', 'city': 'Beijing', 'country': 'China'},
        ]

        for data in airports_data:
            airport, created = Airport.objects.get_or_create(iata_code=data['iata_code'], defaults=data)
            if created:
                self.stdout.write(f"Airport {airport.iata_code} created")

        all_airports = list(Airport.objects.all())

        # 3. Create Airplanes and Seats (Keep existing logic)
        airplanes_data = [
            {'model': 'Boeing 737', 'total_rows': 30, 'seats_per_row': 6, 'business_rows': 3},
            {'model': 'Airbus A320', 'total_rows': 28, 'seats_per_row': 6, 'business_rows': 4},
            {'model': 'Boeing 787', 'total_rows': 35, 'seats_per_row': 6, 'business_rows': 5},
        ]

        seat_letters = ['A', 'B', 'C', 'D', 'E', 'F']
        
        for data in airplanes_data:
            airplane, created = Airplane.objects.get_or_create(model=data['model'], defaults=data)
            if created:
                self.stdout.write(f"Airplane {airplane.model} created. Generating seats...")
                seats = []
                for row in range(1, data['total_rows'] + 1):
                    seat_class = 'business' if row <= data['business_rows'] else 'economy'
                    for letter in seat_letters[:data['seats_per_row']]:
                        seats.append(Seat(
                            airplane=airplane,
                            row=row,
                            number=letter,
                            seat_class=seat_class
                        ))
                Seat.objects.bulk_create(seats)
                self.stdout.write(f"Generated {len(seats)} seats for {airplane.model}")

        all_airplanes = list(Airplane.objects.all())

        # 4. Create Flights (New logic)
        self.stdout.write('Deleting existing flights and booked seats...')
        BookedSeat.objects.all().delete()
        Flight.objects.all().delete()

        domestic_codes = ['ALA', 'NQZ']
        regional_codes = ['DXB', 'IST', 'SVO']
        long_haul_codes = ['FRA', 'LHR', 'CDG', 'JFK', 'PEK']

        routes = []
        for origin in all_airports:
            for destination in all_airports:
                if origin.iata_code != destination.iata_code:
                    routes.append((origin, destination))

        self.stdout.write(f'Generating 10,000 flights for {len(routes)} routes...')
        
        flights_to_create = []
        now = timezone.now()
        total_to_generate = 10000

        for i in range(total_to_generate):
            origin, destination = random.choice(routes)
            
            # Categorize route
            if origin.iata_code in long_haul_codes or destination.iata_code in long_haul_codes:
                # Long-haul
                price = Decimal(random.randint(200000, 600000))
                duration_mins = random.randint(8 * 60, 14 * 60)
            elif origin.iata_code in regional_codes or destination.iata_code in regional_codes:
                # Regional
                price = Decimal(random.randint(80000, 200000))
                duration_mins = random.randint(4 * 60, 7 * 60)
            else:
                # Domestic
                price = Decimal(random.randint(20000, 70000))
                duration_mins = random.randint(1 * 60 + 30, 2 * 60)

            # Add randomness to duration (±30 minutes)
            duration_mins += random.randint(-30, 30)
            
            days_ahead = random.randint(1, 180)
            departure_time = now + timedelta(days=days_ahead, hours=random.randint(0, 23), minutes=random.randint(0, 59))
            arrival_time = departure_time + timedelta(minutes=duration_mins)

            flights_to_create.append(Flight(
                airplane=random.choice(all_airplanes),
                origin=origin,
                destination=destination,
                departure_time=departure_time,
                arrival_time=arrival_time,
                price=price,
                status='scheduled'
            ))

            if len(flights_to_create) >= 500:
                Flight.objects.bulk_create(flights_to_create, batch_size=500)
                flights_to_create = []
                
            if (i + 1) % 1000 == 0:
                self.stdout.write(f"Created {i + 1} flights...")

        # Create remaining
        if flights_to_create:
            Flight.objects.bulk_create(flights_to_create, batch_size=500)

        self.stdout.write(self.style.SUCCESS('Database seeding completed!'))
