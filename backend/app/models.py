from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

# This table stores the main account data for each user.
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    bio = Column(String, nullable=True)

    # One user can save many favorite cities.
    favorites = relationship("FavoriteCity", back_populates="owner")

# This table stores one favorite city linked to one user.
class FavoriteCity(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    # This relation lets the app go back from a favorite city to its owner.
    owner = relationship("User", back_populates="favorites")
