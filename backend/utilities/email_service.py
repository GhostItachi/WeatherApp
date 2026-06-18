import smtplib
from email.message import EmailMessage
import os

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "olmmiguel314@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "twvh ridh ztyv fvdz")
SMTP_FROM = os.getenv("SMTP_FROM", f"WeatherApp Soporte <{SMTP_USER}>")


def send_reset_password_email(email_destinatario: str, codigo: str):
    if not SMTP_USER or not SMTP_PASS:
        print("ERROR: Credenciales SMTP no configuradas.")
        return

    msg = EmailMessage()

    msg["Subject"] = "WeatherApp - Recupera tu contraseña"
    msg["From"] = SMTP_FROM
    msg["To"] = email_destinatario

    contenido_html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">WeatherApp</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <h3 style="color: #0f172a; margin-top: 0;">Recuperación de contraseña</h3>
            <p style="color: #475569; font-size: 15px;">Hemos recibido una solicitud para restablecer tu contraseña. Tu código de recuperación es:</p>
            
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center; margin: 25px 0;">
                {codigo}
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">Este código expira en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
        </div>
    </div>
    """

    msg.set_content(f"Tu código de recuperación es: {codigo}. Expira en 15 minutos.")
    msg.add_alternative(contenido_html, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)

            # CRÍTICO: Usa send_message para que EmailMessage compile los bytes serializados en UTF-8
            server.send_message(msg)
            print(f"Correo de recuperación enviado exitosamente a {email_destinatario}")
    except Exception as e:
        print(f"Error SMTP al enviar correo a {email_destinatario}: {e}")


def send_verification_email(email_destinatario: str, codigo: str):
    if not SMTP_USER or not SMTP_PASS:
        return

    msg = EmailMessage()
    msg["Subject"] = "WeatherApp - Confirma tu registro"
    msg["From"] = SMTP_FROM
    msg["To"] = email_destinatario

    contenido_html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">¡Bienvenido a WeatherApp!</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="color: #475569; font-size: 15px;">Para activar tu cuenta y empezar a consultar el clima, ingresa el siguiente código de confirmación en la aplicación:</p>
            
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; padding: 20px; background: #f1f5f9; border-radius: 8px; text-align: center; margin: 25px 0;">
                {codigo}
            </div>
        </div>
    </div>
    """

    msg.set_content(f"Tu código de activación es: {codigo}")
    msg.add_alternative(contenido_html, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=8) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            print(f"Correo de verificación enviado a {email_destinatario}")
    except Exception as e:
        print(f"Error SMTP: {e}")
