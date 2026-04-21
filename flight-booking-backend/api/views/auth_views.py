from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from ..serializers.auth_serializers import (
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    PasswordChangeSerializer
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Кастомный вход пользователя с возвратом данных профиля
    POST /api/v1/auth/login/
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = (AllowAny,)


class CustomTokenRefreshView(TokenRefreshView):
    """
    Обновление access токена
    POST /api/v1/auth/refresh/
    """
    permission_classes = (AllowAny,)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Регистрация нового пользователя
    POST /api/v1/auth/register/

    Body:
    {
        "email": "user@example.com",
        "first_name": "Иван",
        "last_name": "Иванов",
        "phone": "+77017777777",
        "passport_number": "123456789",
        "password": "strongpassword123",
        "password_confirm": "strongpassword123"
    }
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Создаем токены для нового пользователя
        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'Пользователь успешно зарегистрирован',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': user.phone,
            },
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Выход пользователя (добавление токена в blacklist)
    POST /api/v1/auth/logout/

    Body:
    {
        "refresh": "refresh_token_here"
    }
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        return Response({
            'message': 'Успешный выход из системы'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': 'Ошибка при выходе из системы'
        }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Получение и обновление профиля пользователя
    GET/PUT /api/v1/auth/profile/
    """
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            response.data['message'] = 'Профиль успешно обновлен'
        return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Изменение пароля пользователя
    POST /api/v1/auth/change-password/

    Body:
    {
        "old_password": "old_password",
        "new_password": "new_strong_password",
        "new_password_confirm": "new_strong_password"
    }
    """
    serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Пароль успешно изменен'
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """
    Получение информации о текущем пользователе
    GET /api/v1/auth/me/
    """
    serializer = UserProfileSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)