from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    UploadFile,
    File,
    BackgroundTasks,
)
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas, database, auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app import database, models, auth
import shutil
import os
import secrets
import string
from ..schemas import PushTokenUpdate, UserStatusUpdate
from utilities.email_service import send_reset_password_email, send_verification_email

os.makedirs("static/avatars", exist_ok=True)

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

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cuenta inactiva. Revisa tu correo electrónico para verificarla.",
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
def create_user(
    user: schemas.UserCreate,
    background_tasks: BackgroundTasks,  # Añadir para el envío asíncrono
    db: Session = Depends(database.get_db),
):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    # Generar código de activación seguro
    caracteres = string.ascii_uppercase + string.digits
    codigo = "".join(secrets.choice(caracteres) for _ in range(6))

    hashed_pwd = auth.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pwd,
        is_active=False,
        verification_code=codigo,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Delegar envío de correo al background
    background_tasks.add_task(send_verification_email, new_user.email, codigo)
    log_event(
        db, "INFO", "Nuevo usuario registrado (Pendiente Verificación)", user.email
    )

    return new_user


# --- 3. NUEVO ENDPOINT DE VERIFICACIÓN ---
class VerifyAccountRequest(BaseModel):
    email: EmailStr
    code: str


@router.post("/verify")
def verify_user_account(
    request: VerifyAccountRequest, db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.is_active:
        return {"message": "La cuenta ya se encuentra activa."}

    if not user.verification_code or user.verification_code != request.code:
        raise HTTPException(status_code=400, detail="Código de verificación inválido.")

    # Activar cuenta y limpiar el rastro del código
    user.is_active = True
    user.verification_code = None
    db.commit()

    log_event(db, "INFO", "Cuenta verificada exitosamente", user.email)
    return {"message": "Cuenta verificada exitosamente."}


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


@router.post("/me/avatar", response_model=schemas.UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # A random suffix prevents users from overwriting previous avatar files.
    filename = file.filename or ""
    if "." not in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")
    file_extension = filename.rsplit(".", 1)[-1]
    file_name = f"user_{current_user.id}_{secrets.token_hex(4)}.{file_extension}"
    file_path = f"static/avatars/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # The database stores the public relative path served by StaticFiles.
    avatar_url = f"/static/avatars/{file_name}"
    current_user.profile_picture = avatar_url
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


@router.put("/{user_id}", response_model=schemas.UserOut)
def admin_update_user(
    user_id: int,
    user_data: schemas.UserUpdate,  # Consider creating an AdminUserUpdate schema if roles will be changed
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    """Allow an administrator to modify a user's editable fields.

    This endpoint applies partial updates from `user_data` to the target user
    and records an audit log entry describing the change.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Manejar campos específicos (ej. rol) si los agregas a un schema de actualización administrativa
    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    log_event(db, "WARN", f"Administrador modificó la cuenta ID:{user_id}", admin.email)
    return db_user


@router.patch("/{user_id}/status")
def admin_toggle_user_status(
    user_id: int,
    status_data: UserStatusUpdate,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    """Toggle the active/suspended state of a user account.

    This endpoint prevents administrators from changing their own status
    and commits the new `is_active` state to the database with an audit
    log entry recording the administrative action.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if db_user.id == admin.id:
        raise HTTPException(
            status_code=400, detail="No puedes alterar tu propio estado"
        )

    db_user.is_active = status_data.is_active
    db.commit()

    accion = "Activación" if status_data.is_active else "Suspensión"
    log_event(
        db,
        "WARN",
        f"{accion} administrativa aplicada a la cuenta ID:{user_id}",
        admin.email,
    )
    return {
        "status": "ok",
        "message": f"Estado actualizado a {'Activo' if status_data.is_active else 'Suspendido'}",
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    """Permanently delete a user from the database.

    The operation enforces that administrators cannot delete their own
    account and records an `ERROR` level audit log describing who was deleted.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if db_user.id == admin.id:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propia cuenta de administrador",
        )

    email_borrado = db_user.email
    db.delete(
        db_user
    )  # Esto activará el borrado en cascada de FavoriteCity gracias a la configuración de FK
    db.commit()

    log_event(
        db, "ERROR", f"Cuenta eliminada permanentemente: {email_borrado}", admin.email
    )
    return None


@router.post("/me/push-token")
def update_push_token(
    token_data: PushTokenUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    current_user.expo_push_token = token_data.token
    db.commit()
    return {"status": "ok", "message": "Token de notificaciones actualizado"}


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


@router.get("/users-distribution")
def get_users_distribution(
    db: Session = Depends(database.get_db),
    admin: models.User = Depends(auth.get_current_admin),
):
    # Distinct user counts keep the chart from overcounting repeated favorites.
    distribution = (
        db.query(
            models.FavoriteCity.city_name.label("name"),
            func.count(func.distinct(models.FavoriteCity.user_id)).label("value"),
        )
        .group_by(models.FavoriteCity.city_name)
        .order_by(func.count(func.distinct(models.FavoriteCity.user_id)).desc())
        .limit(6)
        .all()
    )

    return [{"name": d.name, "value": d.value} for d in distribution]


@router.post("/forgot-password")
def forgot_password(
    request: schemas.PasswordRecoveryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == request.email).first()

    # Por seguridad, no revelamos si el correo existe o no en la base de datos
    if not user:
        return {
            "message": "Si el correo está registrado, recibirás un código de recuperación."
        }

    # Generar un código alfanumérico seguro de 6 caracteres
    caracteres = string.ascii_uppercase + string.digits
    codigo = "".join(secrets.choice(caracteres) for _ in range(6))

    # Guardar el token y su expiración (15 minutos) en la base de datos
    user.reset_password_token = codigo
    user.reset_password_expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()

    # Delegar el envío del correo a una tarea de fondo para no bloquear la respuesta HTTP
    background_tasks.add_task(send_reset_password_email, user.email, codigo)

    # Registrar en el log de auditoría
    log_event(
        db, "INFO", "Solicitud de recuperación de contraseña generada", user.email
    )

    return {
        "message": "Si el correo está registrado, recibirás un código de recuperación."
    }


@router.post("/reset-password")
def reset_password(
    request: schemas.PasswordResetConfirm, db: Session = Depends(database.get_db)
):
    user = db.query(models.User).filter(models.User.email == request.email).first()

    if not user:
        raise HTTPException(status_code=400, detail="Código inválido o expirado.")

    # Verificar que el token coincida y no sea nulo
    if not user.reset_password_token or user.reset_password_token != request.token:
        raise HTTPException(status_code=400, detail="Código inválido o expirado.")

    # Verificar si el token ya expiró
    # Aseguramos que la comparación de fechas tenga consciencia de la zona horaria (timezone-aware)
    fecha_actual = datetime.now(timezone.utc)
    if user.reset_password_expires is None:
        raise HTTPException(
            status_code=400, detail="El código ha expirado. Solicita uno nuevo."
        )

    if user.reset_password_expires.tzinfo is None:
        # Si la BD devuelve timezone-naive, la forzamos a UTC
        user.reset_password_expires = user.reset_password_expires.replace(
            tzinfo=timezone.utc
        )

    if fecha_actual > user.reset_password_expires:
        raise HTTPException(
            status_code=400, detail="El código ha expirado. Solicita uno nuevo."
        )

    # Hashear la nueva contraseña y limpiar los campos de recuperación
    user.hashed_password = auth.get_password_hash(request.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    db.commit()

    log_event(
        db, "AUTH", "Contraseña restablecida exitosamente mediante código", user.email
    )

    return {"message": "Tu contraseña ha sido actualizada correctamente."}
