import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Caminho para o arquivo JSON da service account
cred = credentials.Certificate('caminho/para/service-account.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

def enviar_log(steam_id, nick, evento, data, origem="log_bot"):
    doc = {
        "steamId": steam_id,
        "nick": nick,
        "evento": evento,
        "data": data,
        "origem": origem
    }
    db.collection("playerLogs").add(doc)
    print(f"Log enviado: {doc}")

# Exemplo de uso:
if __name__ == "__main__":
    steam_id = "76561198333543989"
    nick = "Shadowbolt"
    evento = "login"
    data = datetime.now().isoformat()
    enviar_log(steam_id, nick, evento, data)
