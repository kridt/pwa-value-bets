// api/notify-all.js
// Serverless endpoint på Vercel, sender test-notifikation til alle tokens.
// Kræver Authorization: Bearer <Firebase ID token> fra klienten.
// Tjekker at kaldende bruger er admin (admins/{uid} findes).

const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase admin env vars");
  }
  // Support \n in env
  privateKey = privateKey.replace(/\\n/g, "\n");
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

async function isAdmin(uid) {
  const db = admin.firestore();
  const ref = db.collection("admins").doc(uid);
  const snap = await ref.get();
  return snap.exists;
}

function buildPayload({ title, body, url }) {
  const t = title || "VPP — Test";
  const b = body || "Hvis du modtager denne, virker broadcast.";
  const u = url || "/";
  const data = {
    title: t,
    body: b,
    icon: "/icons/icon-192.png",
    url: u,
    kind: "broadcast",
  };
  return {
    data,
    webpush: {
      notification: { title: t, body: b, icon: "/icons/icon-192.png" },
      fcmOptions: { link: u },
      headers: { Urgency: "high" },
    },
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    initAdmin();

    // Verify ID token
    const auth = req.headers.authorization || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m)
      return res.status(401).json({ error: "Missing Authorization header" });
    const idToken = m[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Check admin
    if (!(await isAdmin(uid)))
      return res.status(403).json({ error: "Not an admin" });

    const db = admin.firestore();
    const messaging = admin.messaging();

    // Get all tokens
    const snap = await db.collectionGroup("tokens").get();
    const tokenRefs = snap.docs
      .map((d) => ({ token: d.id, ref: d.ref }))
      .filter((t) => t.token);
    const tokens = tokenRefs.map((t) => t.token);
    const payload = buildPayload(req.body || {});

    if (tokens.length === 0) {
      return res
        .status(200)
        .json({ sent: 0, success: 0, fail: 0, note: "no tokens" });
    }

    let success = 0,
      fail = 0;
    for (const batch of chunk(tokens, 500)) {
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        data: payload.data,
        webpush: payload.webpush,
      });
      success += result.successCount;
      fail += result.failureCount;

      // Clean invalid tokens
      await Promise.all(
        result.responses.map(async (r, idx) => {
          if (!r.success) {
            const code = r.error?.code || r.error?.errorInfo?.code || "unknown";
            if (
              code.includes("registration-token-not-registered") ||
              code.includes("invalid-registration-token")
            ) {
              try {
                await tokenRefs
                  .find((t) => t.token === batch[idx])
                  ?.ref.delete();
              } catch {}
            }
          }
        })
      );
    }

    return res.status(200).json({ sent: tokens.length, success, fail });
  } catch (e) {
    console.error("notify-all error", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
};
