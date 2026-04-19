from fastapi import FastAPI
from dotenv import load_dotenv

# 1. CARGAR EL .ENV ANTES QUE NADA
load_dotenv()

# 2. AHORA IMPORTAMOS EL RESTO
from .database import engine, Base
from .routers import users, weather

# Crea las tablas en la base de datos
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WeatherApp API")

# Incluye los routers
app.include_router(users.router)
app.include_router(weather.router)


@app.get("/")
def root():
    return {"message": "Bienvenido a la API de WeatherApp"}
