"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureProfile } from "@/lib/profiles";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      const current = await ensureProfile();

      if (!current) {
        router.replace("/login");
        return;
      }

      setProfile(current);
      setLoading(false);
    };

    void load();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setMessage("");
    await supabase
      .from("profiles")
      .upsert(
        {
          ...profile,
          onboarding_completed: true,
        },
        { onConflict: "id" }
      );
    setSaving(false);
    setMessage("Profil enregistre.");
  };

  if (loading || !profile) {
    return <main className="page-shell"><div className="page-container-narrow"><div className="glass-card center-empty">Chargement...</div></div></main>;
  }

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <Link href="/" className="btn-secondary">Retour</Link>
        <section className="glass-card mt-6 p-6 md:p-8">
          <p className="eyebrow mb-3">Profil</p>
          <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>
            Mon espace
          </h1>
          <p className="subtle-text mt-3">
            Renseigne ton foyer et tes preferences pour rendre l&apos;application plus personnelle.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="field">
              <label className="field-label">Nom visible</label>
              <input
                value={profile.display_name || ""}
                onChange={(event) =>
                  setProfile({ ...profile, display_name: event.target.value })
                }
                className="input-elegant"
                placeholder="Ex: Thibaut"
              />
            </div>

            <div className="field">
              <label className="field-label">Maison / balcon</label>
              <input
                value={profile.household_name || ""}
                onChange={(event) =>
                  setProfile({ ...profile, household_name: event.target.value })
                }
                className="input-elegant"
                placeholder="Ex: Appartement Paris"
              />
            </div>

            <div className="field">
              <label className="field-label">Niveau</label>
              <select
                value={profile.experience_level || "debutant"}
                onChange={(event) =>
                  setProfile({ ...profile, experience_level: event.target.value })
                }
                className="select-elegant"
              >
                <option value="debutant">Debutant</option>
                <option value="intermediaire">Intermediaire</option>
                <option value="passionne">Passionne</option>
              </select>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={profile.notification_opt_in}
                onChange={(event) =>
                  setProfile({ ...profile, notification_opt_in: event.target.checked })
                }
                className="checkbox-elegant"
              />
              <div>
                <p className="text-[0.95rem] font-extrabold text-[#183624]">
                  Je veux recevoir des rappels
                </p>
                <p className="subtle-text text-sm">
                  Active les rappels dans le navigateur et futurement par email.
                </p>
              </div>
            </label>

            {message ? <div className="feedback-banner feedback-success">{message}</div> : null}

            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Enregistrement..." : "Enregistrer mon profil"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
