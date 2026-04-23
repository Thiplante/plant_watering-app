"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getUserLocations } from "@/lib/locations";
import { ensureProfile } from "@/lib/profiles";
import type { PlantLocation, Profile } from "@/lib/types";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationKind, setNewLocationKind] = useState("interieur");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    const load = async () => {
      const currentProfile = await ensureProfile();

      if (!currentProfile) {
        router.replace("/login");
        return;
      }

      setProfile(currentProfile);
      setLocations(await getUserLocations());
      setLoading(false);
    };

    void load();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    try {
      setSavingProfile(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const payload = {
        email: user.email?.toLowerCase() || null,
        display_name: profile.display_name?.trim() || null,
        household_name: profile.household_name?.trim() || null,
        default_city: profile.default_city?.trim() || null,
        experience_level: profile.experience_level || "debutant",
        interface_mode: profile.interface_mode || "guided",
        notification_opt_in: profile.notification_opt_in,
        onboarding_completed: true,
      };

      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      let nextProfile = updatedProfile;

      if (!nextProfile) {
        const { data: insertedProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            ...payload,
          })
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }

        nextProfile = insertedProfile;
      }

      if (!nextProfile) {
        throw new Error("Le profil n'a pas pu etre enregistre.");
      }

      setProfile(nextProfile as Profile);

      setMessage({ type: "success", text: "Profil enregistre." });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Impossible d'enregistrer le profil."),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      setMessage({ type: "error", text: "Ajoute un nom de lieu avant d'enregistrer." });
      return;
    }

    try {
      setSavingLocation(true);
      setMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase.from("plant_locations").insert({
        owner_id: user.id,
        name: newLocationName.trim(),
        kind: newLocationKind,
      });

      if (error) {
        throw error;
      }

      setLocations(await getUserLocations());
      setNewLocationName("");
      setMessage({ type: "success", text: "Lieu ajoute." });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Impossible d'ajouter ce lieu."),
      });
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      setMessage(null);
      const { error } = await supabase.from("plant_locations").delete().eq("id", locationId);

      if (error) {
        throw error;
      }

      setLocations(await getUserLocations());
      setMessage({ type: "success", text: "Lieu supprime." });
    } catch (error) {
      setMessage({
        type: "error",
        text: getErrorMessage(error, "Impossible de supprimer ce lieu."),
      });
    }
  };

  if (loading || !profile) {
    return (
      <main className="page-shell">
        <div className="page-container-narrow">
          <div className="glass-card center-empty">Chargement...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container-narrow">
        <Link href="/" className="btn-secondary">
          Retour
        </Link>

        <section className="glass-card mt-6 p-6 md:p-8">
          <p className="eyebrow mb-3">Preferences</p>
          <h1 className="hero-title" style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>
            Mon profil
          </h1>
          <p className="subtle-text mt-3">
            Quelques reglages simples pour personnaliser l&apos;application.
          </p>

          {message ? (
            <div
              className={`feedback-banner mt-6 ${
                message.type === "success" ? "feedback-success" : "feedback-error"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="field">
              <label className="field-label">Nom visible</label>
              <input
                value={profile.display_name || ""}
                onChange={(event) => setProfile({ ...profile, display_name: event.target.value })}
                className="input-elegant"
                placeholder="Ex: Thibaut"
              />
            </div>

            <div className="field">
              <label className="field-label">Foyer</label>
              <input
                value={profile.household_name || ""}
                onChange={(event) => setProfile({ ...profile, household_name: event.target.value })}
                className="input-elegant"
                placeholder="Ex: Appartement Paris"
              />
            </div>

            <div className="field">
              <label className="field-label">Ville par defaut</label>
              <input
                value={profile.default_city || ""}
                onChange={(event) => setProfile({ ...profile, default_city: event.target.value })}
                className="input-elegant"
                placeholder="Ex: Bordeaux"
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

            <div className="field">
              <label className="field-label">Affichage</label>
              <select
                value={profile.interface_mode || "guided"}
                onChange={(event) =>
                  setProfile({
                    ...profile,
                    interface_mode: event.target.value as Profile["interface_mode"],
                  })
                }
                className="select-elegant"
              >
                <option value="simple">Simple</option>
                <option value="guided">Guide</option>
                <option value="expert">Expert</option>
              </select>
              <p className="subtle-text text-sm">
                `Simple` montre l&apos;essentiel, `Guide` explique un peu plus, `Expert` affiche
                tous les details.
              </p>
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
                  Recevoir les rappels
                </p>
                <p className="subtle-text text-sm">
                  Active les rappels navigateur et les futures alertes email.
                </p>
              </div>
            </label>

            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? "Enregistrement..." : "Enregistrer les preferences"}
            </button>
          </form>
        </section>

        <section className="glass-card mt-6 p-6 md:p-8">
          <p className="eyebrow mb-3">Lieux</p>
          <h2 className="section-title !mb-0">Mes lieux</h2>
          <p className="subtle-text mt-3 text-sm">
            Cree des lieux simples comme salon, balcon ou bureau.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr_auto]">
            <input
              value={newLocationName}
              onChange={(event) => setNewLocationName(event.target.value)}
              className="input-elegant"
              placeholder="Ex: Salon, Balcon, Bureau"
            />

            <select
              value={newLocationKind}
              onChange={(event) => setNewLocationKind(event.target.value)}
              className="select-elegant"
            >
              <option value="interieur">Interieur</option>
              <option value="exterieur">Exterieur</option>
              <option value="serre">Serre</option>
            </select>

            <button onClick={handleAddLocation} disabled={savingLocation} className="btn-secondary">
              {savingLocation ? "Ajout..." : "Ajouter"}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {locations.length === 0 ? (
              <div className="soft-card center-empty">
                Aucun lieu pour le moment. Commence par en creer un.
              </div>
            ) : (
              locations.map((location) => (
                <div key={location.id} className="history-item">
                  <div>
                    <p className="font-extrabold text-[#183624]">{location.name}</p>
                    <p className="history-date">{location.kind || "Lieu"}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLocation(location.id)}
                    className="btn-secondary"
                  >
                    Supprimer
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
