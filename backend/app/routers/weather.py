from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import database, models, schemas, auth
import httpx
import os
import logging

# This logger records provider and parsing errors from the weather flow.
logger = logging.getLogger(__name__)

# This router reads weather data and manages favorite cities.
router = APIRouter(prefix="/weather", tags=["Weather"])

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


def get_api_key() -> str:
    # Stop early if the weather service is not configured.
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Weather service is not configured")
    return api_key


def parse_weather_response(data: dict) -> dict:
    """Convert the OpenWeather payload into the shape used by the app."""
    try:
        main = data.get("main", {})
        weather = data.get("weather", [{}])[0]
        wind = data.get("wind", {})
        return {
            "city": data.get("name", "Unknown"),
            "temperature": main.get("temp", 0),
            "feels_like": main.get("feels_like", 0),
            "description": weather.get("description", ""),
            "humidity": main.get("humidity", 0),
            "pressure": main.get("pressure", 0),
            "wind_speed": wind.get("speed", 0),
            "icon": weather.get("icon", ""),
        }
    except (KeyError, IndexError, TypeError, ValueError) as e:
        logger.error(f"Failed to parse weather data: {e}")
        raise HTTPException(status_code=502, detail="Invalid weather data format")


def handle_provider_error(response_status: int, city_name: str = "Unknown"):
    """Map provider status codes to the API responses returned by FastAPI."""
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
    # This endpoint reads the current weather for a city name.
    api_key = get_api_key()

    async with httpx.AsyncClient(timeout=10.0) as client:
        params = {"q": city.strip(), "appid": api_key, "units": "metric", "lang": "es"}
        response = await client.get(BASE_URL, params=params)

        # Any provider error is translated to a clear API error.
        if response.status_code != 200:
            handle_provider_error(response.status_code, city)

        data = response.json()
        return parse_weather_response(data)


@router.get("/current-coord", response_model=schemas.WeatherResponse)
async def get_weather_by_coords(lat: float, lon: float):
    # This endpoint reads the current weather from device coordinates.
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

        # Coordinate requests use the same provider error mapping.
        if response.status_code != 200:
            handle_provider_error(response.status_code, f"Coords({lat},{lon})")

        # The response keeps the same structure used by the frontend screens.
        data = response.json()
        return parse_weather_response(data)


@router.get("/search-suggestions")
async def get_search_suggestions(q: str):
    """Return short city suggestions from the geocoding service."""
    query = q.strip()
    if len(query) < 3:
        return []

    api_key = get_api_key()
    GEO_URL = "http://api.openweathermap.org/geo/1.0/direct"

    async with httpx.AsyncClient(timeout=5.0) as client:
        params = {"q": q, "limit": 5, "appid": api_key}
        response = await client.get(GEO_URL, params=params)

        if response.status_code != 200:
            return []

        data = response.json()
        # Each suggestion is formatted as "City, State" or "City, Country".
        suggestions = []
        for loc in data:
            name = loc.get("name")
            state = loc.get("state")
            country = loc.get("country")
            display = f"{name}, {state}" if state else f"{name}, {country}"
            if display not in suggestions:
                suggestions.append(display)

        return suggestions


@router.post("/favorites", response_model=schemas.FavoriteCityOut)
def add_favorite(
    favorite: schemas.FavoriteCityBase,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # This endpoint stores one favorite city for the authenticated user.
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
    # Favorite names come from the database, and each weather entry comes from OpenWeather.
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
                # A missing city is skipped, but provider failures stop the full request.
                logger.error(
                    f"Error fetching favorite '{fav.city_name}': Status {response.status_code}"
                )

                if response.status_code in [401, 429] or response.status_code >= 500:
                    handle_provider_error(response.status_code)

    return results
