// api/ping.mjs
// Pinger ét FCM-token. Robust Firebase Admin init + sikker body-parse + klare fejl.

import admin from "firebase-admin";

function log(...a) {
  console.log("[PING]", ...a);
}
function err(...a) {
  console.error("[PING]", ...a);
}

// Robust init:
// 1) FIREBASE_SERVICE_ACCOUNT_BASE64  (hele service-account JSON som base64)  ← anbefalet
// 2) FIREBASE_PRIVATE_KEY_BASE64 + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID
// 3) FIREBASE_PRIVATE_KEY (+ evt. \n) + FIREBASE_CLIENT_EMAIL + FIREBASE_PROJECT_ID
function initAdmin() {
  if (admin.apps.length) return;

  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  let pkPem = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (svcB64) {
    const jsonStr = Buffer.from(svcB64, "base64").toString("utf8");
    let creds;
    try {
      creds = JSON.parse(jsonStr);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid JSON");
    }
    if (!creds.private_key?.includes("BEGIN PRIVATE KEY")) {
      throw new Error("Decoded service account JSON has no private_key PEM");
    }
    admin.initializeApp({ credential: admin.credential.cert(creds) });
    log("Admin initialized via FIREBASE_SERVICE_ACCOUNT_BASE64");
    return;
  }

  if (pkB64) {
    if (!projectId || !clientEmail) {
      throw new Error(
        "Need FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL with FIREBASE_PRIVATE_KEY_BASE64"
      );
    }
    const pem = Buffer.from(pkB64, "base64").toString("utf8").trim();
    if (!pem.startsWith("-----BEGIN PRIVATE KEY-----"))
      throw new Error("Decoded FIREBASE_PRIVATE_KEY_BASE64 lacks PEM header");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: pem,
      }),
    });
    log("Admin initialized via FIREBASE_PRIVATE_KEY_BASE64");
    return;
  }

  // Classic PEM i env (multilinje eller \n)
  const missing = [];
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!pkPem) missing.push("FIREBASE_PRIVATE_KEY");
  if (missing.length)
    throw new Error("Missing Firebase admin env vars: " + missing.join(", "));

  if (pkPem.includes("\\n")) pkPem = pkPem.replace(/\\n/g, "\n");
  pkPem = pkPem.trim();
  if (
    !pkPem.startsWith("-----BEGIN PRIVATE KEY-----") ||
    !pkPem.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error("FIREBASE_PRIVATE_KEY is not a valid PEM block");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: pkPem,
    }),
  });
  log("Admin initialized via FIREBASE_PRIVATE_KEY (PEM)");
}

// Sikker body-parse (uden req.json)
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const bufs = [];
  for await (const chunk of req) bufs.push(chunk);
  const raw = Buffer.concat(bufs).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const started = Date.now();
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    initAdmin();

    const { token, title, body, url } = await readJson(req);
    if (!token || typeof token !== "string") {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    const nTitle = title || "VPP — Ping";
    const nBody = body || "Direkte ping til din enhed";
    const nUrl = url || "/";

    const payload = {
      token,
      data: {
        title: nTitle,
        body: nBody,
        icon: "/icons/icon-192.png",
        url: nUrl,
        kind: "ping",
      },
      webpush: {
        notification: {
          title: nTitle,
          body: nBody,
          icon: "/icons/icon-192.png",
        },
        fcmOptions: { link: nUrl },
        headers: { Urgency: "high" },
      },
    };

    const messageId = await admin.messaging().send(payload);

    return res.status(200).json({
      ok: true,
      messageId,
      debug: {
        durationMs: Date.now() - started,
        tokenPreview: token.slice(0, 8) + "…" + token.slice(-4),
        used: {
          svcJsonB64: !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          pkB64: !!process.env.FIREBASE_PRIVATE_KEY_BASE64,
          pkPem: !!process.env.FIREBASE_PRIVATE_KEY,
        },
      },
    });
  } catch (e) {
    err("Ping failed:", e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
