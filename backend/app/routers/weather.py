import httpx
import os
import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from sqlalchemy.orm import Session
from app import database, models, schemas, auth
from ..schemas import WeatherResponse, ForecastItem

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/weather", tags=["Weather"])

CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"
GEO_URL = "https://api.openweathermap.org/geo/1.0/direct"


def get_api_key() -> str:
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Weather service is not configured")
    return api_key


def parse_forecast_item(item: dict) -> dict:
    return {
        "dt": item.get("dt"),
        "dt_txt": item.get("dt_txt"),
        "temp": item.get("main", {}).get("temp", 0),
        "description": item.get("weather", [{}])[0].get("description", "").capitalize(),
        "icon": item.get("weather", [{}])[0].get("icon", ""),
    }


def parse_full_weather(current_data: dict, forecast_data: dict) -> dict:
    try:
        main = current_data.get("main", {})
        weather_data = current_data.get("weather", [{}])[0]
        wind = current_data.get("wind", {})
        forecast_list = [
            parse_forecast_item(i) for i in forecast_data.get("list", [])[:15]
        ]

        return {
            "city": current_data.get("name", "Unknown"),
            "temperature": main.get("temp", 0),
            "feels_like": main.get("feels_like", 0),
            "description": weather_data.get(
                "description", "sin descripción"
            ).capitalize(),
            "humidity": main.get("humidity", 0),
            "pressure": main.get("pressure", 0),
            "wind_speed": wind.get("speed", 0),
            "icon": weather_data.get("icon", ""),
            "forecast": forecast_list,
            "visibility": current_data.get("visibility", 0),
            "sunrise": current_data.get("sys", {}).get("sunrise"),
            "sunset": current_data.get("sys", {}).get("sunset"),
        }
    except Exception as e:
        logger.error(f"Error parsing weather: {e}")
        raise HTTPException(status_code=502, detail="Error processing provider data")


def handle_provider_error(response_status: int, city_name: str = "Unknown"):
    # Provider errors are translated into stable API responses for the frontend.
    if response_status == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"City '{city_name}' not found in weather service",
        )

    elif response_status == 401:
        logger.critical("Invalid or expired OpenWeather API Key.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Weather service configuration error",
        )

    elif response_status == 429:
        logger.warning("OpenWeather request limit reached.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests to weather service. Try again later.",
        )

    elif 500 <= response_status < 600:
        logger.error(f"OpenWeather is unavailable: Status {response_status}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Weather provider temporarily unavailable",
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error inesperado al consultar el servicio de clima",
    )


def select_best_geo_match(locations: list[dict], query: str) -> dict:
    query_parts = [part.strip() for part in query.split(",") if part.strip()]
    query_name = query_parts[0].casefold()
    query_country = None

    if len(query_parts) > 1 and len(query_parts[-1]) == 2:
        query_country = query_parts[-1].casefold()

    if query_country:
        for location in locations:
            location_name = (location.get("name") or "").strip().casefold()
            location_country = (location.get("country") or "").strip().casefold()
            if location_name == query_name and location_country == query_country:
                return location

    for location in locations:
        location_name = (location.get("name") or "").strip().casefold()
        if location_name == query_name:
            return location

    return locations[0]


async def normalize_city_name(
    client: httpx.AsyncClient,
    city_name: str,
    api_key: str,
) -> str:
    geo_params = {"q": city_name, "limit": 5, "appid": api_key}
    geo_resp = await client.get(GEO_URL, params=geo_params)

    if geo_resp.status_code != 200 or not geo_resp.json():
        raise HTTPException(
            status_code=404,
            detail=f"No pudimos validar la ubicación: {city_name}",
        )

    geo_data = select_best_geo_match(geo_resp.json(), city_name)
    return f"{geo_data['name']},{geo_data['country']}"


async def fetch_weather_for_favorite(
    client: httpx.AsyncClient,
    favorite: models.FavoriteCity,
    api_key: str,
) -> dict | None:
    params = {
        "q": favorite.city_name,
        "appid": api_key,
        "units": "metric",
        "lang": "es",
    }
    response = await client.get(CURRENT_URL, params=params)

    if response.status_code != 200:
        try:
            geo_params = {"q": favorite.city_name, "limit": 1, "appid": api_key}
            geo_resp = await client.get(GEO_URL, params=geo_params)
            if geo_resp.status_code != 200 or not geo_resp.json():
                return None

            geo_data = geo_resp.json()[0]
            coord_params = {
                "lat": geo_data["lat"],
                "lon": geo_data["lon"],
                "appid": api_key,
                "units": "metric",
                "lang": "es",
            }
            response = await client.get(CURRENT_URL, params=coord_params)
        except Exception as e:
            logger.error(f"Error resolving favorite {favorite.city_name}: {e}")
            return None

    if response.status_code != 200:
        return None

    weather_data = parse_full_weather(response.json(), {})
    weather_data["city_name"] = favorite.city_name
    return weather_data


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
            state = loc.get("state", "")
            lat = loc.get("lat")
            lon = loc.get("lon")

            # Provider matches are deduplicated by place identity, not by tiny coordinate differences.
            unique_id = f"{name}-{country}-{state}"

            if unique_id not in seen_ids:
                suggestions.append(
                    {
                        "id": unique_id,
                        "name": name,
                        "country": country,
                        "state": state,
                        "lat": lat,
                        "lon": lon,
                    }
                )
                seen_ids.add(unique_id)

        suggestions = suggestions[:5]

        # Each suggestion is enriched with current temperature without blocking the others.
        async def fetch_temp(suggestion):
            try:
                weather_params = {
                    "lat": suggestion["lat"],
                    "lon": suggestion["lon"],
                    "appid": api_key,
                    "units": "metric",
                }
                w_res = await client.get(CURRENT_URL, params=weather_params)
                if w_res.status_code == 200:
                    suggestion["temp"] = round(
                        w_res.json().get("main", {}).get("temp", 0)
                    )
            except Exception as e:
                logger.warning(
                    f"No se pudo obtener clima para sugerencia {suggestion['name']}: {e}"
                )
                suggestion["temp"] = None
            return suggestion

        enriched_suggestions = await asyncio.gather(
            *(fetch_temp(s) for s in suggestions)
        )

        return enriched_suggestions


@router.get("/current/{city}", response_model=schemas.WeatherResponse)
async def get_weather(city: str):
    api_key = get_api_key()
    async with httpx.AsyncClient(timeout=30.0) as client:
        params = {"q": city.strip(), "appid": api_key, "units": "metric", "lang": "es"}
        tasks = [
            client.get(CURRENT_URL, params=params),
            client.get(FORECAST_URL, params=params),
        ]
        current_res, forecast_res = await asyncio.gather(*tasks)
        if current_res.status_code != 200:
            handle_provider_error(current_res.status_code, city)
        return parse_full_weather(current_res.json(), forecast_res.json())


@router.get("/current-coord", response_model=schemas.WeatherResponse)
async def get_weather_by_coords(lat: float = Query(...), lon: float = Query(...)):
    api_key = get_api_key()
    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        params = {
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric",
            "lang": "es",
        }

        try:
            tasks = [
                client.get(CURRENT_URL, params=params),
                client.get(FORECAST_URL, params=params),
            ]
            current_res, forecast_res = await asyncio.gather(*tasks)

            if current_res.status_code != 200:
                handle_provider_error(current_res.status_code)

            return parse_full_weather(current_res.json(), forecast_res.json())

        except httpx.ReadTimeout:
            logger.error(f"Timeout al consultar OpenWeather para coords: {lat}, {lon}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="El servicio de clima está tardando demasiado en responder. Por favor, reintenta.",
            )


@router.post("/favorites", response_model=schemas.FavoriteCityOut)
async def add_favorite(
    favorite: schemas.FavoriteCityBase,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    city_name_clean = favorite.city_name.strip()
    api_key = get_api_key()

    # The city is normalized through OpenWeather before it is saved.
    async with httpx.AsyncClient(timeout=5.0) as client:
        normalized_name = await normalize_city_name(client, city_name_clean, api_key)

    # A user can only save the same normalized city once.
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


@router.get("/favorites/my", response_model=list[schemas.FavoriteWeatherResponse])
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
                weather_data = await fetch_weather_for_favorite(client, fav, api_key)
                if weather_data:
                    results.append(weather_data)
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
