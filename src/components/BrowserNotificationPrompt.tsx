"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BrowserNotificationPrompt() {
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
  }, []);

  const enableNotifications = async () => {
    if (!supported) return;

    setSaving(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

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

  if (!supported || permission === "granted") {
    return null;
  }

  return (
    <div className="soft-card mb-6 p-5">
      <p className="eyebrow mb-2">Notifications</p>
      <h2 className="section-title !mb-0">Activer les rappels</h2>
      <p className="subtle-text mt-2 text-sm">
        Autorise les notifications pour recevoir un test immediat.
      </p>
      <div className="mt-4">
        <button onClick={enableNotifications} disabled={saving} className="btn-secondary">
          {saving ? "Activation..." : "Activer"}
        </button>
      </div>
    </div>
  );
}
