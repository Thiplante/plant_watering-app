"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    if (user) {
      await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
      });
    }

    alert("Compte créé !");
    window.location.href = "/login";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
          <div className="mb-6 text-center">
            <p className="text-sm font-medium text-green-700">Bienvenue</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              Créer un compte
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Commence à suivre l’arrosage de tes plantes simplement.
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
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-green-500 focus:bg-white"
              />
            </div>

            <button
              onClick={handleSignup}
              className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              Créer mon compte
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-green-700 hover:text-green-800">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}