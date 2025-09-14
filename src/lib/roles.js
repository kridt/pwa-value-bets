export const ADMIN_UID = import.meta.env.VITE_ADMIN_UID || "";
export const isAdminUid = (uid) => !!uid && uid === ADMIN_UID;
