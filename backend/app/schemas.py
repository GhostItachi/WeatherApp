from pydantic import BaseModel, EmailStr
from typing import List, Optional


class FavoriteCityBase(BaseModel):
    city_name: str


class FavoriteCityCreate(FavoriteCityBase):
    pass


class FavoriteCityOut(FavoriteCityBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserOut(UserBase):
    id: int
    favorites: List[FavoriteCityBase] = []

    class Config:
        from_attributes = True


class WeatherResponse(BaseModel):
    city: str
    temperature: float
    description: str
    humidity: int
    icon: str  # El código del icono para mostrar nubes, sol, etc.
