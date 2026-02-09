# Mercado Pago Webhook (Cloudflare Workers)

Este Worker recebe webhooks do Mercado Pago e grava entradas no Firestore.

## Variaveis de ambiente (Secrets)

Configure estes secrets no Cloudflare:

- MP_ACCESS_TOKEN
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

Dica: no Cloudflare, cole o private key exatamente como no JSON (com as quebras de linha `\n`).

## Deploy basico

1. Instale o Wrangler (se precisar):
   - https://developers.cloudflare.com/workers/wrangler/install-and-update/

2. Entre no diretorio:
   - `cd mp-webhook-worker`

3. Configure secrets:
   - `wrangler secret put MP_ACCESS_TOKEN`
   - `wrangler secret put FIREBASE_PROJECT_ID`
   - `wrangler secret put FIREBASE_CLIENT_EMAIL`
   - `wrangler secret put FIREBASE_PRIVATE_KEY`

4. Deploy:
   - `wrangler deploy`

## Mercado Pago

Configure o webhook para apontar para a URL do Worker.

Este Worker processa apenas eventos `payment` e grava somente pagamentos `approved`.

## Firestore

Os pagamentos sao gravados na colecao `financeEntries`.
