import { db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function saveFcmToken(uid, token) {
  if (!uid || !token) return;
  // Doc-id = token gør det nemt at lave collectionGroup('tokens') i backend
  const ref = doc(db, `users/${uid}/tokens/${token}`);
  await setDoc(
    ref,
    {
      token,
      updatedAt: serverTimestamp(),
      ua: navigator.userAgent,
    },
    { merge: true }
  );
}
