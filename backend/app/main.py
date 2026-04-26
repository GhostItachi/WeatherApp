from fastapi import FastAPI
from dotenv import load_dotenv

# Environment variables are loaded before routers and auth use them.
load_dotenv()

from .database import engine, Base
from .routers import users, weather

# Tables are created on startup if they do not exist yet.
Base.metadata.create_all(bind=engine)

# This is the main FastAPI application object.
app = FastAPI(title="WeatherApp API")

# Each router adds its own endpoints to the main app.
app.include_router(users.router)
app.include_router(weather.router)

@app.get("/")
def root():
    # This route is a simple health message for quick checks.
    return {"message": "Bienvenido a la API de WeatherApp"}
