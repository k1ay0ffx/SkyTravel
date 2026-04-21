from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from api.services.route_finder import FlightRouteOptimizer, get_direct_flights_from_db
from core.models import Flight, Airport


@api_view(['POST'])
@permission_classes([AllowAny])
def search_optimal_routes(request):
    """
    Поиск оптимальных маршрутов из СУЩЕСТВУЮЩЕЙ базы данных

    POST /api/v1/routes/search/
    """
    try:
        origin = request.data.get('origin', '').strip()
        destination = request.data.get('destination', '').strip()
        date = request.data.get('date', '').strip()
        max_stops = request.data.get('max_stops', 2)
        prefer_price = request.data.get('prefer_price', True)

        if not all([origin, destination, date]):
            return Response({
                'success': False,
                'error': 'Обязательные поля: origin, destination, date'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            max_stops = int(max_stops)
            if not 0 <= max_stops <= 3:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'error': 'max_stops должно быть числом от 0 до 3'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Поиск в существующих данных БД
        optimizer = FlightRouteOptimizer()
        results = optimizer.find_optimal_routes(
            origin_city=origin,
            destination_city=destination,
            departure_date=date,
            max_stops=max_stops,
            prefer_price=bool(prefer_price)
        )

        if not results.get('success', True) or 'error' in results:
            return Response(results, status=status.HTTP_404_NOT_FOUND)

        return Response(results, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'error': f'Ошибка сервера: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def search_direct_routes(request):
    """
    Поиск прямых рейсов из БД

    POST /api/v1/routes/direct/
    """
    try:
        origin = request.data.get('origin', '').strip()
        destination = request.data.get('destination', '').strip()
        date = request.data.get('date', '').strip()

        if not all([origin, destination, date]):
            return Response({
                'success': False,
                'error': 'Обязательные поля: origin, destination, date'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Поиск в БД
        results = get_direct_flights_from_db(origin, destination, date)

        response_status = status.HTTP_200_OK if results.get('success') else status.HTTP_404_NOT_FOUND
        return Response(results, status=response_status)

    except Exception as e:
        return Response({
            'success': False,
            'error': f'Ошибка запроса к БД: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_database_stats(request):
    """
    Статистика данных в БД

    GET /api/v1/routes/stats/
    """
    try:
        total_flights = Flight.objects.filter(status='scheduled').count()
        total_airports = Airport.objects.count()

        # Популярные направления из реальных данных БД
        popular_origins = Airport.objects.filter(
            departures__status='scheduled'
        ).distinct()[:10]

        popular_destinations = Airport.objects.filter(
            arrivals__status='scheduled'
        ).distinct()[:10]

        return Response({
            'success': True,
            'database_stats': {
                'total_scheduled_flights': total_flights,
                'total_airports': total_airports,
                'popular_departure_cities': [
                    {'city': airport.city, 'airport': airport.name, 'iata': airport.iata_code}
                    for airport in popular_origins
                ],
                'popular_destination_cities': [
                    {'city': airport.city, 'airport': airport.name, 'iata': airport.iata_code}
                    for airport in popular_destinations
                ]
            }
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({
            'success': False,
            'error': f'Ошибка получения статистики БД: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)