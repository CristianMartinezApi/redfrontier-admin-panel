const MP_API_BASE = "https://api.mercadopago.com/v1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

const textEncoder = new TextEncoder();

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });

const base64UrlEncode = (input) => {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const pemToArrayBuffer = (pem) => {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(clean);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer.buffer;
};

const signJwt = async (payload, privateKeyPem) => {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    iat: now,
    exp: now + 3600,
    ...payload,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(body),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textEncoder.encode(unsignedToken),
  );

  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
};

const getGoogleAccessToken = async (env) => {
  const jwt = await signJwt(
    {
      iss: env.FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: GOOGLE_TOKEN_URL,
    },
    env.FIREBASE_PRIVATE_KEY,
  );

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token error: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
};

const buildFirestorePayload = (payment, source) => {
  const createdAt =
    payment.date_approved || payment.date_created || new Date().toISOString();
  return {
    fields: {
      amount: { doubleValue: Number(payment.transaction_amount || 0) },
      source: { stringValue: source },
      description: {
        stringValue: payment.description || "Pagamento Mercado Pago",
      },
      reference: { stringValue: payment.external_reference || "" },
      mpPaymentId: { stringValue: String(payment.id) },
      mpStatus: { stringValue: payment.status || "" },
      payerEmail: { stringValue: payment.payer?.email || "" },
      createdAt: { timestampValue: createdAt },
    },
  };
};

const writeFinanceEntry = async (env, accessToken, payment, source) => {
  const url = `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/financeEntries`;
  const payload = buildFirestorePayload(payment, source);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore write error: ${errorText}`);
  }
};

const getPaymentIdFromWebhook = (body, url) => {
  if (body?.data?.id) {
    return body.data.id;
  }
  if (body?.id) {
    return body.id;
  }
  const urlId = new URL(url).searchParams.get("id");
  return urlId || null;
};

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    if (!env.MP_ACCESS_TOKEN) {
      return jsonResponse(500, { error: "Missing MP_ACCESS_TOKEN" });
    }

    if (
      !env.FIREBASE_PROJECT_ID ||
      !env.FIREBASE_CLIENT_EMAIL ||
      !env.FIREBASE_PRIVATE_KEY
    ) {
      return jsonResponse(500, {
        error: "Missing Firebase service account env vars",
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return jsonResponse(400, { error: "Invalid JSON" });
    }

    const eventType = body?.type || body?.action || "payment";
    if (eventType !== "payment") {
      return jsonResponse(200, { status: "ignored", type: eventType });
    }

    const paymentId = getPaymentIdFromWebhook(body, request.url);
    if (!paymentId) {
      return jsonResponse(400, { error: "Missing payment id" });
    }

    const paymentResponse = await fetch(
      `${MP_API_BASE}/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
          "content-type": "application/json",
        },
      },
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      return jsonResponse(502, {
        error: "Mercado Pago fetch failed",
        detail: errorText,
      });
    }

    const payment = await paymentResponse.json();
    if (payment.status !== "approved") {
      return jsonResponse(200, { status: "ignored", mpStatus: payment.status });
    }

    try {
      const accessToken = await getGoogleAccessToken(env);
      await writeFinanceEntry(env, accessToken, payment, "loja GRABS");
    } catch (error) {
      return jsonResponse(500, { error: error.message });
    }

    return jsonResponse(200, { status: "ok" });
  },
};
