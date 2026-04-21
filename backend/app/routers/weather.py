from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import database, models, schemas, auth
import httpx
import os

# This router handles weather endpoints and favorite cities.
router = APIRouter(prefix="/weather", tags=["Weather"])

API_KEY = os.getenv("OPENWEATHER_API_KEY")
print(f"DEBUG: Mi API KEY es: {API_KEY}")
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


@router.get("/current/{city}", response_model=schemas.WeatherResponse)
async def get_weather(city: str):
    # Search the weather of one city by its name.
    api_key = os.getenv("OPENWEATHER_API_KEY")
    async with httpx.AsyncClient() as client:
        params = {"q": city.strip(), "appid": api_key, "units": "metric", "lang": "es"}
        response = await client.get(BASE_URL, params=params)

        # If the external API fails, return a simple not found error.
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Ciudad no encontrada")

        data = response.json()

        # Return only the weather fields used by the frontend.
        refined_data = {
            "city": data["name"],
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "humidity": data["main"]["humidity"],
            "icon": data["weather"][0]["icon"],
        }

        return refined_data


@router.get("/current-coord", response_model=schemas.WeatherResponse)
async def get_weather_by_coords(lat: float, lon: float):
    # Search the weather using latitude and longitude.
    api_key = os.getenv("OPENWEATHER_API_KEY")
    async with httpx.AsyncClient() as client:
        params = {
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric",
            "lang": "es",
        }
        response = await client.get(BASE_URL, params=params)

        if response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="No se pudo obtener el clima para estas coordenadas",
            )

        # Build the response with the same shape used in the app.
        data = response.json()
        return {
            "city": data["name"],
            "temperature": data["main"]["temp"],
            "description": data["weather"][0]["description"],
            "humidity": data["main"]["humidity"],
            "icon": data["weather"][0]["icon"],
        }


@router.post("/favorites", response_model=schemas.FavoriteCityOut)
def add_favorite(
    favorite: schemas.FavoriteCityBase,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Save one favorite city for the logged in user.
    new_fav = models.FavoriteCity(city_name=favorite.city_name, user_id=current_user.id)
    db.add(new_fav)
    db.commit()
    db.refresh(new_fav)
    return new_fav


@router.get("/favorites/my", response_model=list[schemas.WeatherResponse])
async def get_my_favorites(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Read the user's saved cities from the local database.
    fav_cities = (
        db.query(models.FavoriteCity)
        .filter(models.FavoriteCity.user_id == current_user.id)
        .all()
    )

    results = []
    api_key = os.getenv("OPENWEATHER_API_KEY")

    async with httpx.AsyncClient() as client:
        for fav in fav_cities:
            # For each saved city, request the latest weather from OpenWeather.
            params = {
                "q": fav.city_name,
                "appid": api_key,
                "units": "metric",
                "lang": "es",
            }
            response = await client.get(BASE_URL, params=params)

            if response.status_code == 200:
                data = response.json()
                # Add only the fields the mobile app needs.
                results.append(
                    {
                        "city": data["name"],
                        "temperature": data["main"]["temp"],
                        "description": data["weather"][0]["description"],
                        "humidity": data["main"]["humidity"],
                        "icon": data["weather"][0]["icon"],
                    }
                )

    return results
