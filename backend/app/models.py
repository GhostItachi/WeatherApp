"""ORM models for WeatherApp.

Defines `User`, `FavoriteCity` and `AuditLog` SQLAlchemy models used
throughout the application and by the admin dashboard.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from sqlalchemy import UniqueConstraint
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="0", nullable=False
    )
    verification_code: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    reset_password_token: Mapped[str | None] = mapped_column(String, nullable=True)
    reset_password_expires: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    role: Mapped[str] = mapped_column(
        String, default="user", server_default="user", nullable=False
    )
    favorites: Mapped[list["FavoriteCity"]] = relationship(
        "FavoriteCity", back_populates="owner", cascade="all, delete"
    )
    profile_picture: Mapped[str | None] = mapped_column(String, nullable=True)
    expo_push_token: Mapped[str | None] = mapped_column(String, nullable=True)


class FavoriteCity(Base):
    __tablename__ = "favorites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    city_name: Mapped[str] = mapped_column(String)

    # Database-level cascade keeps favorites aligned when a user is deleted.
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    __table_args__ = (UniqueConstraint("city_name", "user_id", name="_user_city_uc"),)

    owner: Mapped["User"] = relationship("User", back_populates="favorites")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    level: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    user_email: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
