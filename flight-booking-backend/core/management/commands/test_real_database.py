from django.core.management.base import BaseCommand
from api.services.route_finder import FlightRouteOptimizer, get_direct_flights_from_db
from core.models import Flight, Airport


class Command(BaseCommand):
    help = 'Тестирование алгоритма на РЕАЛЬНЫХ данных из БД'

    def add_arguments(self, parser):
        parser.add_argument('--origin', type=str, required=True)
        parser.add_argument('--destination', type=str, required=True)
        parser.add_argument('--date', type=str, required=True)
        parser.add_argument('--max-stops', type=int, default=2)
        parser.add_argument('--direct-only', action='store_true')
        parser.add_argument('--show-db-stats', action='store_true')
        parser.add_argument('--suggest-cities', action='store_true')

    def handle(self, *args, **options):
        origin = options['origin']
        destination = options['destination']
        date = options['date']
        max_stops = options['max_stops']
        direct_only = options['direct_only']
        show_stats = options['show_db_stats']
        suggest_cities = options['suggest_cities']

        self.stdout.write("=" * 70)
        self.stdout.write("🗄️  ТЕСТ АЛГОРИТМА С РЕАЛЬНЫМИ ДАННЫМИ БД")
        self.stdout.write("=" * 70)

        if show_stats:
            # Показываем статистику БД
            total_flights = Flight.objects.count()
            scheduled_flights = Flight.objects.filter(status='scheduled').count()
            total_airports = Airport.objects.count()

            self.stdout.write(f"📊 СТАТИСТИКА БАЗЫ ДАННЫХ:")
            self.stdout.write(f"   Всего рейсов: {total_flights}")
            self.stdout.write(f"   Запланированных: {scheduled_flights}")
            self.stdout.write(f"   Всего аэропортов: {total_airports}")
            self.stdout.write("-" * 70)

        if suggest_cities:
            # Показываем доступные города
            self.stdout.write("🏙️  ДОСТУПНЫЕ ГОРОДА В БД:")

            cities = Airport.objects.values_list('city', flat=True).distinct().order_by('city')

            if cities:
                for i, city in enumerate(list(cities)[:20], 1):
                    self.stdout.write(f"   {i}. {city}")
                if len(cities) > 20:
                    self.stdout.write(f"   ... и еще {len(cities) - 20} городов")
            else:
                self.stdout.write("   ❌ Города не найдены в БД!")

            self.stdout.write("-" * 70)

        self.stdout.write(f"🔍 ПОИСК: {origin} → {destination} на {date}")

        # Проверяем наличие аэропортов ПЕРЕД поиском
        self.stdout.write(f"🔎 ПРОВЕРКА АЭРОПОРТОВ:")

        origin_airports = Airport.objects.filter(
            city__icontains=origin.strip()
        ) | Airport.objects.filter(
            name__icontains=origin.strip()
        )

        destination_airports = Airport.objects.filter(
            city__icontains=destination.strip()
        ) | Airport.objects.filter(
            name__icontains=destination.strip()
        )

        self.stdout.write(f"   🛫 '{origin}': найдено {origin_airports.count()} аэропортов")
        for airport in origin_airports:
            self.stdout.write(f"      - {airport.city} ({airport.name}) [{airport.iata_code}]")

        self.stdout.write(f"   🛬 '{destination}': найдено {destination_airports.count()} аэропортов")
        for airport in destination_airports:
            self.stdout.write(f"      - {airport.city} ({airport.name}) [{airport.iata_code}]")

        if not origin_airports.exists() or not destination_airports.exists():
            self.stdout.write("❌ ОШИБКА: Один или оба города не найдены в БД!")
            self.stdout.write("💡 Используйте --suggest-cities для просмотра доступных городов")
            return

        self.stdout.write(f"📋 Макс. пересадки: {max_stops}")
        self.stdout.write("-" * 70)

        if direct_only:
            # Тест прямых рейсов из БД
            self.stdout.write("🛫 ПОИСК ПРЯМЫХ РЕЙСОВ В БД...")
            results = get_direct_flights_from_db(origin, destination, date)

            if results.get('success'):
                flights = results.get('flights', [])
                self.stdout.write(f"✅ Найдено в БД: {len(flights)} прямых рейсов")

                for i, flight in enumerate(flights[:5], 1):
                    self.stdout.write(f"\n{i}. РЕЙС ИЗ БД (ID: {flight['database_flight_id']})")
                    self.stdout.write(f"   💰 {flight['price_tenge']} тенге")
                    self.stdout.write(f"   ⏱️  {flight['duration_hours']}ч")
                    self.stdout.write(f"   🛫 {flight['departure_datetime']}")
                    self.stdout.write(f"   🛬 {flight['arrival_datetime']}")
                    self.stdout.write(f"   ✈️  {flight['airplane_model']}")
                    self.stdout.write(f"   📍 {flight['origin_airport']} → {flight['destination_airport']}")
            else:
                self.stdout.write(f"❌ {results.get('error')}")

        else:
            # Тест полного алгоритма с БД
            self.stdout.write("🧭 ПОИСК ОПТИМАЛЬНЫХ МАРШРУТОВ В БД...")
            optimizer = FlightRouteOptimizer()
            results = optimizer.find_optimal_routes(
                origin_city=origin,
                destination_city=destination,
                departure_date=date,
                max_stops=max_stops,
                prefer_price=True
            )

            if results.get('success'):
                self.stdout.write(f"✅ Найдено маршрутов: {results['routes_found']}")
                self.stdout.write(f"📊 Рейсов в БД на дату: {results['total_flights_in_db']}")
                self.stdout.write(f"🛫 Прямые: {results['direct_flights']}")
                self.stdout.write(f"🔄 С пересадками: {results['with_connections']}")

                routes = results.get('routes', [])
                for i, route in enumerate(routes[:5], 1):
                    self.stdout.write(f"\n{i}. {route['route_type']}")
                    self.stdout.write(f"   💰 {route['total_price']} тенге")
                    self.stdout.write(f"   ⏱️  {route['total_duration_hours']}ч")
                    self.stdout.write(f"   🛫 {route['departure_datetime']}")
                    self.stdout.write(f"   🛬 {route['arrival_datetime']}")

                    for j, flight in enumerate(route['flights_from_db'], 1):
                        self.stdout.write(f"     {j}. РЕЙС БД #{flight['database_flight_id']}")
                        self.stdout.write(f"        {flight['origin_city']} → {flight['destination_city']}")
                        self.stdout.write(f"        {flight['departure_time']} → {flight['arrival_time']}")
                        if 'layover_time_hours' in flight:
                            self.stdout.write(f"        ⏳ Ожидание: {flight['layover_time_hours']}ч")
            else:
                self.stdout.write(f"❌ {results.get('error')}")

        self.stdout.write("=" * 70)
        self.stdout.write("✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")