from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from sqlalchemy import UniqueConstraint

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    bio = Column(String, nullable=True)

    # Agregamos cascade="all, delete" para que SQLAlchemy limpie los favoritos al borrar el usuario
    favorites = relationship(
        "FavoriteCity", back_populates="owner", cascade="all, delete"
    )


class FavoriteCity(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String)
    # ondelete="CASCADE" le dice a la base de datos (SQL) que limpie la fila
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    __table_args__ = (UniqueConstraint("city_name", "user_id", name="_user_city_uc"),)

    owner = relationship("User", back_populates="favorites")
