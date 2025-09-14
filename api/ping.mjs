// api/ping.mjs
import admin from "firebase-admin";

function initAdmin() {
  if (admin.apps.length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey)
    throw new Error("Missing Firebase admin env vars");
  privateKey = privateKey.replace(/\\n/g, "\n");
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method not allowed" });
    initAdmin();

    const { token, title, body, url } = (await req.json?.()) || req.body || {};
    if (!token) return res.status(400).json({ error: "Missing token" });

    const payload = {
      data: {
        title: title || "VPP — Ping",
        body: body || "Direkte ping til dit token",
        icon: "/icons/icon-192.png",
        url: url || "/",
      },
      webpush: {
        notification: {
          title: title || "VPP — Ping",
          body: body || "Direkte ping til dit token",
          icon: "/icons/icon-192.png",
        },
        fcmOptions: { link: url || "/" },
        headers: { Urgency: "high" },
      },
      token,
    };

    const resp = await admin.messaging().send(payload);
    return res.status(200).json({ ok: true, messageId: resp });
  } catch (e) {
    console.error("ping error", e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
