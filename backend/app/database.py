from sqlalchemy import create_engine  # <--- Solo este es necesario
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# El archivo se creará automáticamente en la raíz del proyecto
SQLALCHEMY_DATABASE_URL = "sqlite:///./weather_app.db"

# Usamos create_engine (en singular)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Necesario solo para SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependencia para obtener la DB en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
