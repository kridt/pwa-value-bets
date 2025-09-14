import { useEffect, useState } from "react";
import { countdownParts } from "../lib/time";

export default function useCountdown(dateObj) {
  const [parts, setParts] = useState(() => countdownParts(dateObj));
  useEffect(() => {
    if (!dateObj) return;
    setParts(countdownParts(dateObj));
    const id = setInterval(() => setParts(countdownParts(dateObj)), 1000);
    return () => clearInterval(id);
  }, [dateObj?.getTime?.() || dateObj]);
  return parts;
}
