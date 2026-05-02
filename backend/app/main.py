from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import os

# Environment variables are loaded before routers and auth use them.
load_dotenv()

from .database import engine, Base
from .routers import users, weather

# Tables are created on startup if they do not exist yet.
Base.metadata.create_all(bind=engine)

# This is the main FastAPI application object.
app = FastAPI(title="WeatherApp API")

# Configure CORS to allow frontend communication
allowed_origins = [
    "http://localhost:19000",
    "http://localhost:19001",
    "http://localhost:3000",
    "http://127.0.0.1:19000",
    "http://127.0.0.1:19001",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]

if os.getenv("ENVIRONMENT") == "production":
    allowed_origins = [
        "https://yourdomain.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Each router adds its own endpoints to the main app.
app.include_router(users.router)
app.include_router(weather.router)


@app.get("/")
def root():
    # This route is a simple health message for quick checks.
    return {"message": "Welcome to the WeatherApp API"}
