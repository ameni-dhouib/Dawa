"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { Logo } from "@/components/Logo";

const DEMO = [
  { email: "doctor@dawa.tn", role: "Doctor", who: "Dr. Amira Ben Salah", what: "Write prescriptions and give patients their transcript", icon: Stethoscope },
];

const FLOW = [
  ["Prescribe", "The doctor enters the medicines and the patient's address."],
  ["Match", "Dawa checks every pharmacy in the patient's region and picks the nearest one that has each medicine."],
  ["Deliver", "Anything missing is shipped from the central pharmacy, and the patient's transcript shows when it will arrive."],
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e?: React.FormEvent, override?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(override ?? { email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push(`/${data.role}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <section className="bg-ink text-white px-6 py-10 sm:px-12 lg:px-16 lg:py-14 flex flex-col">
        <Logo light />
        <div className="mt-14 lg:mt-auto max-w-[34rem]">
          <h1 className="text-[40px] sm:text-[52px] leading-[1.02] font-extrabold tracking-[-0.03em]">
            From prescription to pharmacy shelf, in one step.
          </h1>
          <p className="mt-5 text-white/70 text-lg leading-relaxed max-w-[46ch]">
            Dawa connects doctors, regional pharmacies and the central pharmacy so every patient leaves the consultation knowing exactly where to collect their medicines.
          </p>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-3 lg:mt-16 max-w-3xl">
          {FLOW.map(([t, d], i) => (
            <li key={t} className="border-t border-white/20 pt-4">
              <span className="text-[#5FD3A4] font-semibold num">{i + 1}</span>
              <p className="font-semibold mt-1">{t}</p>
              <p className="text-sm text-white/60 mt-1 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="text-ink-soft mt-1">Use your professional account.</p>

          <form onSubmit={signIn} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p role="alert" className="text-sm text-alert bg-alert-soft rounded-md px-3 py-2">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>

          <div className="mt-10">
            <p className="text-sm font-medium">Demo account</p>
            <p className="text-xs text-ink-soft mb-3">doctor@dawa.tn, password <span className="font-semibold text-ink">demo</span>.</p>
            <div className="grid gap-2.5">
              {DEMO.map(({ email: em, role, who, what, icon: Icon }) => (
                <button
                  key={em}
                  onClick={() => signIn(undefined, { email: em, password: "demo" })}
                  disabled={busy}
                  className="text-left panel px-4 py-3.5 flex gap-3.5 items-start hover:border-cross transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cross"
                >
                  <span className="mt-0.5 rounded-md bg-cross-soft text-cross p-2"><Icon size={18} /></span>
                  <span>
                    <span className="block font-semibold">Continue as {role.toLowerCase()}</span>
                    <span className="block text-sm text-ink-soft">{who}. {what}.</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
