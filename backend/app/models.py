from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    # Relación con ciudades favoritas
    favorites = relationship("FavoriteCity", back_populates="owner")


class FavoriteCity(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="favorites")
