from pydantic import BaseModel, EmailStr
from typing import List, Optional


# This base schema describes a favorite city name.
class FavoriteCityBase(BaseModel):
    city_name: str


# The client uses this schema when it sends a new favorite city.
class FavoriteCityCreate(FavoriteCityBase):
    pass


# This schema is returned after a favorite city is saved.
class FavoriteCityOut(FavoriteCityBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


# These fields are shared by user input and output schemas.
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    bio: Optional[str] = None


# This schema is used when a new account is created.
class UserCreate(UserBase):
    password: str


# This schema is used to update only some user fields.
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = None


# This schema returns safe user data without the password hash.
class UserOut(UserBase):
    id: int
    favorites: List[FavoriteCityBase] = []
    bio: Optional[str] = None

    class Config:
        from_attributes = True


# This schema defines the weather payload returned to the frontend.
class WeatherResponse(BaseModel):
    city: str
    temperature: float
    feels_like: float
    description: str
    humidity: int
    pressure: int
    wind_speed: float
    icon: str
