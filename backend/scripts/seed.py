import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import SessionLocal, engine, Base
from app import models, auth
from sqlalchemy.orm import configure_mappers


configure_mappers()


def seed_database():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Change this email before running the seed in a real local setup.
    admin_email = "a@a.com"
    existing_admin = (
        db.query(models.User).filter(models.User.email == admin_email).first()
    )

    if not existing_admin:
        hashed_pwd = auth.get_password_hash("123")
        admin_user = models.User(
            full_name="Administrador del Sistema",
            email=admin_email,
            hashed_password=hashed_pwd,
            role="admin",
        )
        db.add(admin_user)
        print(f"Admin creado: {admin_email}")

    # The test user provides sample data for the dashboard metrics.
    user_email = "user@e.com"
    existing_user = (
        db.query(models.User).filter(models.User.email == user_email).first()
    )

    if not existing_user:
        hashed_pwd = auth.get_password_hash("123")
        test_user = models.User(
            full_name="Usuario de Prueba",
            email=user_email,
            hashed_password=hashed_pwd,
            role="user",
        )
        db.add(test_user)
        db.commit()

        # The favorite city makes the top-cities chart useful after seeding.
        fav = models.FavoriteCity(city_name="Maicao, CO", user_id=test_user.id)
        db.add(fav)
        print("Datos de prueba creados.")

    db.commit()
    db.close()


if __name__ == "__main__":
    seed_database()
