from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
from app import database, models

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
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
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
