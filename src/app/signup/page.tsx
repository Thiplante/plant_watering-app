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
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (user) {
      // On insère dans la table profiles
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email?.toLowerCase(),
      });
    }

    alert("Compte créé ! Connecte-toi maintenant.");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-green-100">
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Bienvenue !</h1>
        <p className="text-gray-500 mb-8 font-medium">Crée ton compte pour sauver tes plantes.</p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl bg-gray-50 border-none px-5 py-4 outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl bg-gray-50 border-none px-5 py-4 outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full rounded-2xl bg-green-600 py-4 font-black text-white hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? "CRÉATION..." : "C'EST PARTI !"}
          </button>
        </div>

        <p className="mt-8 text-center text-sm font-bold text-gray-400">
          Déjà un compte ? <Link href="/login" className="text-green-600 underline">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}