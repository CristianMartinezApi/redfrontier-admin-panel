var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var MP_API_BASE = "https://api.mercadopago.com/v1";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var FIRESTORE_BASE = "https://firestore.googleapis.com/v1";
var textEncoder = new TextEncoder();
var jsonResponse = /* @__PURE__ */ __name((status, body) => new Response(JSON.stringify(body, null, 2), {
  status,
  headers: { "content-type": "application/json" }
}), "jsonResponse");
var base64UrlEncode = /* @__PURE__ */ __name((input) => {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : input;
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}, "base64UrlEncode");
var pemToArrayBuffer = /* @__PURE__ */ __name((pem) => {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const raw = atob(clean);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer.buffer;
}, "pemToArrayBuffer");
var signJwt = /* @__PURE__ */ __name(async (payload, privateKeyPem) => {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const body = {
    iat: now,
    exp: now + 3600,
    ...payload
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(body)
  )}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKeyPem),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textEncoder.encode(unsignedToken)
  );
  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;
}, "signJwt");
var getGoogleAccessToken = /* @__PURE__ */ __name(async (env) => {
  const jwt = await signJwt(
    {
      iss: env.FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: GOOGLE_TOKEN_URL
    },
    env.FIREBASE_PRIVATE_KEY
  );
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token error: ${errorText}`);
  }
  const data = await response.json();
  return data.access_token;
}, "getGoogleAccessToken");
var buildFirestorePayload = /* @__PURE__ */ __name((payment, source) => {
  const createdAt = payment.date_approved || payment.date_created || (/* @__PURE__ */ new Date()).toISOString();
  return {
    fields: {
      amount: { doubleValue: Number(payment.transaction_amount || 0) },
      source: { stringValue: source },
      description: {
        stringValue: payment.description || "Pagamento Mercado Pago"
      },
      reference: { stringValue: payment.external_reference || "" },
      mpPaymentId: { stringValue: String(payment.id) },
      mpStatus: { stringValue: payment.status || "" },
      payerEmail: { stringValue: payment.payer?.email || "" },
      createdAt: { timestampValue: createdAt }
    }
  };
}, "buildFirestorePayload");
var writeFinanceEntry = /* @__PURE__ */ __name(async (env, accessToken, payment, source) => {
  const url = `${FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/financeEntries`;
  const payload = buildFirestorePayload(payment, source);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore write error: ${errorText}`);
  }
}, "writeFinanceEntry");
var getPaymentIdFromWebhook = /* @__PURE__ */ __name((body, url) => {
  if (body?.data?.id) {
    return body.data.id;
  }
  if (body?.id) {
    return body.id;
  }
  const urlId = new URL(url).searchParams.get("id");
  return urlId || null;
}, "getPaymentIdFromWebhook");
var worker_default = {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }
    if (!env.MP_ACCESS_TOKEN) {
      return jsonResponse(500, { error: "Missing MP_ACCESS_TOKEN" });
    }
    if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
      return jsonResponse(500, {
        error: "Missing Firebase service account env vars"
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
          "content-type": "application/json"
        }
      }
    );
    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      return jsonResponse(502, {
        error: "Mercado Pago fetch failed",
        detail: errorText
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
  }
};

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-p0D0AW/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-p0D0AW/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
