from datetime import datetime, timedelta
from collections import defaultdict
import heapq
from typing import List, Dict, Tuple, Optional
from django.db.models import Q
from core.models import Flight, Airport


class FlightRouteOptimizer:
    """
    Алгоритм поиска оптимальных авиамаршрутов
    РАБОТАЕТ ТОЛЬКО С СУЩЕСТВУЮЩИМИ ДАННЫМИ В БД
    """

    def __init__(self):
        self.MAX_LAYOVER_HOURS = 12
        self.MIN_CONNECTION_TIME = 1
        self.MAX_TOTAL_DURATION = 48

    def find_optimal_routes(self,
                            origin_city: str,
                            destination_city: str,
                            departure_date: str,
                            max_stops: int = 2,
                            prefer_price: bool = True) -> Dict:
        """
        Поиск оптимальных маршрутов из СУЩЕСТВУЮЩИХ рейсов в БД
        """
        try:
            search_date = datetime.strptime(departure_date, '%Y-%m-%d').date()

            # ЧИТАЕМ АЭРОПОРТЫ ИЗ БД
            origin_airports = self._get_airports_from_db(origin_city)
            destination_airports = self._get_airports_from_db(destination_city)

            if not origin_airports.exists():
                return {"error": f"Аэропорты в городе '{origin_city}' не найдены в базе данных"}
            if not destination_airports.exists():
                return {"error": f"Аэропорты в городе '{destination_city}' не найдены в базе данных"}

            # ЧИТАЕМ РЕЙСЫ ИЗ БД
            available_flights = self._get_flights_from_db(search_date)

            if not available_flights.exists():
                return {"error": f"В базе данных нет рейсов на дату {departure_date}"}

            # Преобразуем QuerySet в граф для алгоритма
            flight_graph = self._build_graph_from_db_flights(available_flights)

            # Поиск маршрутов между всеми комбинациями аэропортов
            all_routes = []
            for origin_airport in origin_airports:
                for dest_airport in destination_airports:
                    routes = self._dijkstra_search(
                        graph=flight_graph,
                        start=origin_airport.iata_code,
                        end=dest_airport.iata_code,
                        target_date=search_date,
                        max_stops=max_stops,
                        prefer_price=prefer_price
                    )
                    all_routes.extend(routes)

            # Ранжирование найденных маршрутов
            ranked_routes = self._rank_routes(all_routes, prefer_price)

            return {
                "success": True,
                "origin_city": origin_city,
                "destination_city": destination_city,
                "search_date": departure_date,
                "total_flights_in_db": available_flights.count(),
                "routes_found": len(ranked_routes),
                "direct_flights": len([r for r in ranked_routes if r['stops_count'] == 0]),
                "with_connections": len([r for r in ranked_routes if r['stops_count'] > 0]),
                "routes": ranked_routes[:10]  # Топ 10 маршрутов
            }

        except ValueError:
            return {"error": "Неверный формат даты. Используйте YYYY-MM-DD"}
        except Exception as e:
            return {"error": f"Ошибка поиска в базе данных: {str(e)}"}

    def _get_airports_from_db(self, city_name: str):
        """Поиск аэропортов в БД по городу с улучшенной гибкостью"""
        city_clean = city_name.strip()

        # Базовый поиск
        airports = Airport.objects.filter(
            Q(city__icontains=city_clean) |
            Q(name__icontains=city_clean)
        )

        # Если не найдено, пробуем различные варианты
        if not airports.exists():
            # Словарь сопоставлений для популярных городов
            city_mappings = {
                'алматы': ['almaty'],
                'almaty': ['almaty'],
                'астана': ['astana', 'nursultan'],
                'astana': ['astana', 'nursultan'],
                'нур-султан': ['astana', 'nursultan'],
                'nursultan': ['astana', 'nursultan'],
                'москва': ['moscow'],
                'moscow': ['moscow'],
                'стамбул': ['istanbul'],
                'istanbul': ['istanbul'],
                'лондон': ['london'],
                'london': ['london'],
                'нью-йорк': ['new york'],
                'new york': ['new york'],
                'париж': ['paris'],
                'paris': ['paris'],
                'пекин': ['beijing'],
                'beijing': ['beijing'],
                'дубай': ['dubai'],
                'dubai': ['dubai'],
                'франкфурт': ['frankfurt'],
                'frankfurt': ['frankfurt'],
            }

            search_terms = city_mappings.get(city_clean.lower(), [city_clean])

            for term in search_terms:
                airports = Airport.objects.filter(
                    Q(city__icontains=term) |
                    Q(name__icontains=term)
                )
                if airports.exists():
                    break

        return airports

    def _get_flights_from_db(self, target_date, days_buffer=7):  # Увеличил буфер до 7 дней
        """Получение рейсов из БД на указанную дату ±days_buffer"""
        start_date = target_date - timedelta(days=days_buffer)
        end_date = target_date + timedelta(days=days_buffer)

        flights = Flight.objects.filter(
            departure_time__date__range=[start_date, end_date],
            status='scheduled'
        ).select_related('origin', 'destination', 'airplane')

        # Если рейсов не найдено, расширяем поиск
        if not flights.exists():
            # Пробуем искать в более широком диапазоне (месяц)
            start_date_wide = target_date - timedelta(days=30)
            end_date_wide = target_date + timedelta(days=30)

            flights = Flight.objects.filter(
                departure_time__date__range=[start_date_wide, end_date_wide],
                status='scheduled'
            ).select_related('origin', 'destination', 'airplane')

        return flights

    def _build_graph_from_db_flights(self, flights_queryset):
        """Построение графа из QuerySet рейсов"""
        graph = defaultdict(list)

        for flight in flights_queryset:
            origin_iata = flight.origin.iata_code

            flight_data = {
                'db_flight_id': flight.id,
                'destination_iata': flight.destination.iata_code,
                'departure_time': flight.departure_time,
                'arrival_time': flight.arrival_time,
                'price_tenge': float(flight.price),
                'duration_hours': (flight.arrival_time - flight.departure_time).total_seconds() / 3600,

                # Информация об аэропортах из БД
                'origin_airport_name': flight.origin.name,
                'origin_city': flight.origin.city,
                'origin_country': flight.origin.country,
                'destination_airport_name': flight.destination.name,
                'destination_city': flight.destination.city,
                'destination_country': flight.destination.country,

                # Информация о самолете из БД
                'airplane_model': flight.airplane.model,
                'flight_status': flight.status
            }

            graph[origin_iata].append(flight_data)

        return graph

    def _dijkstra_search(self, graph, start, end, target_date, max_stops, prefer_price):
        """Алгоритм Дейкстры для поиска оптимальных путей"""
        priority_queue = [(0, 0, start, [], 0)]  # (вес, время, аэропорт, путь, остановки)
        visited = set()
        found_routes = []

        while priority_queue:
            current_weight, current_time, current_airport, path, stops = heapq.heappop(priority_queue)

            # Достигли цели
            if current_airport == end and path:
                route = self._create_route_from_path(path)
                found_routes.append(route)
                continue

            # Превышен лимит пересадок
            if stops > max_stops:
                continue

            # Превышено максимальное время
            if current_time > self.MAX_TOTAL_DURATION:
                continue

            # Избегаем повторов
            state = (current_airport, stops)
            if state in visited:
                continue
            visited.add(state)

            # Ищем рейсы из текущего аэропорта
            if current_airport in graph:
                for flight_data in graph[current_airport]:
                    if self._can_take_flight(path, flight_data, target_date):
                        new_path = path + [flight_data]
                        new_weight = current_weight + flight_data['price_tenge']
                        new_time = current_time + flight_data['duration_hours']

                        # Вычисляем приоритет
                        priority = self._calculate_priority(new_weight, new_time, stops + 1, prefer_price)

                        heapq.heappush(priority_queue, (
                            priority, new_time, flight_data['destination_iata'], new_path, stops + 1
                        ))

        return found_routes

    def _can_take_flight(self, current_path, flight_data, target_date):
        """Проверка возможности взять рейс"""
        if not current_path:
            # Первый рейс - проверяем дату
            flight_date = flight_data['departure_time'].date()
            return abs((flight_date - target_date).days) <= 1

        last_flight = current_path[-1]

        # Проверка на цикл
        visited_airports = [f['destination_iata'] for f in current_path]
        if flight_data['destination_iata'] in visited_airports:
            return False

        # Проверка времени стыковки
        layover_hours = (
                                flight_data['departure_time'] - last_flight['arrival_time']
                        ).total_seconds() / 3600

        return self.MIN_CONNECTION_TIME <= layover_hours <= self.MAX_LAYOVER_HOURS

    def _calculate_priority(self, price, time_hours, stops, prefer_price):
        """Вычисление приоритета для очереди"""
        if prefer_price:
            return price + (time_hours * 0.1) + (stops * 2000)
        else:
            return time_hours + (price * 0.001) + (stops * 50)

    def _create_route_from_path(self, flight_path):
        """Создание маршрута из пути рейсов"""
        if not flight_path:
            return {}

        first_flight = flight_path[0]
        last_flight = flight_path[-1]

        total_price = sum(f['price_tenge'] for f in flight_path)
        total_time = sum(f['duration_hours'] for f in flight_path)

        # Добавляем время ожидания между рейсами
        for i in range(1, len(flight_path)):
            layover = (flight_path[i]['departure_time'] - flight_path[i - 1]['arrival_time']).total_seconds() / 3600
            total_time += layover

        route_info = {
            'route_type': self._describe_route_type(len(flight_path)),
            'total_price': round(total_price, 2),
            'total_duration_hours': round(total_time, 1),
            'departure_datetime': first_flight['departure_time'].strftime('%Y-%m-%d %H:%M'),
            'arrival_datetime': last_flight['arrival_time'].strftime('%Y-%m-%d %H:%M'),
            'origin_city': first_flight['origin_city'],
            'destination_city': last_flight['destination_city'],
            'stops_count': len(flight_path) - 1,
            'flights_from_db': []
        }

        # Детали каждого рейса из БД
        for i, flight in enumerate(flight_path):
            flight_info = {
                'segment_number': i + 1,
                'database_flight_id': flight['db_flight_id'],
                'origin_airport': flight['origin_airport_name'],
                'origin_city': flight['origin_city'],
                'origin_country': flight['origin_country'],
                'destination_airport': flight['destination_airport_name'],
                'destination_city': flight['destination_city'],
                'destination_country': flight['destination_country'],
                'departure_time': flight['departure_time'].strftime('%Y-%m-%d %H:%M'),
                'arrival_time': flight['arrival_time'].strftime('%Y-%m-%d %H:%M'),
                'duration_hours': round(flight['duration_hours'], 1),
                'price_tenge': flight['price_tenge'],
                'airplane_model': flight['airplane_model'],
                'status': flight['flight_status']
            }

            # Время ожидания для пересадок
            if i > 0:
                prev_flight = flight_path[i - 1]
                layover_hours = (flight['departure_time'] - prev_flight['arrival_time']).total_seconds() / 3600
                flight_info['layover_time_hours'] = round(layover_hours, 1)
                flight_info['layover_airport'] = flight['origin_airport_name']

            route_info['flights_from_db'].append(flight_info)

        return route_info

    def _describe_route_type(self, segments_count):
        """Описание типа маршрута"""
        if segments_count == 1:
            return "Прямой рейс"
        elif segments_count == 2:
            return "1 пересадка"
        elif segments_count == 3:
            return "2 пересадки"
        else:
            return f"{segments_count - 1} пересадки"

    def _rank_routes(self, routes, prefer_price, limit=10):
        """Ранжирование маршрутов"""
        if not routes:
            return []

        def route_score(route):
            stops = route.get('stops_count', 0)
            price = route.get('total_price', 999999)
            time = route.get('total_duration_hours', 999)

            if prefer_price:
                return (stops, price, time)
            else:
                return (stops, time, price)

        return sorted(routes, key=route_score)[:limit]


def get_direct_flights_from_db(origin_city: str, destination_city: str, departure_date: str):
    """
    Быстрый поиск ТОЛЬКО прямых рейсов из БД
    """
    try:
        search_date = datetime.strptime(departure_date, '%Y-%m-%d').date()

        # Используем улучшенный поиск аэропортов
        optimizer = FlightRouteOptimizer()  # Временный объект для доступа к методу
        origin_airports = optimizer._get_airports_from_db(origin_city)
        destination_airports = optimizer._get_airports_from_db(destination_city)

        if not origin_airports.exists() or not destination_airports.exists():
            return {
                "success": False,
                "error": f"Аэропорты не найдены в базе данных: origin='{origin_city}', destination='{destination_city}'"
            }

        # Расширенный поиск рейсов с буфером ±7 дней
        start_date = search_date - timedelta(days=7)
        end_date = search_date + timedelta(days=7)

        direct_flights = Flight.objects.filter(
            origin__in=origin_airports,
            destination__in=destination_airports,
            departure_time__date__range=[start_date, end_date],
            status='scheduled'
        ).select_related('origin', 'destination', 'airplane').order_by('price')

        # Если не найдено, расширяем до месяца
        if not direct_flights.exists():
            start_date_wide = search_date - timedelta(days=30)
            end_date_wide = search_date + timedelta(days=30)

            direct_flights = Flight.objects.filter(
                origin__in=origin_airports,
                destination__in=destination_airports,
                departure_time__date__range=[start_date_wide, end_date_wide],
                status='scheduled'
            ).select_related('origin', 'destination', 'airplane').order_by('price')

        if not direct_flights.exists():
            return {
                "success": True,
                "origin_city": origin_city,
                "destination_city": destination_city,
                "search_date": departure_date,
                "direct_flights_found": 0,
                "message": "Прямые рейсы на эту дату не найдены в базе данных",
                "airports_found": {
                    "origin": [{'city': a.city, 'name': a.name, 'iata': a.iata_code} for a in origin_airports],
                    "destination": [{'city': a.city, 'name': a.name, 'iata': a.iata_code} for a in destination_airports]
                },
                "flights": []
            }

        # Формирование результатов из БД
        flights_data = []
        for flight in direct_flights:
            duration = (flight.arrival_time - flight.departure_time).total_seconds() / 3600

            flight_info = {
                'database_flight_id': flight.id,
                'route_type': 'Прямой рейс',
                'price_tenge': float(flight.price),
                'duration_hours': round(duration, 1),
                'departure_datetime': flight.departure_time.strftime('%Y-%m-%d %H:%M'),
                'arrival_datetime': flight.arrival_time.strftime('%Y-%m-%d %H:%M'),
                'origin_airport': flight.origin.name,
                'origin_city': flight.origin.city,
                'origin_country': flight.origin.country,
                'destination_airport': flight.destination.name,
                'destination_city': flight.destination.city,
                'destination_country': flight.destination.country,
                'airplane_model': flight.airplane.model,
                'flight_status': flight.status,
                'stops_count': 0
            }
            flights_data.append(flight_info)

        return {
            "success": True,
            "origin_city": origin_city,
            "destination_city": destination_city,
            "search_date": departure_date,
            "direct_flights_found": len(flights_data),
            "airports_found": {
                "origin": [{'city': a.city, 'name': a.name, 'iata': a.iata_code} for a in origin_airports],
                "destination": [{'city': a.city, 'name': a.name, 'iata': a.iata_code} for a in destination_airports]
            },
            "flights": flights_data
        }

    except ValueError:
        return {"success": False, "error": "Неверный формат даты. Используйте YYYY-MM-DD"}
    except Exception as e:
        return {"success": False, "error": f"Ошибка запроса к базе данных: {str(e)}"}