"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type FormMessage = {
  type: "error" | "success";
  text: string;
};

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const router = useRouter();

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setMessage({
        type: "error",
        text: "Ajoute un email et un mot de passe pour creer le compte.",
      });
      return;
    }

    if (password.trim().length < 6) {
      setMessage({
        type: "error",
        text: "Choisis un mot de passe d'au moins 6 caracteres.",
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    const user = data.user;

    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email?.toLowerCase(),
      });
    }

    setLoading(false);
    setMessage({
      type: "success",
      text: "Compte cree. Tu peux maintenant te connecter.",
    });
    router.push("/login");
  };

  return (
    <main className="page-shell">
      <div className="page-container-narrow flex min-h-[calc(100vh-36px)] items-center justify-center">
        <div className="glass-card w-full max-w-md p-8 sm:p-10">
          <p className="eyebrow mb-3">Bienvenue</p>
          <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 8vw, 3rem)" }}>
            Creer un compte
          </h1>
          <p className="subtle-text mb-8 mt-3 text-sm">
            Quelques secondes suffisent pour commencer ton suivi d&apos;arrosage.
          </p>

          <form onSubmit={handleSignup} className="space-y-4" noValidate>
            <div className="field">
              <label htmlFor="signup-email" className="field-label">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-elegant"
              />
            </div>

            <div className="field">
              <label htmlFor="signup-password" className="field-label">
                Mot de passe
              </label>
              <input
                id="signup-password"
                type="password"
                placeholder="Au moins 6 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-elegant"
              />
            </div>

            <div className="feedback-banner feedback-info">
              Ton mot de passe doit contenir au moins 6 caracteres pour eviter les erreurs de creation.
            </div>

            {message && (
              <div
                className={`feedback-banner ${
                  message.type === "success" ? "feedback-success" : "feedback-error"
                }`}
              >
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creation..." : "Creer mon compte"}
            </button>
          </form>

          <p className="subtle-text mt-8 text-center text-sm font-bold">
            Deja un compte ?{" "}
            <Link href="/login" className="font-extrabold text-[#28563c] hover:text-[#183624]">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
