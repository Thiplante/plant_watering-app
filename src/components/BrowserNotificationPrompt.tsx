"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BrowserNotificationPromptProps = {
  showWhenGranted?: boolean;
  onPermissionChange?: (granted: boolean) => void;
};

export default function BrowserNotificationPrompt({
  showWhenGranted = false,
  onPermissionChange,
}: BrowserNotificationPromptProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setSupported(false);
      setPermission("unsupported");
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);
    onPermissionChange?.(Notification.permission === "granted");
  }, [onPermissionChange]);

  const enableNotifications = async () => {
    if (!supported) return;

    setSaving(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      onPermissionChange?.(result === "granted");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .upsert(
            { id: user.id, email: user.email?.toLowerCase() || null, notification_opt_in: result === "granted" },
            { onConflict: "id" }
          );
      }

      if (result === "granted") {
        new Notification("Rappels actives", {
          body: "Tu recevras les prochains rappels directement dans ton navigateur.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!supported) {
    return null;
  }

  if (permission === "granted" && !showWhenGranted) {
    return null;
  }

  return (
    <section className="glass-card mt-6 p-6 md:p-8">
      <p className="eyebrow mb-2">Notifications</p>
      <h2 className="section-title !mb-0">Rappels</h2>
      <p className="subtle-text mt-2 text-sm">
        {permission === "granted"
          ? "Les notifications navigateur sont deja actives."
          : "Autorise les notifications pour recevoir un test immediat."}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="pill">
          {permission === "granted" ? "Actives" : "Non activees"}
        </span>
        <button onClick={enableNotifications} disabled={saving} className="btn-secondary">
          {saving ? "Activation..." : permission === "granted" ? "Tester" : "Activer"}
        </button>
      </div>
    </section>
  );
}
