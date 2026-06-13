from exponent_server_sdk import PushClient, PushMessage

def enviar_notificacion_prueba():
    token = "ExponentPushToken[xLJXu2CjTIxG7geocBetQO]"
    
    client = PushClient()
    message = PushMessage(
        to=token,
        title="¡Funciona! 🌤️",
        body="Esta es una prueba de notificación desde tu propio backend hacia tu app personalizada.",
        data={"tipo": "prueba"},
        sound="default",
        ttl=None,
        expiration=None,
        priority="default",
        badge=None,
        category=None,
        display_in_foreground=True,
        channel_id=None,
        subtitle=None,
        mutable_content=False
    )
    
    try:
        response = client.publish(message)
        print("✅ Notificación enviada:", response)
    except Exception as e:
        print("❌ Error:", e)

if __name__ == "__main__":
    enviar_notificacion_prueba()