from django.urls import path
from .views.auth_views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    UserProfileView,
    register_view,
    logout_view,
    change_password_view,
    me_view
)
from .views.flight_views import (
    search_flights,
    flight_detail,
    airports_list,
    popular_destinations
)
from .views.booking_views import (
    create_booking,
    user_bookings,
    booking_detail,
    pay_booking,
    cancel_booking,
    booking_stats
)
from .views.admin_views import (
    admin_dashboard_stats,
    admin_flights,
    admin_flight_detail,
    admin_bookings,
    admin_users,
    admin_airplanes
)
# ДОБАВИТЬ ЭТИ ИМПОРТЫ 👇
from .views.route_views import (
    search_optimal_routes,
    search_direct_routes,
    get_database_stats
)

urlpatterns = [
    # Аутентификация и профиль
    path('auth/register/', register_view, name='auth_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', CustomTokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/logout/', logout_view, name='auth_logout'),
    path('auth/profile/', UserProfileView.as_view(), name='auth_profile'),
    path('auth/me/', me_view, name='auth_me'),
    path('auth/change-password/', change_password_view, name='auth_change_password'),

    # Рейсы и поиск
    path('flights/search/', search_flights, name='flights_search'),
    path('flights/<int:flight_id>/', flight_detail, name='flight_detail'),
    path('flights/airports/', airports_list, name='airports_list'),
    path('flights/popular-destinations/', popular_destinations, name='popular_destinations'),

    # НОВЫЕ РОУТЫ ДЛЯ АЛГОРИТМА ПОИСКА 👇
    path('routes/search/', search_optimal_routes, name='search_optimal_routes'),
    path('routes/direct/', search_direct_routes, name='search_direct_routes'),
    path('routes/stats/', get_database_stats, name='get_database_stats'),

    # Бронирования
    path('bookings/create/', create_booking, name='create_booking'),
    path('bookings/my/', user_bookings, name='user_bookings'),
    path('bookings/<int:booking_id>/', booking_detail, name='booking_detail'),
    path('bookings/pay/', pay_booking, name='pay_booking'),
    path('bookings/<int:booking_id>/cancel/', cancel_booking, name='cancel_booking'),
    path('bookings/stats/', booking_stats, name='booking_stats'),

    # Админ панель
    path('admin/stats/', admin_dashboard_stats, name='admin_stats'),
    path('admin/flights/', admin_flights, name='admin_flights'),
    path('admin/flights/<int:flight_id>/', admin_flight_detail, name='admin_flight_detail'),
    path('admin/bookings/', admin_bookings, name='admin_bookings'),
    path('admin/users/', admin_users, name='admin_users'),
    path('admin/airplanes/', admin_airplanes, name='admin_airplanes'),
]