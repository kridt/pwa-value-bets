// api/validate-token.mjs
import admin from "firebase-admin";

// — samme robuste init som i ping.mjs —
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
    const creds = normalize(
      JSON.parse(Buffer.from(svcB64, "base64").toString("utf8"))
    );
    return { from: "serviceAccountBase64", creds };
  }
  const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
  if (pkB64) {
    const pem = Buffer.from(pkB64, "base64").toString("utf8");
    return {
      from: "pkBase64",
      creds: normalize({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: pem,
      }),
    };
  }
  return {
    from: "pkPem",
    creds: normalize({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY,
    }),
  };
}
function initAdmin() {
  if (admin.apps.length) return;
  const { creds } = loadServiceAccount();
  if (!creds?.projectId || !creds?.clientEmail || !creds?.privateKey) {
    throw new Error("Missing Firebase admin creds for validate-token");
  }
  const pk = String(creds.privateKey).replace(/\\n/g, "\n").trim();
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      privateKey: pk,
    }),
  });
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
  try {
    if (req.method !== "POST")
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    initAdmin();

    const { token } = await readJson(req);
    if (!token)
      return res.status(400).json({ ok: false, error: "Missing token" });

    // dryRun = true → valider uden at levere
    const message = { token, webpush: { notification: { title: "validate" } } };
    const id = await admin.messaging().send(message, /* dryRun */ true);

    return res.status(200).json({ ok: true, dryRunId: id });
  } catch (e) {
    const code = e?.errorInfo?.code || e?.code || null;
    const details = e?.errorInfo || null;
    return res
      .status(200)
      .json({ ok: false, error: e.message || String(e), code, details });
  }
}
