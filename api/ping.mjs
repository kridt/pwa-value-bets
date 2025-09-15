// api/ping.mjs
// Ping ét FCM-token. Robust init af Firebase Admin + tydelig debug.
// Understøtter FIREBASE_SERVICE_ACCOUNT_BASE64 (hele JSON), PRIVATE_KEY_BASE64 eller klassisk PEM.

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

function normalize(credsRaw) {
  if (!credsRaw || typeof credsRaw !== "object") return null;
  const projectId = credsRaw.projectId || credsRaw.project_id;
  const clientEmail = credsRaw.clientEmail || credsRaw.client_email;
  let privateKey = credsRaw.privateKey || credsRaw.private_key;
  if (typeof privateKey === "string" && privateKey.includes("\\n"))
    privateKey = privateKey.replace(/\\n/g, "\n");
  return { projectId, clientEmail, privateKey };
}

function loadServiceAccount() {
  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (svcB64) {
    const jsonStr = Buffer.from(svcB64, "base64").toString("utf8");
    let raw;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid JSON");
    }
    const creds = normalize(raw);
    return { from: "serviceAccountBase64", creds };
  }

  const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (pkB64) {
    const pem = Buffer.from(pkB64, "base64").toString("utf8");
    const creds = normalize({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: pem,
    });
    return { from: "pkBase64", creds };
  }

  const pem = process.env.FIREBASE_PRIVATE_KEY;
  const creds = normalize({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: pem,
  });
  return { from: "pkPem", creds };
}

let INIT = null;
function initAdmin() {
  if (admin.apps.length) return INIT;

  const { from, creds } = loadServiceAccount();
  const missing = [];
  if (!creds?.projectId) missing.push("projectId");
  if (!creds?.clientEmail) missing.push("clientEmail");
  if (!creds?.privateKey) missing.push("privateKey");
  if (missing.length)
    throw new Error(
      `Missing Firebase admin values (${from}): ${missing.join(", ")}`
    );

  const pk = String(creds.privateKey)
    .replace(/^\uFEFF/, "")
    .replace(/\\n/g, "\n")
    .trim();
  if (
    !/^-----BEGIN PRIVATE KEY-----/.test(pk) ||
    !pk.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error("Private key is not a valid PEM block");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: pk,
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
    const code = e?.errorInfo?.code || e?.code || null;
    const details = e?.errorInfo || null;
    const msg = e?.message || String(e);
    const initInfo = INIT;
    err("PING FAILED", { code, msg, details, initInfo });
    return res
      .status(500)
      .json({ ok: false, error: msg, code, details, debug: { initInfo } });
  }
}
