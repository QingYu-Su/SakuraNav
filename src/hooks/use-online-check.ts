/**
 * 在线检查 Hook
 * @description 管理在线检查的设置和执行逻辑，包含自动定时检查
 */

import { useEffect, useState } from "react";
import type { AppSettings } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";

export interface UseOnlineCheckOptions {
  isAuthenticated: boolean;
  settings: AppSettings;
  setSettings: (v: AppSettings) => void;
  syncNavigationData: () => Promise<void>;
}

export interface UseOnlineCheckReturn {
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  handleOnlineCheckToggle: (enabled: boolean) => Promise<void>;
  handleOnlineCheckSettingChange: (field: "onlineCheckTime", value: number) => Promise<void>;
  handleRunOnlineCheck: () => Promise<void>;
}

export function useOnlineCheck(opts: UseOnlineCheckOptions): UseOnlineCheckReturn {
  const { isAuthenticated, settings, setSettings, syncNavigationData } = opts;

  const [onlineCheckBusy, setOnlineCheckBusy] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<{
    checked: number;
    online: number;
    offline: number;
  } | null>(null);

  async function saveSettings(partial: Partial<AppSettings>) {
    const saved = await requestJson<AppSettings>("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lightLogoAssetId: settings.lightLogoAssetId,
        darkLogoAssetId: settings.darkLogoAssetId,
        ...partial,
      }),
    });
    setSettings(saved);
  }

  async function handleOnlineCheckToggle(enabled: boolean) {
    try {
      await saveSettings({ onlineCheckEnabled: enabled });
    } catch (e) {
      console.error("保存在线检查设置失败:", e);
    }
  }

  async function handleOnlineCheckSettingChange(field: "onlineCheckTime", value: number) {
    try {
      await saveSettings({ [field]: value });
    } catch (e) {
      console.error("保存在线检查设置失败:", e);
    }
  }

  async function handleRunOnlineCheck() {
    setOnlineCheckBusy(true);
    setOnlineCheckResult(null);
    try {
      const res = await requestJson<{ checked: number; online: number; offline: number }>(
        "/api/sites/check-online",
        { method: "POST" },
      );
      setOnlineCheckResult(res);
      await syncNavigationData();
    } finally {
      setOnlineCheckBusy(false);
    }
  }

  /* 自动在线检查 */
  useEffect(() => {
    if (!isAuthenticated || !settings.onlineCheckEnabled) return;
    const lastRun = settings.onlineCheckLastRun ? new Date(settings.onlineCheckLastRun) : null;
    const now = new Date();
    const targetHour = settings.onlineCheckTime;
    if (now.getHours() >= targetHour) {
      const todayTarget = new Date(now);
      todayTarget.setHours(targetHour, 0, 0, 0);
      if (!lastRun || lastRun.getTime() < todayTarget.getTime()) {
        void (async () => {
          try {
            await requestJson("/api/sites/check-online", { method: "POST" });
            await syncNavigationData();
          } catch {
            /* ignore */
          }
        })();
      }
    }
  }, [isAuthenticated, settings.onlineCheckEnabled, settings.onlineCheckLastRun, settings.onlineCheckTime, syncNavigationData]);

  return {
    onlineCheckBusy,
    onlineCheckResult,
    handleOnlineCheckToggle,
    handleOnlineCheckSettingChange,
    handleRunOnlineCheck,
  };
}
