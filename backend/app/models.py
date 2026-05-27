from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database import Base
from sqlalchemy import UniqueConstraint
from datetime import datetime
from sqlalchemy import DateTime


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)

    role: Mapped[str] = mapped_column(
        String, default="user", server_default="user", nullable=False
    )

    favorites: Mapped[list["FavoriteCity"]] = relationship(
        "FavoriteCity", back_populates="owner", cascade="all, delete"
    )


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
