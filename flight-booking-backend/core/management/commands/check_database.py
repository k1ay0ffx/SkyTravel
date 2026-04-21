from django.core.management.base import BaseCommand
from core.models import Flight, Airport, Airplane
from django.db.models import Count


class Command(BaseCommand):
    help = 'Проверка содержимого базы данных для диагностики'

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ")
        self.stdout.write("=" * 70)

        # Общая статистика
        total_airports = Airport.objects.count()
        total_flights = Flight.objects.count()
        scheduled_flights = Flight.objects.filter(status='scheduled').count()
        total_airplanes = Airplane.objects.count()

        self.stdout.write(f"📊 ОБЩАЯ СТАТИСТИКА:")
        self.stdout.write(f"   Аэропорты: {total_airports}")
        self.stdout.write(f"   Рейсы всего: {total_flights}")
        self.stdout.write(f"   Запланированные рейсы: {scheduled_flights}")
        self.stdout.write(f"   Самолеты: {total_airplanes}")
        self.stdout.write("-" * 70)

        # Список всех аэропортов
        self.stdout.write("🏬 АЭРОПОРТЫ В БАЗЕ ДАННЫХ:")
        airports = Airport.objects.all().order_by('city')

        if airports.exists():
            for airport in airports[:20]:  # Показываем первые 20
                self.stdout.write(f"   📍 {airport.city} ({airport.country}) - {airport.name} [{airport.iata_code}]")

            if airports.count() > 20:
                self.stdout.write(f"   ... и еще {airports.count() - 20} аэропортов")
        else:
            self.stdout.write("   ❌ Аэропорты отсутствуют в БД!")

        self.stdout.write("-" * 70)

        # Поиск аэропортов с "Алматы" и похожими названиями
        self.stdout.write("🔍 ПОИСК АЭРОПОРТОВ ПО КЛЮЧЕВЫМ СЛОВАМ:")

        search_terms = ['алматы', 'almaty', 'астана', 'astana', 'nursultan', 'ала', 'москва', 'moscow']

        for term in search_terms:
            found_airports = Airport.objects.filter(
                city__icontains=term
            ) | Airport.objects.filter(
                name__icontains=term
            )

            if found_airports.exists():
                self.stdout.write(f"   🎯 '{term}': найдено {found_airports.count()}")
                for airport in found_airports:
                    self.stdout.write(f"      - {airport.city} ({airport.name}) [{airport.iata_code}]")
            else:
                self.stdout.write(f"   ❌ '{term}': не найдено")

        self.stdout.write("-" * 70)

        # Рейсы по датам
        self.stdout.write("📅 РЕЙСЫ ПО ДАТАМ:")

        # Ищем рейсы в разных диапазонах
        from datetime import datetime, timedelta
        today = datetime.now().date()

        date_ranges = [
            ("Сегодня", today, today),
            ("Завтра", today + timedelta(days=1), today + timedelta(days=1)),
            ("Эта неделя", today, today + timedelta(days=7)),
            ("Этот месяц", today, today + timedelta(days=30)),
            ("2024 год", datetime(2024, 1, 1).date(), datetime(2024, 12, 31).date()),
            ("2025 год", datetime(2025, 1, 1).date(), datetime(2025, 12, 31).date()),
        ]

        for label, start_date, end_date in date_ranges:
            count = Flight.objects.filter(
                departure_time__date__range=[start_date, end_date],
                status='scheduled'
            ).count()
            self.stdout.write(f"   📊 {label}: {count} рейсов")

        self.stdout.write("-" * 70)

        # Примеры рейсов
        self.stdout.write("✈️  ПРИМЕРЫ РЕЙСОВ:")
        sample_flights = Flight.objects.filter(status='scheduled').select_related('origin', 'destination')[:10]

        if sample_flights.exists():
            for i, flight in enumerate(sample_flights, 1):
                departure_date = flight.departure_time.strftime('%Y-%m-%d %H:%M')
                self.stdout.write(f"   {i}. {flight.origin.city} → {flight.destination.city}")
                self.stdout.write(f"      {flight.origin.iata_code} → {flight.destination.iata_code}")
                self.stdout.write(f"      {departure_date}, {flight.price} тенге")
        else:
            self.stdout.write("   ❌ Рейсы отсутствуют!")

        self.stdout.write("-" * 70)

        # Популярные направления
        self.stdout.write("🔥 ПОПУЛЯРНЫЕ НАПРАВЛЕНИЯ (топ-10):")

        popular_routes = Flight.objects.filter(status='scheduled').values(
            'origin__city', 'destination__city'
        ).annotate(
            flight_count=Count('id')
        ).order_by('-flight_count')[:10]

        if popular_routes:
            for i, route in enumerate(popular_routes, 1):
                self.stdout.write(
                    f"   {i}. {route['origin__city']} → {route['destination__city']} ({route['flight_count']} рейсов)")
        else:
            self.stdout.write("   ❌ Популярные маршруты не найдены!")

        self.stdout.write("=" * 70)
        self.stdout.write("✅ ДИАГНОСТИКА ЗАВЕРШЕНА")
        self.stdout.write("=" * 70)

        # Рекомендации
        if total_airports == 0:
            self.stdout.write("⚠️  РЕКОМЕНДАЦИЯ: В базе нет аэропортов! Запустите команду импорта данных.")
        elif scheduled_flights == 0:
            self.stdout.write("⚠️  РЕКОМЕНДАЦИЯ: В базе нет запланированных рейсов!")
        else:
            self.stdout.write("💡 РЕКОМЕНДАЦИЯ: Используйте точные названия городов из списка выше.")