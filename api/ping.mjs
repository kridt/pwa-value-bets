// api/ping.mjs
// Sender én push til et angivet FCM token.
// Masser af DEBUG-logs (i Vercel logs og i respons), men uden at udskrive hemmelige værdier.

import admin from "firebase-admin";

// ─────────────────────────────────────────────────────────────
// DEBUG helpers
// ─────────────────────────────────────────────────────────────
function log(...args) {
  console.log("[PING]", ...args);
}
function warn(...args) {
  console.warn("[PING]", ...args);
}
function err(...args) {
  console.error("[PING]", ...args);
}

function envPresence() {
  return {
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
  };
}

// Node functions på Vercel giver ofte req.body, men vi håndterer fallback.
async function readJsonBody(req) {
  if (req.body) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sanitizeToken(tok) {
  if (!tok) return null;
  if (tok.length <= 12) return tok;
  return `${tok.slice(0, 8)}…${tok.slice(-4)}`;
}

// ─────────────────────────────────────────────────────────────
// Firebase Admin init med tydelig debug
// ─────────────────────────────────────────────────────────────
function initAdmin() {
  if (admin.apps.length) {
    log("Admin SDK already initialized");
    return;
  }

  const envOk = envPresence();
  log("Env presence:", envOk);

  const missing = Object.entries(envOk)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    const msg = "Missing Firebase admin env vars: " + missing.join(", ");
    warn(msg);
    throw new Error(msg);
  }

  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  // Support til \n i env
  if (privateKey && privateKey.includes("\\n"))
    privateKey = privateKey.replace(/\\n/g, "\n");

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  log(
    "Initializing Admin SDK for project:",
    projectId,
    "clientEmail present:",
    !!clientEmail,
    "pk length:",
    privateKey?.length ?? 0
  );

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  log("Admin SDK initialized OK");
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const started = Date.now();
  const debug = {
    at: new Date().toISOString(),
    method: req.method,
    url: req.url,
    contentType: req.headers["content-type"] || null,
    envPresence: envPresence(),
  };

  try {
    if (req.method !== "POST") {
      debug.note = "Only POST is allowed";
      log("Reject non-POST", debug);
      res.status(405).json({ ok: false, error: "Method not allowed", debug });
      return;
    }

    initAdmin();

    const body = await readJsonBody(req);
    const token = body?.token;
    const title = body?.title || "VPP — Ping";
    const bodyText = body?.body || "Direkte ping til dit token";
    const url = body?.url || "/";

    debug.bodyPresent = !!body;
    debug.tokenPreview = sanitizeToken(token);
    debug.title = title;
    debug.url = url;

    if (!token) {
      debug.note = 'Missing "token" in JSON body';
      warn("Missing token", debug);
      res.status(400).json({ ok: false, error: "Missing token", debug });
      return;
    }

    const payload = {
      token,
      data: {
        title,
        body: bodyText,
        icon: "/icons/icon-192.png",
        url,
        kind: "ping",
      },
      webpush: {
        notification: { title, body: bodyText, icon: "/icons/icon-192.png" },
        fcmOptions: { link: url },
        headers: { Urgency: "high" },
      },
    };

    log("Sending message to token", sanitizeToken(token));
    const messageId = await admin.messaging().send(payload);
    debug.durationMs = Date.now() - started;
    log("Sent OK", { messageId, durationMs: debug.durationMs });

    res.status(200).json({ ok: true, messageId, debug });
  } catch (e) {
    debug.durationMs = Date.now() - started;
    debug.errorName = e?.name || null;
    debug.errorMessage = e?.message || String(e);
    err("Send FAILED", debug);
    res.status(500).json({ ok: false, error: debug.errorMessage, debug });
  }
}
