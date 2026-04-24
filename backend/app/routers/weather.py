from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import database, models, schemas, auth
import httpx
import os
import logging

# setup logging to track errors in the console/files
logger = logging.getLogger(__name__)

# This router handles weather endpoints and favorite cities.
router = APIRouter(prefix="/weather", tags=["Weather"])

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


def get_api_key() -> str:
    # Check if the API exist before requests
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Weather service is not configured")
    return api_key


def parse_weather_response(data: dict) -> dict:
    """Safely parse OpenWeather API response"""
    try:
        main = data.get("main", {})
        weather = data.get("weather", [{}])[0]

        return {
            "city": data.get("name", "Unknown"),
            "temperature": main.get("temp", 0),
            "description": weather.get("description", ""),
            "humidity": main.get("humidity", 0),
            "icon": weather.get("icon", ""),
        }
    except (KeyError, IndexError, TypeError, ValueError) as e:
        logger.error(f"Failed to parse weather data: {e}")
        raise HTTPException(status_code=502, detail="Invalid weather data format")


# Helper function to map external API errors to precise HTTP exceptions
def handle_provider_error(response_status: int, city_name: str = "Unknown"):
    """
    Maps OpenWeather response codes to appropriate FastAPI exceptions.
    Maps external status to our system status.
    """
    if response_status == 404:
        raise HTTPException(
            status_code=404, detail=f"Ciudad '{city_name}' no encontrada"
        )
    elif response_status == 401:
        raise HTTPException(
            status_code=502, detail="Error de autenticación con el proveedor"
        )
    elif response_status == 429:
        raise HTTPException(status_code=429, detail="Límite de peticiones alcanzado")
    elif response_status >= 500:
        raise HTTPException(
            status_code=503, detail="Servicio de clima temporalmente fuera de servicio"
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Error al procesar la solicitud de clima para {city_name}",
        )


@router.get("/current/{city}", response_model=schemas.WeatherResponse)
async def get_weather(city: str):
    # Search the weather of one city by its name.
    api_key = get_api_key()

    async with httpx.AsyncClient(timeout=10.0) as client:
        params = {"q": city.strip(), "appid": api_key, "units": "metric", "lang": "es"}
        response = await client.get(BASE_URL, params=params)

        # Use the mapping for precise error reporting
        if response.status_code != 200:
            handle_provider_error(response.status_code, city)

        data = response.json()
        return parse_weather_response(data)


@router.get("/current-coord", response_model=schemas.WeatherResponse)
async def get_weather_by_coords(lat: float, lon: float):
    # Search the weather using latitude and longitude.
    api_key = get_api_key()

    async with httpx.AsyncClient(timeout=10.0) as client:
        params = {
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric",
            "lang": "es",
        }
        response = await client.get(BASE_URL, params=params)

        # Error tracking for coordinates
        if response.status_code != 200:
            handle_provider_error(response.status_code, f"Coords({lat},{lon})")

        # Build the response with the same shape used in the app.
        data = response.json()
        return parse_weather_response(data)


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
    api_key = get_api_key()

    async with httpx.AsyncClient(timeout=10.0) as client:
        for fav in fav_cities:
            params = {
                "q": fav.city_name,
                "appid": api_key,
                "units": "metric",
                "lang": "es",
            }
            response = await client.get(BASE_URL, params=params)

            if response.status_code == 200:
                data = response.json()
                results.append(parse_weather_response(data))

            else:
                # Log the specific error and decide strategy
                # log the error and stop the whole process if it's a provider issue
                logger.error(
                    f"Error fetching favorite '{fav.city_name}': Status {response.status_code}"
                )

                # >= 500 to critical errors to inform frontend about service downtime
                # Stop immediately if the external service is down or keys are invalid
                if response.status_code in [401, 429] or response.status_code >= 500:
                    handle_provider_error(response.status_code)

                # If it's just a 404, we continue but the log remains for debugging.

    return results
