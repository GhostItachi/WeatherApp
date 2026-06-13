"""Authentication helpers for WeatherApp backend.

This module provides password hashing, JWT token creation and helper
dependencies to validate the current authenticated user and admin users.
"""

from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from app import database, models
from fastapi import APIRouter, Depends, HTTPException, status
import secrets

router = APIRouter(prefix="/auth", tags=["Auth"])

# JWT settings are shared by token creation and protected-route validation.
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_default_key")
ALGORITHM = "HS256"
# Admin sessions are intentionally long-lived for this local project workflow.
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 365 * 10

# FastAPI reads the Bearer token from the Authorization header through this dependency.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

# Passwords are stored as bcrypt hashes instead of plain text.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    """Verify a plain password against a stored bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """Return a bcrypt hash for the provided password string."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a signed JWT token including the given payload.

    If `expires_delta` is omitted, a long default expiry is applied for local
    development convenience.
    """
    # The JWT payload is copied so callers keep ownership of their original data.
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el usuario",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # The subject claim stores the email used to look up the active user.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") or ""
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Deleted users cannot keep using previously issued tokens.
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_admin(current_user: models.User = Depends(get_current_user)):
    """
    Validate that the authenticated user has administrator permissions.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren permisos de administrador.",
        )
    return current_user


def log_event(db: Session, level: str, message: str, email: Optional[str] = None):
    new_log = models.AuditLog(level=level, message=message, user_email=email)
    db.add(new_log)
    db.commit()


@router.post("/request-password-reset")
async def request_password_reset(email: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        # The response is intentionally generic so account existence is not exposed.
        return {"detail": "Si el correo está registrado, recibirás las instrucciones."}

    token = secrets.token_urlsafe(16)
    user.reset_password_token = token
    user.reset_password_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()

    # Local development prints the reset token instead of sending an email.
    print(f"--- [DEBUG] TOKEN DE RECUPERACIÓN PARA {email}: {token} ---")

    return {"detail": "Instrucciones generadas. Revisa la consola del servidor."}


@router.post("/reset-password")
async def reset_password(
    token: str, new_password: str, db: Session = Depends(database.get_db)
):
    user = (
        db.query(models.User).filter(models.User.reset_password_token == token).first()
    )

    if not user or user.reset_password_token != token:
        raise HTTPException(status_code=400, detail="Token inválido")

    # Expired reset tokens cannot be reused.
    if (
        user.reset_password_expires is None
        or user.reset_password_expires < datetime.utcnow()
    ):
        raise HTTPException(status_code=400, detail="Token expirado")

    user.hashed_password = get_password_hash(new_password)

    # The reset token is cleared after a successful password change.
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()

    return {"detail": "Contraseña actualizada exitosamente."}
