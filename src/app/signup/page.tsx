"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Email et mot de passe obligatoires.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      alert(error.message);
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
    alert("Compte cree ! Connecte-toi maintenant.");
    router.push("/login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 p-6">
      <div className="w-full max-w-md rounded-[40px] border border-green-100 bg-white p-10 shadow-2xl">
        <h1 className="mb-2 text-4xl font-black tracking-tighter text-gray-900">
          Bienvenue !
        </h1>
        <p className="mb-8 font-medium text-gray-500">
          Cree ton compte pour sauver tes plantes.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 outline-none focus:ring-2 focus:ring-green-500"
          />

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-none bg-gray-50 px-5 py-4 outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-2xl bg-green-600 py-4 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "CREATION..." : "C'EST PARTI !"}
          </button>
        </div>

        <p className="mt-8 text-center text-sm font-bold text-gray-400">
          Deja un compte ?{" "}
          <Link href="/login" className="text-green-600 underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
