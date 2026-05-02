from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import database, models, schemas, auth
import httpx
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/weather", tags=["Weather"])

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"


def get_api_key() -> str:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Weather service is not configured")
    return api_key


def parse_weather_response(data: dict) -> dict:
    try:
        main = data.get("main", {})
        weather_data = data.get("weather", [{}])[0]
        wind = data.get("wind", {})
        description = weather_data.get("description", "sin descripción").capitalize()

        return {
            "city": data.get("name", "Unknown"),
            "temperature": main.get("temp", 0),
            "feels_like": main.get("feels_like", 0),
            "description": description,
            "humidity": main.get("humidity", 0),
            "pressure": main.get("pressure", 0),
            "wind_speed": wind.get("speed", 0),
            "icon": weather_data.get("icon", ""),
        }
    except Exception as e:
        logger.error(f"Error parsing weather: {e}")
        raise HTTPException(
            status_code=502, detail="Error al procesar datos del proveedor"
        )


def handle_provider_error(response_status: int, city_name: str = "Unknown"):
    if response_status == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ciudad '{city_name}' no encontrada en el servicio meteorológico",
        )

    elif response_status == 401:
        logger.critical("OpenWeather API Key inválida o expirada.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de configuración en el servidor de clima",
        )

    elif response_status == 429:
        logger.warning("Se ha alcanzado el límite de peticiones a OpenWeather.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiadas peticiones al servicio de clima. Intenta más tarde.",
        )

    elif 500 <= response_status < 600:
        logger.error(f"OpenWeather está fuera de servicio: Status {response_status}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El proveedor de clima no está disponible temporalmente",
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error inesperado al consultar el servicio de clima",
    )


@router.get("/current/{city}", response_model=schemas.WeatherResponse)
async def get_weather(city: str):
    api_key = get_api_key()
    async with httpx.AsyncClient(timeout=10.0) as client:
        params = {"q": city.strip(), "appid": api_key, "units": "metric", "lang": "es"}
        response = await client.get(BASE_URL, params=params)
        if response.status_code != 200:
            handle_provider_error(response.status_code, city)
        return parse_weather_response(response.json())


@router.get("/search-suggestions")
async def get_search_suggestions(q: str):
    query = q.strip()
    if len(query) < 3:
        return []

    api_key = get_api_key()
    async with httpx.AsyncClient(timeout=5.0) as client:
        params = {
            "q": query,
            "limit": 10,
            "appid": api_key,
        }
        response = await client.get(GEO_URL, params=params)

        if response.status_code != 200:
            return []

        data = response.json()
        suggestions = []
        seen_ids = set()
        for loc in data:
            name = loc.get("name")
            country = loc.get("country")
            lat = loc.get("lat")
            lon = loc.get("lon")

            unique_id = f"{name}-{country}-{lat}-{lon}"

            if unique_id not in seen_ids:
                suggestions.append(
                    {
                        "id": unique_id,
                        "name": name,
                        "country": country,
                        "state": loc.get("state", ""),
                        "lat": lat,
                        "lon": lon,
                    }
                )
                seen_ids.add(unique_id)

        return suggestions[:5]


@router.post("/favorites", response_model=schemas.FavoriteCityOut)
async def add_favorite(
    favorite: schemas.FavoriteCityBase,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    city_name_clean = favorite.city_name.strip()
    api_key = get_api_key()

    async with httpx.AsyncClient(timeout=5.0) as client:

        geo_params = {"q": city_name_clean, "limit": 1, "appid": api_key}
        geo_resp = await client.get(GEO_URL, params=geo_params)

        if geo_resp.status_code != 200 or not geo_resp.json():
            raise HTTPException(
                status_code=404,
                detail=f"No pudimos validar la ubicación: {city_name_clean}",
            )

        geo_data = geo_resp.json()[0]
        normalized_name = f"{geo_data['name']}, {geo_data['country']}"

    existing = (
        db.query(models.FavoriteCity)
        .filter(
            models.FavoriteCity.city_name == normalized_name,
            models.FavoriteCity.user_id == current_user.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"'{normalized_name}' ya está en tu lista de favoritos",
        )

    new_favorite = models.FavoriteCity(
        city_name=normalized_name,
        user_id=current_user.id,
    )
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    return new_favorite


@router.get("/favorites/my", response_model=list[schemas.WeatherResponse])
async def get_my_favorites(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    fav_cities = (
        db.query(models.FavoriteCity)
        .filter(models.FavoriteCity.user_id == current_user.id)
        .all()
    )
    results = []
    api_key = get_api_key()

    async with httpx.AsyncClient(timeout=10.0) as client:
        for fav in fav_cities:
            try:
                params = {
                    "q": fav.city_name,
                    "appid": api_key,
                    "units": "metric",
                    "lang": "es",
                }
                response = await client.get(BASE_URL, params=params)
                if response.status_code == 200:
                    results.append(parse_weather_response(response.json()))
            except Exception as e:
                logger.error(f"Error fetching favorite {fav.city_name}: {e}")
                continue
    return results


@router.delete("/favorites/{city_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(
    city_name: str,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    fav = (
        db.query(models.FavoriteCity)
        .filter(
            models.FavoriteCity.user_id == current_user.id,
            models.FavoriteCity.city_name == city_name,
        )
        .first()
    )

    if not fav:
        raise HTTPException(
            status_code=404, detail="La ciudad no está en tus favoritos"
        )

    db.delete(fav)
    db.commit()
    return None


from fastapi import Query


@router.get("/current-coord", response_model=schemas.WeatherResponse)
async def get_weather_by_coords(lat: float = Query(...), lon: float = Query(...)):
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
        if response.status_code != 200:
            handle_provider_error(response.status_code)
        return parse_weather_response(response.json())
