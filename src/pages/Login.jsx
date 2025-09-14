import { useState } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { signInEmail, signUpEmail, resetPassword } = useAuthContext();
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = loc.state?.from?.pathname || "/";

  const [mode, setMode] = useState("signin"); // 'signin' | 'signup' | 'reset'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setInfo("");
    try {
      setBusy(true);
      if (mode === "signin") {
        await signInEmail(email, password);
        nav(redirectTo, { replace: true });
      } else if (mode === "signup") {
        if (password.length < 6)
          throw new Error("Password skal være mindst 6 tegn.");
        await signUpEmail(email, password);
        nav(redirectTo, { replace: true });
      } else if (mode === "reset") {
        await resetPassword(email);
        setInfo("Reset-email er sendt, tjek din indbakke.");
        setMode("signin");
      }
    } catch (e) {
      setErr(e.message || "Noget gik galt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh grid place-items-center bg-constellation px-6">
      <div className="glass glow-border p-6 w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center">
          {mode === "signin" && "Log ind"}
          {mode === "signup" && "Opret konto"}
          {mode === "reset" && "Glemt adgangskode"}
        </h2>
        <p className="text-sm text-mute mt-1 text-center">
          Value Profits Protocol
        </p>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <label className="text-xs text-mute">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none focus:border-glow"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode !== "reset" && (
            <div>
              <label className="text-xs text-mute">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl bg-transparent border border-white/15 px-3 py-2 outline-none focus:border-glow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode !== "reset"}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
              />
            </div>
          )}

          {err && <div className="text-red-300 text-xs">{err}</div>}
          {info && <div className="text-green-300 text-xs">{info}</div>}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full mt-1"
          >
            {busy
              ? "Arbejder…"
              : mode === "signin"
              ? "Log ind"
              : mode === "signup"
              ? "Opret konto"
              : "Send reset-mail"}
          </button>
        </form>

        <div className="text-xs text-mute mt-4 flex items-center justify-between">
          {mode !== "reset" ? (
            <button className="underline" onClick={() => setMode("reset")}>
              Glemt adgangskode?
            </button>
          ) : (
            <button className="underline" onClick={() => setMode("signin")}>
              Tilbage til login
            </button>
          )}
          {mode === "signin" ? (
            <button className="underline" onClick={() => setMode("signup")}>
              Opret ny konto
            </button>
          ) : mode === "signup" ? (
            <button className="underline" onClick={() => setMode("signin")}>
              Har du allerede en konto?
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
