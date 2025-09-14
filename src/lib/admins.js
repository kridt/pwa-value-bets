// src/lib/admins.js
// Hardcodet liste over admins (tilføj flere UID's her)
export const ADMIN_UIDS = [
  "Lti6KwrPgRfBbThv11PKLZIk8CV2",
  // 'ANDET_UID_HER',
  // 'EN_MERE_HER'
];

export const isAdminUid = (uid) => !!uid && ADMIN_UIDS.includes(uid);
