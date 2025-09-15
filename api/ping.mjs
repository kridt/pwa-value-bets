// api/ping.mjs
// Sender en test-push til ét FCM token.
// Viser detaljeret debug: hvilken credential sti, hvilket projectId, og FCM-fejlkode.

import admin from "firebase-admin";

function j(o) {
  try {
    return JSON.stringify(o);
  } catch {
    return String(o);
  }
}
function log(...a) {
  console.log("[PING]", ...a);
}
function err(...a) {
  console.error("[PING]", ...a);
}

// Læs service account på en robust måde.
// PRIORITET: FIREBASE_SERVICE_ACCOUNT_BASE64  →  pkBase64  →  klassisk PEM + proj/email
function loadServiceAccount() {
  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (svcB64) {
    const jsonStr = Buffer.from(svcB64, "base64").toString("utf8");
    const creds = JSON.parse(jsonStr);
    return { from: "serviceAccountBase64", creds };
  }

  const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (pkB64) {
    const pem = Buffer.from(pkB64, "base64")
      .toString("utf8")
      .replace(/\\n/g, "\n")
      .trim();
    return {
      from: "pkBase64",
      creds: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pem,
      },
    };
  }

  const pem = (process.env.FIREBASE_PRIVATE_KEY || "")
    .replace(/\\n/g, "\n")
    .trim();
  return {
    from: "pkPem",
    creds: {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: pem,
    },
  };
}

let INIT = null;
function initAdmin() {
  if (admin.apps.length) return INIT;
  const { from, creds } = loadServiceAccount();

  const missing = [];
  if (!creds?.privateKey) missing.push("privateKey");
  if (!creds?.clientEmail) missing.push("clientEmail");
  if (!creds?.projectId) missing.push("projectId");
  if (missing.length) {
    const m = `Missing Firebase admin values (${from}): ` + missing.join(", ");
    throw new Error(m);
  }

  if (
    !/^-----BEGIN PRIVATE KEY-----/.test(creds.privateKey) ||
    !creds.privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error("Private key is not a valid PEM block");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: creds.privateKey,
    }),
  });

  INIT = { from, projectId: creds.projectId };
  log("Admin initialized →", INIT);
  return INIT;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const bufs = [];
  for await (const c of req) bufs.push(c);
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
    if (req.method !== "POST")
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    const initInfo = initAdmin();

    const body = await readJson(req);
    const token = body?.token;
    const nTitle = body?.title || "VPP — Ping";
    const nBody = body?.body || "Direkte ping til din enhed";
    const nUrl = body?.url || "/";

    if (!token || typeof token !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "Missing token", debug: { initInfo } });
    }

    // Minimal payload for webpush
    const message = {
      token,
      webpush: {
        notification: {
          title: nTitle,
          body: nBody,
          icon: "/icons/icon-192.png",
        },
        fcmOptions: { link: nUrl },
        headers: { Urgency: "high" },
      },
      data: {
        title: nTitle,
        body: nBody,
        url: nUrl,
        icon: "/icons/icon-192.png",
        kind: "ping",
      },
    };

    log(
      "Sending to token=",
      token.slice(0, 10) + "…",
      "projectId=",
      initInfo.projectId
    );
    const messageId = await admin.messaging().send(message);

    return res.status(200).json({
      ok: true,
      messageId,
      debug: {
        initInfo,
        durationMs: Date.now() - started,
        tokenPreview: token.slice(0, 8) + "…" + token.slice(-4),
      },
    });
  } catch (e) {
    // Træk mest muligt ud af Firebase-fejl
    const code = e?.errorInfo?.code || e?.code || null;
    const details = e?.errorInfo || null;
    const msg = e?.message || String(e);
    const initInfo = INIT;

    err("PING FAILED", { code, msg, details, initInfo });
    return res.status(500).json({
      ok: false,
      error: msg,
      code,
      details,
      debug: { initInfo },
    });
  }
}
