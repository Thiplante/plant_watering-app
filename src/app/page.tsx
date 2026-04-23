"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useState } from "react";
import BrowserNotificationPrompt from "@/components/BrowserNotificationPrompt";
import {
  getPlantDisplayName,
  getPlantIdentitySubtitle,
} from "@/lib/plants/identity";
import { getUserLocations } from "@/lib/locations";
import { buildNotificationDrafts } from "@/lib/plants/notifications";
import {
  getCareProfileForPlant,
  getDifficultyLabel,
  getPetSafetyLabel,
} from "@/lib/plants/profile";
import {
  getAdaptiveWateringInsight,
  getDashboardNotifications,
  getHealthInsight,
  getWeatherInsight,
} from "@/lib/plants/insights";
import { ensureProfile } from "@/lib/profiles";
import { supabase } from "@/lib/supabase";
import type { AppNotification, Plant, PlantLocation, PlantShare, Profile } from "@/lib/types";

type PlantStatus = "unknown" | "overdue" | "today" | "ok";

type PlantDateInfo = {
  last: string;
  next: string;
  label: string;
  isOverdue: boolean;
};

type HomeMessage = {
  type: "success" | "error";
  text: string;
};

type FilterMode = "all" | "overdue" | "today" | "safe" | "watch";
type SortMode = "urgency" | "name" | "recent";

type SectionProps = {
  title: string;
  subtitle: string;
  plants: Plant[];
  onQuickWater: (event: React.MouseEvent<HTMLButtonElement>, plant: Plant) => void;
  getDates: (plant: Plant) => PlantDateInfo;
  getLocationName: (plant: Plant) => string | null;
};

function toneClasses(tone: string) {
  switch (tone) {
    case "rain":
    case "good":
    case "success":
      return "bg-emerald-50 text-emerald-800 border border-emerald-100";
    case "heat":
    case "danger":
      return "bg-rose-50 text-rose-800 border border-rose-100";
    case "watch":
    case "warning":
      return "bg-amber-50 text-amber-800 border border-amber-100";
    default:
      return "bg-slate-50 text-slate-700 border border-slate-100";
  }
}

function Section({ title, subtitle, plants, onQuickWater, getDates, getLocationName }: SectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title !mb-0">
            {title} ({plants.length})
          </h2>
          <p className="subtle-text mt-2 text-sm">{subtitle}</p>
        </div>
      </div>

      {plants.length === 0 ? (
        <div className="soft-card center-empty">Aucune plante dans cette categorie.</div>
      ) : (
        <div className="grid-elegant grid-elegant-3">
          {plants.map((plant) => {
            const dates = getDates(plant);
            const weatherInsight = getWeatherInsight(plant);
            const adaptive = getAdaptiveWateringInsight(plant);
            const careProfile = getCareProfileForPlant(plant);

            return (
              <Link key={plant.id} href={`/plants/${plant.id}`}>
                <div className="plant-card">
                  {plant.image_url ? (
                    <Image
                      src={plant.image_url}
                      alt={plant.name}
                      width={800}
                      height={440}
                      className="mb-5 h-[220px] w-full rounded-[24px] object-cover"
                    />
                  ) : (
                    <div className="soft-card mb-5 flex h-[220px] items-center justify-center rounded-[24px] subtle-text">
                      Pas encore de photo
                    </div>
                  )}

                  <h3 className="plant-title">{getPlantDisplayName(plant)}</h3>
                  {getPlantIdentitySubtitle(plant) && (
                    <p className="mb-3 text-sm font-semibold text-[#5b6b5e]">
                      {getPlantIdentitySubtitle(plant)}
                    </p>
                  )}

                  <div className="pill-row mb-4">
                    {getLocationName(plant) && <span className="pill">{getLocationName(plant)}</span>}
                    <span className="pill">{plant.city || "Ville inconnue"}</span>
                    {careProfile && <span className="pill">{getDifficultyLabel(careProfile.difficulty)}</span>}
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="status-card">
                      <span className="status-label">Dernier</span>
                      <span className="status-value">{dates.last}</span>
                    </div>

                    <div
                      className={`status-card ${
                        dates.isOverdue ? "status-card-danger" : ""
                      }`}
                    >
                      <span className="status-label">Prochain</span>
                      <span
                        className={
                          dates.isOverdue
                            ? "status-value status-value-danger"
                            : "status-value"
                        }
                      >
                        {dates.label}
                      </span>
                    </div>
                    <div className="status-card">
                      <span className="status-label">Date cible</span>
                      <span className="status-value">{dates.next}</span>
                    </div>
                  </div>

                  <div className="mb-4 rounded-[20px] bg-[#f7faf7] px-4 py-4">
                    <p className="text-sm font-semibold text-[#193425]">{weatherInsight.label}</p>
                    <p className="mt-2 text-sm text-[#516154]">{weatherInsight.detail}</p>
                    <p className="mt-3 text-xs font-semibold text-[#516154]">
                      {adaptive.label}: {adaptive.minDays}
                      {adaptive.maxDays !== adaptive.minDays
                        ? ` a ${adaptive.maxDays}`
                        : ""}{" "}
                      jours
                    </p>
                    {careProfile && (
                      <p className="mt-3 text-xs text-[#516154]">
                        {getPetSafetyLabel(careProfile.petSafety)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(event) => onQuickWater(event, plant)}
                    className="btn-primary w-full"
                  >
                    Marquer comme arrosee
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<HomeMessage | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("urgency");
  const [locationFilter, setLocationFilter] = useState("all");
  const router = useRouter();

  const syncNotifications = useCallback(
    async (currentUserId: string, currentPlants: Plant[]) => {
      const drafts = buildNotificationDrafts(currentPlants);

      try {
        const generatedTypes = [
          "watering_overdue",
          "watering_soon",
          "weather_rain_skip",
          "weather_heat_watch",
        ];

        const { data: existingData } = await supabase
          .from("notifications")
          .select("id, notification_key")
          .eq("user_id", currentUserId)
          .in("type", generatedTypes);

        const existing = (existingData || []) as Pick<
          AppNotification,
          "id" | "notification_key"
        >[];
        const currentKeys = new Set(drafts.map((draft) => draft.notification_key));
        const staleIds = existing
          .filter((notification) => !currentKeys.has(notification.notification_key))
          .map((notification) => notification.id);

        if (staleIds.length > 0) {
          await supabase.from("notifications").delete().in("id", staleIds);
        }

        if (drafts.length > 0) {
          await supabase.from("notifications").upsert(
            drafts.map((draft) => ({
              user_id: currentUserId,
              is_read: false,
              ...draft,
            })),
            {
              onConflict: "user_id,notification_key",
            }
          );
        }

        const { data: notificationsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false })
          .limit(8);

        setNotifications((notificationsData || []) as AppNotification[]);
      } catch {
        setNotifications([]);
      }
    },
    []
  );

  const fetchPlants = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);
    const currentProfile = await ensureProfile();
    setProfile(currentProfile);
    setLocations(await getUserLocations());

    const { data: myPlantsData } = await supabase
      .from("plants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    const myPlants = (myPlantsData || []) as Plant[];

    const { data: sharesData } = await supabase
      .from("plant_shares")
      .select("plant_id")
      .eq("user_email", user.email?.toLowerCase());

    const shares = (sharesData || []) as Pick<PlantShare, "plant_id">[];

    let sharedPlants: Plant[] = [];

    if (shares.length > 0) {
      const ids = shares.map((share) => share.plant_id);
      const { data } = await supabase
        .from("plants")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });

      sharedPlants = (data || []) as Plant[];
    }

    const uniquePlantsMap = new Map<string, Plant>();

    [...myPlants, ...sharedPlants].forEach((plant) => {
      uniquePlantsMap.set(plant.id, plant);
    });

    const mergedPlants = Array.from(uniquePlantsMap.values());
    setPlants(mergedPlants);
    await syncNotifications(user.id, mergedPlants);
    setLoading(false);
  }, [router, syncNotifications]);

  useEffect(() => {
    startTransition(() => {
      void fetchPlants();
    });
  }, [fetchPlants]);

  const handleQuickWater = async (
    event: React.MouseEvent<HTMLButtonElement>,
    plant: Plant
  ) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const now = new Date().toISOString();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("plants").update({ last_watered_at: now }).eq("id", plant.id);
      await supabase.from("watering_logs").insert({
        plant_id: plant.id,
        watered_at: now,
        user_id: user?.id,
      });

      await fetchPlants();
      setMessage({
        type: "success",
        text: `${getPlantDisplayName(plant)} est maintenant marquee comme arrosee.`,
      });
    } catch {
      setMessage({
        type: "error",
        text: "Impossible d'enregistrer cet arrosage pour le moment. Verifie ta connexion puis reessaie.",
      });
    }
  };

  const handleNotificationAction = async (notification: AppNotification) => {
    const relatedPlant = plants.find((plant) => plant.id === notification.plant_id);

    if (!relatedPlant) {
      if (notification.plant_id) {
        router.push(`/plants/${notification.plant_id}`);
      }
      return;
    }

    if (
      notification.type === "watering_overdue" ||
      notification.type === "watering_soon"
    ) {
      setLoading(true);
      setMessage(null);

      try {
        const now = new Date().toISOString();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("plants").update({ last_watered_at: now }).eq("id", relatedPlant.id);
        await supabase.from("watering_logs").insert({
          plant_id: relatedPlant.id,
          watered_at: now,
          user_id: user?.id,
        });
        await markNotificationRead(notification.id);
        await fetchPlants();
        setMessage({
          type: "success",
          text: `${getPlantDisplayName(relatedPlant)} a ete marquee comme arrosee depuis les notifications.`,
        });
      } catch {
        setMessage({
          type: "error",
          text: "Impossible d'executer cette action pour le moment. Ouvre la fiche plante si le probleme persiste.",
        });
      }

      return;
    }

    router.push(`/plants/${relatedPlant.id}`);
  };

  const getNotificationActionLabel = (notification: AppNotification) => {
    if (
      notification.type === "watering_overdue" ||
      notification.type === "watering_soon"
    ) {
      return "Marquer arrosee";
    }

    return "Voir la plante";
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch {
      return;
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userId) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch {
      return;
    }
  };

  const getFriendlyLastLabel = (lastDate: string) => {
    const now = new Date();
    const last = new Date(lastDate);
    const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startLast = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diffMs = startNow.getTime() - startLast.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return `Il y a ${diffDays} jours`;
  };

  const getDates = (plant: Plant): PlantDateInfo => {
    if (!plant.last_watered_at) {
      return {
        last: "Jamais",
        next: "A definir",
        label: "A definir",
        isOverdue: false,
      };
    }

    const now = new Date();
    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);

    const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startNext = new Date(next.getFullYear(), next.getMonth(), next.getDate());
    const diffMs = startNext.getTime() - startNow.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let label = "";
    let isOverdue = false;

    if (diffDays < 0) {
      isOverdue = true;
      label = `En retard de ${Math.abs(diffDays)} jour${
        Math.abs(diffDays) > 1 ? "s" : ""
      }`;
    } else if (diffDays === 0) {
      label = "Aujourd'hui";
    } else if (diffDays === 1) {
      label = "Demain";
    } else {
      label = `Dans ${diffDays} jours`;
    }

    return {
      last: getFriendlyLastLabel(plant.last_watered_at),
      next: next.toLocaleDateString("fr-FR"),
      label,
      isOverdue,
    };
  };

  const getStatus = (plant: Plant): PlantStatus => {
    if (!plant.last_watered_at) return "unknown";

    const next = new Date(plant.last_watered_at);
    next.setDate(next.getDate() + plant.watering_frequency_days);
    const now = new Date();

    if (next < now) return "overdue";

    const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1) return "today";

    return "ok";
  };

  const overdue = plants.filter((plant) => getStatus(plant) === "overdue");
  const today = plants.filter((plant) => getStatus(plant) === "today");
  const profileCoverage = plants.filter((plant) => getCareProfileForPlant(plant)).length;
  const heatSensitiveCount = plants.filter(
    (plant) => getWeatherInsight(plant).tone === "heat"
  ).length;
  const locationMap = new Map(locations.map((location) => [location.id, location.name]));
  const searchTerm = searchQuery.trim().toLowerCase();

  const filteredPlants = plants
    .filter((plant) => {
      if (!searchTerm) return true;

      return [
        plant.name,
        plant.custom_name || "",
        plant.identified_name || "",
        plant.scientific_name || "",
        plant.city || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);
    })
    .filter((plant) => {
      if (locationFilter === "all") return true;
      return plant.location_id === locationFilter;
    })
    .filter((plant) => {
      if (filterMode === "all") return true;
      if (filterMode === "overdue") return getStatus(plant) === "overdue";
      if (filterMode === "today") return getStatus(plant) === "today";
      if (filterMode === "safe") return Boolean(getCareProfileForPlant(plant));
      return getWeatherInsight(plant).tone === "heat" || getHealthInsight(plant).tone === "danger";
    })
    .sort((a, b) => {
      if (sortMode === "name") {
        return getPlantDisplayName(a).localeCompare(getPlantDisplayName(b), "fr");
      }

      if (sortMode === "recent") {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }

      const statusWeight = { overdue: 0, today: 1, ok: 2, unknown: 3 };
      const weightA = statusWeight[getStatus(a)];
      const weightB = statusWeight[getStatus(b)];
      return weightA - weightB;
    });

  const overdueFiltered = filteredPlants.filter((plant) => getStatus(plant) === "overdue");
  const todayFiltered = filteredPlants.filter((plant) => getStatus(plant) === "today");
  const normalFiltered = filteredPlants.filter((plant) => getStatus(plant) === "ok");
  const fallbackNotifications = getDashboardNotifications(plants);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const interfaceMode = profile?.interface_mode || "guided";
  const priorityLabel =
    overdue.length > 0
      ? `${overdue.length} plante${overdue.length > 1 ? "s" : ""} en retard a traiter en premier`
      : today.length > 0
        ? `${today.length} plante${today.length > 1 ? "s" : ""} a verifier aujourd'hui`
        : "Aucune urgence detectee pour le moment";

  if (loading) {
    return (
      <main className="page-shell">
        <div className="page-container">
          <div className="glass-card center-empty">Chargement...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="page-container">
        {!profile?.onboarding_completed && (
          <div className="glass-card mb-6 p-6">
            <p className="eyebrow mb-2">Bienvenue</p>
            <h2 className="section-title !mb-0">Finaliser mon espace</h2>
            <p className="subtle-text mt-2 text-sm">
              Ajoute ton nom, ton foyer et tes preferences pour rendre l&apos;application plus utile
              et plus personnelle.
            </p>
            <div className="mt-4">
              <Link href="/settings" className="btn-secondary">
                Completer mon profil
              </Link>
            </div>
          </div>
        )}

        <BrowserNotificationPrompt />

        <div className="topbar-blur mb-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="hero-title">Mes plantes</h1>
              <p className="subtle-text mt-2">
                L&apos;essentiel pour savoir quoi arroser maintenant, et quoi laisser tranquille.
              </p>
            </div>

            <Link href="/plants/new" className="btn-primary">
              Ajouter une plante
            </Link>
          </div>
        </div>

        {interfaceMode !== "simple" && (
        <section className="glass-card mb-6 p-6">
          <p className="eyebrow mb-3">Aujourd&apos;hui</p>
          <h2 className="section-title !mb-0">Que faire maintenant ?</h2>
          <p className="mt-3 text-base font-semibold text-[#183624]">{priorityLabel}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="status-card">
              <span className="status-label">En retard</span>
              <span className="status-value">{overdue.length}</span>
            </div>
            <div className="status-card">
              <span className="status-label">A verifier</span>
              <span className="status-value">{today.length}</span>
            </div>
            <div className="status-card">
              <span className="status-label">Total</span>
              <span className="status-value">{plants.length}</span>
            </div>
          </div>
        </section>
        )}

        <section className="glass-card mb-6 p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Filtres</p>
              <h2 className="section-title !mb-0">Trouver rapidement une plante</h2>
              <p className="subtle-text mt-2 text-sm">
                Recherche, filtre et tri sans surcharger l&apos;ecran principal.
              </p>
            </div>

            <div className="pill-row">
              <span className="pill">{profileCoverage} profils experts reconnus</span>
              <span className="pill">{heatSensitiveCount} plantes sensibles a la chaleur</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Rechercher une plante, une ville ou un nom scientifique"
              className="input-elegant"
            />

            <select
              value={filterMode}
              onChange={(event) => setFilterMode(event.target.value as FilterMode)}
              className="select-elegant"
            >
              <option value="all">Toutes les plantes</option>
              <option value="overdue">En retard</option>
              <option value="today">A verifier aujourd&apos;hui</option>
              <option value="safe">Profils enrichis</option>
              <option value="watch">A surveiller</option>
            </select>

            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="select-elegant"
            >
              <option value="all">Tous les lieux</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>

            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="select-elegant"
            >
              <option value="urgency">Trier par urgence</option>
              <option value="name">Trier par nom</option>
              <option value="recent">Trier par ajout recent</option>
            </select>
          </div>
        </section>

        {message && (
          <div
            className={`mb-6 feedback-banner ${
              message.type === "success" ? "feedback-success" : "feedback-error"
            }`}
          >
            {message.text}
          </div>
        )}

        {interfaceMode === "expert" && (
        <section className="glass-card mb-10 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Rappels</p>
              <h2 className="section-title !mb-0">A faire</h2>
              <p className="subtle-text mt-2 text-sm">
                Les rappels prioritaires sont regroupes ici.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {notifications.length > 0 && (
                <button onClick={markAllNotificationsRead} className="btn-secondary">
                  {unreadCount > 0 ? `Tout lire (${unreadCount})` : "Tout est lu"}
                </button>
              )}
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[24px] px-5 py-4 ${toneClasses(notification.level)} ${
                    notification.is_read ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{notification.title}</p>
                      <p className="mt-1 text-sm font-semibold">{notification.message}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => void handleNotificationAction(notification)}
                      className="btn-primary !px-4 !py-2"
                    >
                      {getNotificationActionLabel(notification)}
                    </button>

                    {!notification.is_read && (
                      <button
                        onClick={() => void markNotificationRead(notification.id)}
                        className="btn-secondary !px-4 !py-2"
                      >
                        Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {fallbackNotifications.map((message) => (
                <div
                  key={message}
                  className="rounded-[24px] border border-[rgba(35,75,52,0.08)] bg-white/80 px-5 py-4 text-sm font-semibold text-[#1e3223]"
                >
                  {message}
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        <Section
          title="En retard"
          subtitle="A traiter en premier."
          plants={overdueFiltered}
          onQuickWater={handleQuickWater}
          getDates={getDates}
          getLocationName={(plant) =>
            plant.location_id ? locationMap.get(plant.location_id) || null : null
          }
        />
        <Section
          title="A arroser aujourd'hui"
          subtitle="A verifier aujourd&apos;hui."
          plants={todayFiltered}
          onQuickWater={handleQuickWater}
          getDates={getDates}
          getLocationName={(plant) =>
            plant.location_id ? locationMap.get(plant.location_id) || null : null
          }
        />
        <Section
          title="Stable"
          subtitle="Aucune action immediate."
          plants={normalFiltered}
          onQuickWater={handleQuickWater}
          getDates={getDates}
          getLocationName={(plant) =>
            plant.location_id ? locationMap.get(plant.location_id) || null : null
          }
        />
      </div>
    </main>
  );
}
