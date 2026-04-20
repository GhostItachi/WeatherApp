from fastapi import FastAPI
from dotenv import load_dotenv

# Load environment variables before the app uses them.
load_dotenv()

from .database import engine, Base
from .routers import users, weather

# Create database tables if they do not exist yet.
Base.metadata.create_all(bind=engine)

# Create the FastAPI application instance.
app = FastAPI(title="WeatherApp API")

# Register the routers so their endpoints become part of the API.
app.include_router(users.router)
app.include_router(weather.router)

@app.get("/")
def root():
    # Simple test route to confirm the API is running.
    return {"message": "Bienvenido a la API de WeatherApp"}
