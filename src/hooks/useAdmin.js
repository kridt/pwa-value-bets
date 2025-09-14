import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function useAdmin(uid) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const ref = doc(db, "admins", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setIsAdmin(snap.exists());
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub && unsub();
  }, [uid]);

  return { isAdmin, loading };
}
