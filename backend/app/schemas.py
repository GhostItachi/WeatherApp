"""Pydantic schemas for request and response models.

Schemas normalize database models and external provider responses for the
frontend and admin UI. Keep user-facing text in Spanish inside endpoints;
these classes focus on data shape and typing.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime, timezone


# Favorite city schemas share the same city-name contract.
class FavoriteCityBase(BaseModel):
    city_name: str


class FavoriteCityCreate(FavoriteCityBase):
    pass


class FavoriteCityOut(FavoriteCityBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# User schemas share the editable profile fields.
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    expo_push_token: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None


# Public user responses never expose the password hash.
class UserOut(UserBase):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    favorites: List[FavoriteCityBase] = []
    bio: Optional[str] = None
    role: str
    profile_picture: Optional[str] = None

    is_active: bool

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class UserStatusUpdate(BaseModel):
    is_active: bool


class ForecastItem(BaseModel):
    dt: int
    dt_txt: str
    temp: float
    description: str
    icon: str


# Weather responses normalize OpenWeather payloads for frontend screens.
class WeatherResponse(BaseModel):
    city: str
    temperature: float
    feels_like: float
    humidity: int
    visibility: int
    sunrise: Optional[int] = None
    sunset: Optional[int] = None
    pressure: int
    description: str
    icon: str
    wind_speed: float
    forecast: List[ForecastItem] = []

    class Config:
        from_attributes = True


class FavoriteWeatherResponse(WeatherResponse):
    city_name: str


class AuditLogOut(BaseModel):
    id: int
    level: str
    message: str
    user_email: Optional[str] = None
    created_at: datetime

    @field_validator("created_at", mode="before")
    @classmethod
    def ensure_utc(cls, v):
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    class Config:
        from_attributes = True


class PushTokenUpdate(BaseModel):
    token: str


class PasswordRecoveryRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    token: str
    new_password: str
