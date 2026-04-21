import csv, random
from datetime import datetime, timedelta, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Airline, Airport, Airplane, FlightSchedule, FlightInstance

class Command(BaseCommand):
    help = 'Imports OpenFlights data and generates flight schedules/instances (optimized for 10k)'

    def handle(self, *args, **kwargs):
        stats = {
            'airlines': 0,
            'airports': 0,
            'schedules': 0,
            'instances': 0,
        }
        MAX_SCHEDULES = 10000
        MAX_AIRPORTS = 1500
        PRIORITY_AIRPORTS = {
            'ALA', 'NQZ', 'DXB', 'IST', 'FRA', 'JFK',
            'LHR', 'CDG', 'SVO', 'PEK', 'DOH', 'BOM',
            'SIN', 'AMS', 'MAD', 'ATH'
        }

        try:
            self.stdout.write('Clearing existing OpenFlights data...')
            FlightInstance.objects.all().delete()
            FlightSchedule.objects.all().delete()
            Airport.objects.all().delete()
            Airline.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared!'))

            # 1. Import Airlines
            self.stdout.write('Importing airlines...')
            with open('./data/airlines.dat', newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    try:
                        if len(row) < 8:
                            continue
                        active = row[7]
                        iata = row[3]
                        if active == 'Y' and iata not in ('\\N', '', ' '):
                            airline, created = Airline.objects.get_or_create(
                                iata_code=iata,
                                defaults={
                                    'name': row[1],
                                    'country': row[6] if row[6] != '\\N' else '',
                                }
                            )
                            if created:
                                stats['airlines'] += 1
                    except:
                        continue
            self.stdout.write(self.style.SUCCESS(f'Imported {stats["airlines"]} airlines'))

            # 2. Import Airports (prioritize connection hubs first)
            self.stdout.write(f'Importing airports (priority hubs first)...')
            priority_airports_list = []
            other_airports_list = []
            
            with open('./data/airports.dat', newline='', encoding='utf-8') as f:
                reader = csv.reader(f)
                for row in reader:
                    try:
                        if len(row) < 14:
                            continue
                        iata = row[4]
                        if iata not in ('\\N', '', ' ', '\\\\N') and row[12] == 'airport':
                            airport_dict = {
                                'iata_code': iata,
                                'name': row[1],
                                'city': row[2],
                                'country': row[3],
                                'latitude': float(row[6]) if row[6] else None,
                                'longitude': float(row[7]) if row[7] else None,
                            }
                            if iata in PRIORITY_AIRPORTS:
                                priority_airports_list.append(airport_dict)
                            else:
                                other_airports_list.append(airport_dict)
                    except:
                        continue
            
            # Add priority airports first
            for airport_dict in priority_airports_list:
                airport, created = Airport.objects.get_or_create(**airport_dict)
                if created:
                    stats['airports'] += 1
                    self.stdout.write(f'  Priority: {airport.iata_code} - {airport.name}')

            # Fill up remaining airports
            for airport_dict in other_airports_list:
                if stats['airports'] >= MAX_AIRPORTS:
                    break
                airport, created = Airport.objects.get_or_create(**airport_dict)
                if created:
                    stats['airports'] += 1

            self.stdout.write(self.style.SUCCESS(f'Imported {stats["airports"]} airports'))

            # 3. Import Routes as FlightSchedules (exactly 10k)
            self.stdout.write(f'Importing flight schedules (exactly {MAX_SCHEDULES})...')
            schedules_list = []
            flight_numbers_used = set()
            airports_cache = {a.iata_code: a for a in Airport.objects.all()}
            airlines_cache = {a.iata_code: a for a in Airline.objects.all()}
            airplanes = list(Airplane.objects.all())

            if not airplanes:
                self.stdout.write(self.style.WARNING('No airplanes found, skipping schedule creation.'))
            else:
                with open('./data/routes.dat', newline='', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if stats['schedules'] + len(schedules_list) >= MAX_SCHEDULES:
                            break
                        try:
                            if len(row) < 9:
                                continue
                            if row[7] != '0':
                                continue
                            src_iata = row[2]
                            dest_iata = row[4]
                            airline_iata = row[0]

                            if (src_iata not in airports_cache or dest_iata not in airports_cache 
                                or airline_iata not in airlines_cache):
                                continue

                            origin = airports_cache[src_iata]
                            destination = airports_cache[dest_iata]
                            airline = airlines_cache[airline_iata]

                            # Generate flight number
                            while True:
                                flight_num = airline.iata_code + str(random.randint(100, 9999))
                                if flight_num not in flight_numbers_used:
                                    flight_numbers_used.add(flight_num)
                                    break

                            # Calculate duration
                            if origin.country == destination.country:
                                duration_minutes = random.randint(60, 180)
                                days_options = random.randint(5,7)
                                economy_price = random.randint(15000, 70000)
                            else:
                                lat_diff = 0
                                lon_diff = 0
                                if origin.latitude and origin.longitude and destination.latitude and destination.longitude:
                                    lat_diff = abs(origin.latitude - destination.latitude)
                                    lon_diff = abs(origin.longitude - destination.longitude)
                                if lat_diff > 60 or lon_diff > 60:
                                    duration_minutes = random.randint(420, 960)
                                    days_options = random.randint(2,4)
                                    economy_price = random.randint(250000, 900000)
                                else:
                                    duration_minutes = random.randint(180, 420)
                                    days_options = random.randint(3,5)
                                    economy_price = random.randint(80000, 300000)

                            # Generate departure time 06:00-22:00
                            dep_hour = random.randint(6,21)
                            dep_min = random.randint(0,59)
                            dep_time = time(hour=dep_hour, minute=dep_min)
                            arr_datetime = datetime.combine(datetime.now().date(), dep_time) + timedelta(minutes=duration_minutes)
                            arr_time = arr_datetime.time()

                            # Days of week
                            all_days = list('1234567')
                            random.shuffle(all_days)
                            days = ''.join(sorted(all_days[:days_options]))

                            # Prices
                            business_price = round(economy_price * random.uniform(2.5, 4.0), 2)

                            schedules_list.append(FlightSchedule(
                                airline=airline,
                                origin=origin,
                                destination=destination,
                                airplane=random.choice(airplanes),
                                flight_number=flight_num,
                                departure_time=dep_time,
                                arrival_time=arr_time,
                                duration_minutes=duration_minutes,
                                days_of_week=days,
                                economy_price=economy_price,
                                business_price=business_price,
                                is_active=True
                            ))

                            if len(schedules_list) >= 500:
                                FlightSchedule.objects.bulk_create(schedules_list, batch_size=500)
                                stats['schedules'] += len(schedules_list)
                                schedules_list = []
                                self.stdout.write(f'Processed {stats["schedules"]} routes...')
                        except:
                            continue

                if schedules_list and stats['schedules'] < MAX_SCHEDULES:
                    remaining = MAX_SCHEDULES - stats['schedules']
                    FlightSchedule.objects.bulk_create(schedules_list[:remaining], batch_size=500)
                    stats['schedules'] += len(schedules_list[:remaining])

            self.stdout.write(self.style.SUCCESS(f'Imported {stats["schedules"]} flight schedules'))

            #4. Generate FlightInstances for next 365 days (1 year)
            self.stdout.write('Generating flight instances for next 365 days...')
            instances_list = []
            all_schedules = list(FlightSchedule.objects.all())
            today = timezone.now().date()
            DAYS_FORWARD = 365

            for schedule in all_schedules:
                for day_offset in range(DAYS_FORWARD):
                    check_date = today + timedelta(days=day_offset)
                    weekday = check_date.weekday() + 1  # Monday is 1
                    if str(weekday) in schedule.days_of_week:
                        dep_dt = datetime.combine(check_date, schedule.departure_time)
                        dep_dt = timezone.make_aware(dep_dt)
                        arr_dt = dep_dt + timedelta(minutes=schedule.duration_minutes)
                        instances_list.append(FlightInstance(
                            schedule=schedule,
                            date=check_date,
                            departure_datetime=dep_dt,
                            arrival_datetime=arr_dt,
                            status='scheduled'
                        ))
                        if len(instances_list) >= 2000:
                            FlightInstance.objects.bulk_create(instances_list, batch_size=2000)
                            stats['instances'] += len(instances_list)
                            instances_list = []

            if instances_list:
                FlightInstance.objects.bulk_create(instances_list, batch_size=2000)
                stats['instances'] += len(instances_list)

            self.stdout.write(self.style.SUCCESS(f'Generated {stats["instances"]} flight instances'))

            # Print summary
            self.stdout.write(self.style.SUCCESS('\nSummary:'))
            self.stdout.write(f'Airlines imported: {stats["airlines"]}')
            self.stdout.write(f'Airports imported: {stats["airports"]}')
            self.stdout.write(f'Flight schedules imported: {stats["schedules"]}')
            self.stdout.write(f'Flight instances generated: {stats["instances"]}')

            # Check for connection hubs
            self.stdout.write('\nChecking critical connection airports...')
            critical_airports = ['ALA', 'JFK', 'DXB', 'IST', 'FRA', 'DOH']
            for code in critical_airports:
                if Airport.objects.filter(iata_code=code).exists():
                    self.stdout.write(self.style.SUCCESS(f'  ✓ {code} found'))
                else:
                    self.stdout.write(self.style.ERROR(f'  ✗ {code} missing'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))
            import traceback
            self.stdout.write(traceback.format_exc())
