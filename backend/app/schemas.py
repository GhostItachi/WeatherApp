from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


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


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None


# Public user responses never expose the password hash.
class UserOut(UserBase):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    favorites: List[FavoriteCityBase] = []
    bio: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


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

    class Config:
        from_attributes = True
