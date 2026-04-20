from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# This is the local SQLite database used by the app.
SQLALCHEMY_DATABASE_URL = "sqlite:///./weather_app.db"

# The engine is the connection to the database.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# SessionLocal creates one database session for each request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is the parent class for all SQLAlchemy models.
Base = declarative_base()

def get_db():
    # Open a database session and close it after the request ends.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
