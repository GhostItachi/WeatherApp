"""Application entrypoint for the WeatherApp FastAPI server.

This module creates the FastAPI app, configures CORS, mounts static files
and includes the routers for users and weather endpoints.
"""

from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Environment variables must be loaded before auth and routers read configuration.
load_dotenv()

from .database import engine, Base
from .routers import users, weather

# SQLAlchemy creates missing local tables during application startup.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WeatherApp API")

app.mount("/static", StaticFiles(directory="static"), name="static")

# Local development allows Expo, web, and admin dashboard origins.
allowed_origins = [
    "http://localhost:19000",
    "http://localhost:19001",
    "http://localhost:3000",
    "http://127.0.0.1:19000",
    "http://127.0.0.1:19001",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://l3f9pxsw-5173.use2.devtunnels.ms",
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

app.include_router(users.router)
app.include_router(weather.router)


@app.get("/")
def root():
    return {"message": "Welcome to the WeatherApp API"}
