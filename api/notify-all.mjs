// api/notify-all.mjs
import admin from "firebase-admin";

// Hardcodede admins
const ADMIN_UIDS = ["Lti6KwrPgRfBbThv11PKLZIk8CV2"];
const DELETE_DUPLICATE_TOKEN_DOCS =
  process.env.DELETE_DUPLICATE_TOKEN_DOCS === "1";

// ── shared init (samme robuste som i ping) ───────────────────────────────────
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
  const missing = [];
  if (!creds?.projectId) missing.push("projectId");
  if (!creds?.clientEmail) missing.push("clientEmail");
  if (!creds?.privateKey) missing.push("privateKey");
  if (missing.length)
    throw new Error(`Missing Firebase admin values: ${missing.join(", ")}`);
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
}

// ── utils ────────────────────────────────────────────────────────────────────
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
    arr.slice(i * n, i * n + n)
  );
const preview = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-4)}` : "");

// ── handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    initAdmin();

    // Admin-check via Firebase ID token
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m)
      return res.status(401).json({ error: "Missing Authorization header" });
    const decoded = await admin.auth().verifyIdToken(m[1]);
    if (!ADMIN_UIDS.includes(decoded.uid))
      return res.status(403).json({ error: "Not an admin" });

    const db = admin.firestore();
    const messaging = admin.messaging();

    // Body
    let body = {};
    if (req.body && typeof req.body === "object") body = req.body;
    else {
      const bufs = [];
      for await (const c of req) bufs.push(c);
      const raw = Buffer.concat(bufs).toString("utf8");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const title = body.title || "VPP — Broadcast";
    const text = body.body || "Ny besked fra admin";
    const url = body.url || "/";

    // Hent alle tokens (kan indeholde dubletter på tværs af brugere)
    const snap = await db.collectionGroup("tokens").get();
    const all = snap.docs
      .map((d) => ({ token: d.id, ref: d.ref }))
      .filter((t) => t.token);
    // Dedup via Map
    const map = new Map();
    for (const t of all) {
      if (!map.has(t.token)) map.set(t.token, t.ref);
    }
    const uniqueTokens = Array.from(map.keys());
    const duplicatesPruned = all.length - uniqueTokens.length;

    if (!uniqueTokens.length)
      return res
        .status(200)
        .json({ sent: 0, success: 0, fail: 0, failures: [], duplicatesPruned });

    // Payload
    const payload = {
      data: {
        title,
        body: text,
        icon: "/icons/icon-192.png",
        url,
        kind: "broadcast",
      },
      webpush: {
        notification: { title, body: text, icon: "/icons/icon-192.png" },
        fcmOptions: { link: url },
        headers: { Urgency: "high" },
      },
    };

    let success = 0,
      fail = 0;
    const failures = [];

    for (const batch of chunk(uniqueTokens, 500)) {
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        data: payload.data,
        webpush: payload.webpush,
      });
      success += result.successCount;
      fail += result.failureCount;

      await Promise.all(
        result.responses.map(async (r, idx) => {
          if (!r.success) {
            const code = r.error?.code || r.error?.errorInfo?.code || "unknown";
            const msg =
              r.error?.message ||
              r.error?.errorInfo?.message ||
              String(r.error);
            failures.push({ token: preview(batch[idx]), code, msg });

            // Fjern døde tokens
            if (
              code.includes("registration-token-not-registered") ||
              code.includes("invalid-registration-token")
            ) {
              const ref = map.get(batch[idx]);
              try {
                await ref.delete();
              } catch {}
            }
          }
        })
      );
    }

    // (Valgfrit) fjern alle ekstra dublet-dokumenter
    if (DELETE_DUPLICATE_TOKEN_DOCS && duplicatesPruned > 0) {
      const keepSet = new Set(uniqueTokens);
      const deletions = all
        .filter((t) => !keepSet.has(t.token))
        .map((t) => t.ref.delete().catch(() => {}));
      await Promise.allSettled(deletions);
    }

    return res.status(200).json({
      sent: uniqueTokens.length,
      success,
      fail,
      failures,
      duplicatesPruned,
    });
  } catch (e) {
    console.error("notify-all failed:", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
