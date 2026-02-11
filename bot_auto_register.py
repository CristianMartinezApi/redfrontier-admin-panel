import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

cred = credentials.Certificate('caminho/para/service-account.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

jogadores_collection = "players"

def registrar_jogador_automatico(steam_id, nick):
    # Verifica se o SteamID já existe
    docs = db.collection(jogadores_collection).where("steamId", "==", steam_id).get()
    if docs:
        print(f"Jogador {steam_id} já cadastrado.")
        return
    # Se não existe, cadastra
    doc = {
        "steamId": steam_id,
        "nick": nick,
        "nome": nick,
        "createdAt": datetime.now().isoformat(),
        "whitelist": False,
        "banido": False
    }
    db.collection(jogadores_collection).add(doc)
    print(f"Jogador cadastrado: {doc}")

# Exemplo de uso:
if __name__ == "__main__":
    steam_id = "76561198333543989"
    nick = "Shadowbolt"
    registrar_jogador_automatico(steam_id, nick)
