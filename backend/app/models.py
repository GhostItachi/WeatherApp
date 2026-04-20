from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

# This model stores app users.
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    # One user can have many favorite cities.
    favorites = relationship("FavoriteCity", back_populates="owner")

# This model stores each favorite city linked to one user.
class FavoriteCity(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    # This creates the inverse relation back to the user.
    owner = relationship("User", back_populates="favorites")
