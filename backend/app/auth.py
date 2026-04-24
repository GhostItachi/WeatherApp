from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from app import database, models

# Secret values are loaded from environment variables.
SECRET_KEY = os.getenv("SECRET_KEY", "una_llave_muy_secreta_por_defecto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# This object reads the Bearer token from the request header.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

# This object hashes passwords and checks password matches.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    # Compare the plain password with the saved hash.
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    # Convert a plain password into a secure hash.
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    # Copy the payload and add the expiration time.
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    # Encode the payload as a JWT token.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)
):
    # This dependency protects routes and returns the logged in user.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el usuario",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode the token and read the user email from "sub".
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") or ""
        if not email:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Check that the user still exists in the database.
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user
