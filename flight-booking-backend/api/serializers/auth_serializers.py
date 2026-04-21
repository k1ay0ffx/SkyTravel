from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from core.models import User
import uuid


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'last_name', 'phone',
            'passport_number', 'password', 'password_confirm'
        )
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует")
        return value

    def validate_passport_number(self, value):
        if value and User.objects.filter(passport_number=value).exists():
            raise serializers.ValidationError("Пользователь с таким номером паспорта уже существует")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Пароли не совпадают"})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        # ✨ АВТОМАТИЧЕСКИ ГЕНЕРИРУЕМ УНИКАЛЬНЫЙ USERNAME
        email = validated_data['email']
        base_username = email.split('@')[0]
        username = base_username

        # Если username занят, добавляем уникальный суффикс
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Создаем пользователя с username
        validated_data['username'] = username
        user = User(**validated_data)
        user.set_password(password)
        user.save()

        return user


# Остальные классы остаются без изменений...
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = 'email'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data.update({
            'user': {
                'id': self.user.id,
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
                'phone': self.user.phone,
            }
        })
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name',
            'phone', 'passport_number', 'date_joined'
        )
        read_only_fields = ('id', 'email', 'date_joined')

    def validate_passport_number(self, value):
        if value and User.objects.filter(passport_number=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("Пользователь с таким номером паспорта уже существует")
        return value


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Неверный старый пароль")
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Новые пароли не совпадают"})
        return attrs

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user