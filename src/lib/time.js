// Parser "hh:mm dd.mm.yyyy" ELLER "hh.mm dd.mm.yyyy" -> Date (lokal tid)
export function parseGameTime(text) {
  if (!text || typeof text !== "string") return null;

  // Normaliser "21.00 26.08.2025" => "21:00 26.08.2025"
  const norm = text
    .trim()
    .replace(/^(\d{1,2})\.(\d{2})/, (_, h, m) => `${h}:${m}`);

  const m = norm.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, hh, mm, dd, mo, yyyy] = m;
  return new Date(
    Number(yyyy),
    Number(mo) - 1,
    Number(dd),
    Number(hh),
    Number(mm),
    0,
    0
  );
}

export function countdownParts(targetDate) {
  if (!targetDate) return { totalMs: -1, d: 0, h: 0, m: 0, s: 0 };
  const now = new Date();
  const totalMs = targetDate - now;
  const t = Math.max(0, totalMs);
  const s = Math.floor(t / 1000) % 60;
  const m = Math.floor(t / 60000) % 60;
  const h = Math.floor(t / 3600000) % 24;
  const d = Math.floor(t / 86400000);
  return { totalMs, d, h, m, s };
}

export function formatCountdown({ d, h, m, s }) {
  const pad = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
