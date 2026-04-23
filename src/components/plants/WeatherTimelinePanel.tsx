"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAuthenticatedHeaders } from "@/lib/api";

type WeatherTimelinePoint = {
  date: string;
  temperatureMax: number | null;
  humidityAverage: number | null;
  rainTotal: number | null;
  precipitationProbabilityMax: number | null;
  isForecast: boolean;
};

type WeatherTimelineResponse = {
  city?: string | null;
  timeline?: WeatherTimelinePoint[];
  error?: string;
};

type WeatherTimelinePanelProps = {
  plantId: string;
  city?: string | null;
  weatherUpdatedAt?: string | null;
};

function formatLabel(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
  });
}

function toChartPoints(timeline: WeatherTimelinePoint[]) {
  return timeline.map((point) => ({
    ...point,
    label: formatLabel(point.date),
    temperatureActual: point.isForecast ? null : point.temperatureMax,
    temperatureForecast: point.isForecast ? point.temperatureMax : null,
    humidityActual: point.isForecast ? null : point.humidityAverage,
    humidityForecast: point.isForecast ? point.humidityAverage : null,
    rainActual: point.isForecast ? null : point.rainTotal,
    rainForecast: point.isForecast ? point.rainTotal : null,
  }));
}

export default function WeatherTimelinePanel({
  plantId,
  city,
  weatherUpdatedAt,
}: WeatherTimelinePanelProps) {
  const [timeline, setTimeline] = useState<WeatherTimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTimeline = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/weather/timeline?plantId=${plantId}`, {
          headers: await getAuthenticatedHeaders(),
        });
        const data = (await res.json()) as WeatherTimelineResponse;

        if (!res.ok) {
          throw new Error(data.error || "Impossible de charger la meteo detaillee");
        }

        if (!cancelled) {
          setTimeline(data.timeline || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Erreur meteo");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [plantId, weatherUpdatedAt]);

  const chartData = useMemo(() => toChartPoints(timeline), [timeline]);
  const forecastStart = chartData.find((point) => point.isForecast)?.label;

  if (loading) {
    return <div className="soft-card center-empty">Chargement de la meteo detaillee...</div>;
  }

  if (error) {
    return <div className="feedback-banner feedback-error">{error}</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="soft-card center-empty">
        Aucune donnee meteo detaillee disponible pour {city || "cette ville"}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="soft-card p-5">
        <p className="eyebrow mb-2">Lecture rapide</p>
        <h3 className="section-title !mb-0">Tendance sur 7 jours + prevision courte</h3>
        <p className="subtle-text mt-3 text-sm">
          Les courbes pleines montrent la semaine recente. Les segments en pointille representent
          la prevision sur les 3 a 4 prochains jours pour {city || "la ville choisie"}.
        </p>
      </div>

      <div className="glass-card p-5">
        <p className="field-label mb-3">Temperature maximale</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,75,52,0.12)" />
              <XAxis dataKey="label" stroke="#607264" />
              <YAxis unit="deg C" stroke="#607264" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperatureActual"
                name="Observe"
                stroke="#2f6646"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="temperatureForecast"
                name="Prevision"
                stroke="#2f6646"
                strokeWidth={3}
                strokeDasharray="7 6"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="field-label mb-3">Humidite moyenne</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,75,52,0.12)" />
              <XAxis dataKey="label" stroke="#607264" />
              <YAxis unit="%" stroke="#607264" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="humidityActual"
                name="Observe"
                stroke="#3f8aa8"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="humidityForecast"
                name="Prevision"
                stroke="#3f8aa8"
                strokeWidth={3}
                strokeDasharray="7 6"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="field-label mb-3">Pluie et risque de precipitation</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,75,52,0.12)" />
              <XAxis dataKey="label" stroke="#607264" />
              <YAxis yAxisId="left" unit="mm" stroke="#607264" />
              <YAxis yAxisId="right" orientation="right" unit="%" stroke="#607264" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rainActual"
                name="Pluie observee"
                stroke="#1d78a6"
                strokeWidth={3}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rainForecast"
                name="Pluie prevue"
                stroke="#1d78a6"
                strokeWidth={3}
                strokeDasharray="7 6"
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="precipitationProbabilityMax"
                name="Probabilite pluie"
                stroke="#8e6ccf"
                strokeWidth={2}
                strokeDasharray={forecastStart ? "2 6" : undefined}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
