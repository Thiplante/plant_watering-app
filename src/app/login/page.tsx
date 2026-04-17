"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Connecte !");
      window.location.href = "/";
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-green-700">Bon retour</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Se connecter
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Accede a tes plantes et a ton suivi d&apos;arrosage.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                type="password"
                placeholder="mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:bg-white"
              />
            </div>

            <button
              onClick={handleLogin}
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Se connecter
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-semibold text-green-700 hover:text-green-800">
              Creer un compte
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
