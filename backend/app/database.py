from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# The app uses a local SQLite database file during development.
SQLALCHEMY_DATABASE_URL = "sqlite:///./weather_app.db"

# The engine opens the low-level connection to SQLite.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# SessionLocal creates one SQLAlchemy session per request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All ORM models inherit from this Base class.
Base = declarative_base()

def get_db():
    # This dependency opens a session and closes it after the request ends.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
