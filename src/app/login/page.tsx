"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

type FormMessage = {
  type: "error" | "success";
  text: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setMessage({
        type: "error",
        text: "Renseigne ton email et ton mot de passe pour te connecter.",
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      setMessage({
        type: "success",
        text: "Connexion reussie. Redirection vers ton dashboard...",
      });
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-container-narrow flex min-h-[calc(100vh-36px)] items-center justify-center">
        <div className="glass-card w-full max-w-md p-6 sm:p-8">
          <div className="mb-8 text-center">
            <p className="eyebrow mb-3">Bon retour</p>
            <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 8vw, 3rem)" }}>
              Se connecter
            </h1>
            <p className="subtle-text mt-3 text-sm">
              Retrouve tes plantes, tes rappels et les conseils meteo en quelques secondes.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div className="field">
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-elegant"
              />
            </div>

            <div className="field">
              <label htmlFor="password" className="field-label">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                placeholder="Ton mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-elegant"
              />
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
              {loading ? "Connexion..." : "Acceder a mon dashboard"}
            </button>
          </form>

          <p className="subtle-text mt-6 text-center text-sm">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-extrabold text-[#28563c] hover:text-[#183624]">
              Creer un compte simplement
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
