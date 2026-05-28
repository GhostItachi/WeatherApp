from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas, database, auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

# This router groups authentication, profile, and admin audit endpoints.
router = APIRouter(prefix="/users", tags=["Users"])


def log_event(db: Session, level: str, message: str, email: str | None = None):
    """
    Persist a system audit event for the admin dashboard.
    """
    new_log = models.AuditLog(level=level, message=message, user_email=email)
    db.add(new_log)
    db.commit()


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # Failed login attempts are stored without requiring a valid user account.
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        log_event(db, "WARN", f"Intento de login fallido para: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciales incorrectas"
        )

    # Successful authentication is tracked for admin audit review.
    log_event(db, "AUTH", "Inicio de sesión exitoso", user.email)

    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}


@router.get("/logs", response_model=list[schemas.AuditLogOut])
def get_system_logs(
    type: str = Query("auth"),
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    query = db.query(models.AuditLog)

    if type == "auth":
        query = query.filter(models.AuditLog.level == "AUTH")
    else:
        # Non-auth records are grouped as technical API/system events.
        query = query.filter(models.AuditLog.level != "AUTH")

    return query.order_by(models.AuditLog.created_at.desc()).limit(50).all()


@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@router.post("/", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email, full_name=user.full_name, hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Account creation is visible from the admin audit console.
    log_event(db, "INFO", "Nuevo usuario registrado", user.email)

    return new_user


@router.put("/me", response_model=schemas.UserOut)
def update_current_user(
    user_update: schemas.UserUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if user_update.email and user_update.email != current_user.email:
        existing = (
            db.query(models.User).filter(models.User.email == user_update.email).first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken")

    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me", status_code=204)
def delete_current_user(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    log_event(db, "INFO", "Cuenta eliminada por el usuario", current_user.email)
    db.delete(current_user)
    db.commit()
    return None


@router.post("/change-password")
def change_password(
    pass_data: schemas.PasswordChange,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not auth.verify_password(pass_data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    new_hashed_password = auth.get_password_hash(pass_data.new_password)
    current_user.hashed_password = new_hashed_password
    db.commit()

    log_event(db, "AUTH", "Cambio de contraseña exitoso", current_user.email)
    return {"message": "Password updated successfully"}


@router.get("/", response_model=list[schemas.UserOut])
def get_all_users(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    return db.query(models.User).all()


@router.get("/stats")
def get_system_stats(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    total_users = db.query(models.User).count()
    total_favorites = db.query(models.FavoriteCity).count()

    return {
        "total_users": total_users,
        "total_favorites": total_favorites,
        "system_status": "online",
    }


@router.get("/top-cities")
def get_top_cities(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    # Favorite rows are grouped by city to feed the dashboard ranking chart.
    top_cities = (
        db.query(
            models.FavoriteCity.city_name.label("name"),
            func.count(models.FavoriteCity.id).label("count"),
        )
        .group_by(models.FavoriteCity.city_name)
        .order_by(func.count(models.FavoriteCity.id).desc())
        .limit(5)
        .all()
    )

    return [{"name": city.name, "count": city.count} for city in top_cities]


# Mejorar la distribución de usuarios por ciudad para el gráfico de dona del dashboard admin.

@router.get("/users-distribution")
def get_users_distribution(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    # Contamos IDs de usuarios únicos por cada nombre de ciudad
    distribution = (
        db.query(
            models.FavoriteCity.city_name.label("name"),
            func.count(func.distinct(models.FavoriteCity.user_id)).label("value"),
        )
        .group_by(models.FavoriteCity.city_name)
        .order_by(func.count(func.distinct(models.FavoriteCity.user_id)).desc())
        .limit(6)  # Limitamos a las 6 principales para que la dona no se sature
        .all()
    )

    return [{"name": d.name, "value": d.value} for d in distribution]
