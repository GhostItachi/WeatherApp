# WeatherApp — Guía rápida de instalación y ejecución

Resumen breve: instrucciones para poner en marcha los distintos componentes del proyecto (backend, frontend móvil, admin web) en entornos Linux y Windows.

Requisitos previos

- Python 3.10+ (para el backend)
- Node.js 16+ y npm (para frontend y admin web)
- Expo CLI (para la app móvil): `npm install -g expo-cli` (opcional si usa `npx`)

Backend (carpeta `backend/`)

Linux / macOS

```bash
cd backend/
# Crear y activar virtualenv
python3 -m venv venv
source venv/bin/activate
# Instalar dependencias
pip install -r requirements.txt
# Ejecutar servidor de desarrollo
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Windows (PowerShell)

```powershell
cd backend/
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
.\venv\Scripts\Activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Notas backend:

- Configure variables de entorno (JWT secret, DB URL, etc.) según `backend/app/main.py` antes de arrancar.

Admin web (carpeta `admin_web/` — panel administrativo)

Linux / macOS

```bash
cd admin_web/
npm install
# Desarrollo
npm run dev
# Producción (build)
npm run build
```

Windows

```powershell
cd admin_web/
npm.cmd install
npm run dev
```

Frontend móvil (carpeta `frontend/` — Expo)

Linux / macOS

```bash
cd frontend/
npm install
# Iniciar Metro / Expo
npx expo start
# Forzar cache limpio
npx expo start -c
```

Windows

```powershell
cd frontend/
npm.cmd install
npx expo start
```

Documentación (carpeta `docs/`)

- Los archivos MDX del proyecto se encuentran en `docs/`.
- Para previsualizar, utilizar la herramienta de documentación que prefiera (Mintlify u otro renderer MDX). No hay script de preview incluido por defecto en este repo.

Comandos útiles comunes

```bash
# Iniciar backend y admin simultáneamente (ejemplo con tmux)
tmux new-session -d -s weatherapp 'cd backend && source venv/bin/activate && uvicorn app.main:app --reload'
tmux split-window -h 'cd admin_web && npm run dev'
tmux attach -t weatherapp
```

Preguntas frecuentes rápidas

- ¿Dónde están las variables de configuración? — Revisar `backend/.env` (si existe) o la sección de configuración en `backend/app/main.py`.
- ¿Cómo ejecutar tests? — No hay una suite de tests estandarizada en el repo; añada/ejecute según la carpeta y herramientas que prefiera.

Si quieres, puedo:

- Añadir instrucciones para desplegar (Docker, CI/CD).
- Crear scripts `make` o `npm` para un arranque más sencillo.
- Preparar el commit con este cambio.

---

Última actualización: organizé y clarifiqué comandos de arranque para Linux y Windows.
