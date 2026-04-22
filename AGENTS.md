# WeatherApp - AI Agent Guide

WeatherApp es una aplicación full-stack de clima con backend FastAPI y frontend Expo (React Native).

## 🚀 Quick Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Servidor estará disponible en `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npx expo start
```

Presiona `a` (Android), `i` (iOS), `w` (Web) o `r` (restart)

**Nota:** En dispositivos reales, configura `EXPO_PUBLIC_API_BASE_URL=http://<tu-ip>:8000` en `.env`

---

## 📋 Stack & Dependencies

| Área           | Tech                  | Versión           |
| -------------- | --------------------- | ----------------- |
| **Backend**    | FastAPI               | 0.136.0           |
| **Server**     | Uvicorn               | 0.44.0            |
| **Database**   | SQLite + SQLAlchemy   | 2.0.49            |
| **Auth**       | JWT + OAuth2 + bcrypt | python-jose 3.5.0 |
| **Frontend**   | Expo + React Native   | ~54.0.33          |
| **Router**     | Expo Router           | ~6.0.23           |
| **HTTP**       | Axios                 | ^1.15.1           |
| **TypeScript** | Strict mode           | Enabled           |

---

## 🏗️ Architecture

### Backend Structure

```
backend/app/
├── main.py           # Entry point, router registration
├── database.py       # SQLite setup, session management
├── models.py         # SQLAlchemy ORM (User, FavoriteCity)
├── schemas.py        # Pydantic validation schemas
├── auth.py           # JWT, password hashing, OAuth2
└── routers/
    ├── users.py      # User CRUD + login
    └── weather.py    # Weather API + favorites
```

### Frontend Structure

```
frontend/
├── app/              # File-based routes (Expo Router)
│   ├── _layout.tsx   # Navigation stack setup
│   ├── index.tsx     # Login screen
│   ├── register.tsx  # Registration screen
│   ├── home.tsx      # Main dashboard (current + favorites)
│   └── profile.tsx   # User profile
├── src/
│   ├── api/
│   │   └── client.ts # Axios instance (BASE_URL configured)
│   └── types/
│       └── weather.ts# WeatherData interface
└── assets/           # Images, icons, fonts
```

---

## 🔑 Key Architecture Patterns

### Backend

- **Router-based organization**: Features separadas en `users.py` y `weather.py`
- **Dependency injection**: `Depends()` para DB sessions y autenticación
- **Error mapping**: Función `handle_provider_error()` para errores de API externa
- **Async for external APIs**: `httpx` para llamadas no-bloqueantes a OpenWeather
- **Environment config**: `.env` via `python-dotenv` (SECRET_KEY, OPENWEATHER_API_KEY)

### Frontend

- **File-based routing**: Cada `.tsx` en `app/` es una ruta
- **Functional components**: Solo React hooks (useState, useEffect, useRef)
- **Animated values**: `useRef` + `Animated.Value` para animaciones suaves
- **AsyncStorage persistence**: Tokens y caché guardados en dispositivo
- **Permission handling**: Solicitud explícita de permisos de ubicación

### Naming Conventions

- **Backend**: snake_case (files), CamelCase (classes)
- **Frontend**: kebab-case (files), CamelCase (components/interfaces)
- **API routes**: lowercase con slashes (`/users/login`)
- **Database tables**: lowercase plural (`users`, `favorites`)

---

## 📡 API Endpoints

### Users (`/users`)

| Método | Ruta           | Auth | Propósito                         |
| ------ | -------------- | ---- | --------------------------------- |
| POST   | `/users/login` | ❌   | OAuth2 password flow, retorna JWT |
| POST   | `/users/`      | ❌   | Registrar nuevo usuario           |
| GET    | `/users/me`    | ✅   | Obtener usuario autenticado       |
| GET    | `/users/`      | ❌   | Listar todos los usuarios         |
| GET    | `/users/{id}`  | ❌   | Obtener usuario por ID            |
| PUT    | `/users/{id}`  | ❌   | Actualizar usuario (parcial)      |
| DELETE | `/users/{id}`  | ❌   | Eliminar usuario                  |

### Weather (`/weather`)

| Método | Ruta                      | Auth | Propósito                            |
| ------ | ------------------------- | ---- | ------------------------------------ |
| GET    | `/weather/current/{city}` | ❌   | Clima actual por ciudad              |
| GET    | `/weather/current-coord`  | ❌   | Clima actual por lat/lon (GPS)       |
| POST   | `/weather/favorites`      | ✅   | Agregar ciudad favorita              |
| GET    | `/weather/favorites/my`   | ✅   | Obtener ciudades favoritas con clima |

**Autenticación**: Bearer token en header `Authorization: Bearer <token>`

---

## 🔐 Authentication Flow

1. **Login**: POST `/users/login` con email/password → JWT token
2. **Storage**: Token guardado en `AsyncStorage.setItem('userToken', token)`
3. **Requests**: Token enviado como `Authorization: Bearer ${token}`
4. **Validation**: Backend valida JWT en `get_current_user()` dependency
5. **Token claim**: Usuario identificado por `"sub"` (email en el JWT)

**Seguridad**:

- Contraseñas hasheadas con bcrypt
- JWT con expiración (24h por defecto)
- Endpoints protegidos requieren token válido

---

## 📊 Data Models

### User

```python
# backend/app/models.py
class User(Base):
    id: int (PK)
    full_name: str
    email: str (unique, indexed)
    hashed_password: str
    favorites: List[FavoriteCity] (one-to-many)
```

### FavoriteCity

```python
class FavoriteCity(Base):
    id: int (PK)
    city_name: str
    user_id: int (FK → User)
```

### WeatherData (Frontend TypeScript)

```typescript
// frontend/src/types/weather.ts
interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  icon: string;
}
```

---

## 🌐 External Integrations

### OpenWeather API

- **Endpoint**: `https://api.openweathermap.org/data/2.5/weather`
- **Parámetros**: `units=metric`, `lang=es` (Spanish responses)
- **Error handling**: 404 (city not found), 401 (auth), 429 (rate limit), 5xx (service down)
- **Ubicación**: `backend/app/routers/weather.py`

**Configuración necesaria**:

- `.env`: `OPENWEATHER_API_KEY=<your-key>`

---

## 🗄️ Environment Variables

### Backend `.env`

```bash
SECRET_KEY=<secret-key>                    # JWT signing key (REQUIRED)
OPENWEATHER_API_KEY=<api-key>             # OpenWeather credentials (REQUIRED)
```

### Frontend `.env` (o `.env.local`)

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000  # Backend URL
```

**Nota**: En dispositivos reales, usa la IP del servidor: `http://192.168.x.x:8000`

---

## 💻 Common Development Tasks

### Adding a new API endpoint

1. **Backend**: Crear función en router correspondiente (`routers/users.py` o `routers/weather.py`)
2. **Schemas**: Agregar Pydantic schemas en `backend/app/schemas.py`
3. **Models**: Actualizar SQLAlchemy models si necesario (`backend/app/models.py`)
4. **Frontend**: Llamar endpoint desde Axios client en `frontend/src/api/client.ts`
5. **Type safety**: Definir interfaces en `frontend/src/types/weather.ts`

### Adding a new screen/route

1. Crear archivo `.tsx` en `frontend/app/` (automáticamente registered por Expo Router)
2. Importar en `_layout.tsx` si necesita estar en stack de navegación
3. Usar `useNavigation()` hook para navegación
4. Implementar con functional components + React hooks

### Debugging

- **Backend**: Uvicorn logs en terminal, accede a `http://localhost:8000/docs` (Swagger UI)
- **Frontend**: `npx expo start` muestra QR code, usa Expo Go app o emulador
- **Network**: Instala React Native Debugger para inspeccionar requests

---

## 🎨 UI/UX Patterns

- **Gradients**: Linear gradients en headers/backgrounds
- **Safe area**: Respeta notches de dispositivo via `SafeAreaProvider`
- **Animations**: Cloud drifting, raindrop falling effects
- **Loading states**: `ActivityIndicator` spinners
- **Error handling**: Modal alerts con mensajes claros
- **Icons**: Ionicons desde Expo
- **Forms**: `KeyboardAvoidingView` para mejor UX

---

## 🚨 Important Notes

### Production Considerations

- SQLite no es adecuado para múltiples instancias (usar PostgreSQL/MySQL)
- SECRET_KEY tiene fallback poco seguro - debe ser overrideado
- No hay HTTPS/TLS enforcement
- No hay rate limiting en login
- GET `/users/` es público (todos pueden ver todos los usuarios)

### Development Notes

- Backend requiere Python 3.8+
- Frontend requiere Node.js 16+
- Base de datos SQLite se crea automáticamente en `weather_app.db`
- CORS puede necesitar configuración para desarrollo cross-origin

---

## 📁 Important File Locations

| Archivo                                                  | Propósito                              |
| -------------------------------------------------------- | -------------------------------------- |
| [backend/app/main.py](backend/app/main.py)               | Configuración app, router registration |
| [backend/app/auth.py](backend/app/auth.py)               | JWT, password hashing, OAuth2          |
| [backend/app/database.py](backend/app/database.py)       | DB connection, session factory         |
| [backend/requirements.txt](backend/requirements.txt)     | Backend dependencies                   |
| [frontend/app/\_layout.tsx](frontend/app/_layout.tsx)    | Navigation stack, app shell            |
| [frontend/src/api/client.ts](frontend/src/api/client.ts) | Axios configuration                    |
| [frontend/package.json](frontend/package.json)           | Frontend dependencies & scripts        |
| [comm.txt](comm.txt)                                     | Startup commands reference             |

---

## 🔄 Workflow Tips

1. **Make changes symmetrically**: Si actualizas una API en backend, actualiza el frontend
2. **Test auth flow**: Usa Swagger UI en `localhost:8000/docs` para testear endpoints
3. **Check types**: Frontend está en modo TypeScript strict, asegúrate de type safety
4. **Restart servers**: Uvicorn auto-reloads, pero Expo puede necesitar restart (`r`)
5. **Clear cache**: Si hay problemas, limpia `node_modules` y reinstala frontend deps

---

## 📚 Related Documentation

- [comm.txt](comm.txt) - Startup commands
- OpenWeather API: https://openweathermap.org/api
- FastAPI: https://fastapi.tiangolo.com/
- Expo Router: https://docs.expo.dev/router/introduction/
- React Native: https://reactnative.dev/

---

**Última actualización**: Abril 2026
