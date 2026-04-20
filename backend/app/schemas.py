from pydantic import BaseModel, EmailStr
from typing import List, Optional

# Base schema for a favorite city.
class FavoriteCityBase(BaseModel):
    city_name: str

# Schema used when the client creates a favorite city.
class FavoriteCityCreate(FavoriteCityBase):
    pass

# Schema returned by the API after a favorite city is saved.
class FavoriteCityOut(FavoriteCityBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Base schema shared by user inputs and outputs.
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

# Schema used when a new user registers.
class UserCreate(UserBase):
    password: str

# Schema used for partial user updates.
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

# Safe user data returned by the API.
class UserOut(UserBase):
    id: int
    favorites: List[FavoriteCityBase] = []

    class Config:
        from_attributes = True

# Schema returned for weather data in the app.
class WeatherResponse(BaseModel):
    city: str
    temperature: float
    description: str
    humidity: int
    icon: str
