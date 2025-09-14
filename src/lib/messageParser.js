import { parseGameTime } from "./time";

const unstar = (s) => s?.replace(/\*/g, "").trim();

const num = (s) => {
  if (!s) return null;
  const n = String(s)
    .replace(",", ".")
    .match(/-?\d+(\.\d+)?/);
  return n ? parseFloat(n[0]) : null;
};

function grab(label, text) {
  // matcher både "Label:* værdi*" og "*Label*: værdi" og uden stjerner
  const re = new RegExp(
    `(?:\\*?${label}\\*?)[\\s]*[:=][\\s]*\\*?([^\\*\\n]+)\\*?`,
    "i"
  );
  const m = text.match(re);
  return m ? unstar(m[1]) : null;
}

export function parseBetMessage(message) {
  if (!message) return {};

  const event = grab("Kamp", message) || grab("Match", message);
  const league = grab("Liga", message) || grab("League", message);
  const gameTimeText = grab("Spilletid", message) || grab("KO", message);
  const selection = grab("Kampvinder", message) || grab("Pick", message);
  const ev = num(grab("EV", message));
  const fairOdds = num(grab("Fair odds", message));
  const offerOdds = num(grab("Tilbudt odds", message) || grab("Odds", message));
  const bookmaker = grab("Bookmaker", message);
  const lastUpdated = grab("Sidst opdateret", message);

  const linkMatch = message.match(/\[Link til odds\]\(([^)]+)\)/i);
  const link = linkMatch ? linkMatch[1] : null;

  const kickoffDate = gameTimeText ? parseGameTime(gameTimeText) : null;

  return {
    event,
    league,
    gameTimeText,
    kickoffDate,
    selection,
    ev,
    fairOdds,
    offerOdds,
    bookmaker,
    link,
    lastUpdated,
  };
}
