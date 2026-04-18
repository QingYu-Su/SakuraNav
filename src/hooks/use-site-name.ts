/**
 * 站点名称编辑 Hook
 * @description 管理站点名称的防抖保存逻辑
 */

import { useRef, useState } from "react";
import type { AppSettings } from "@/lib/types";
import { siteConfig } from "@/lib/config";
import { requestJson } from "@/lib/api";

export interface UseSiteNameOptions {
  settings: AppSettings;
  setSettings: (v: AppSettings) => void;
}

export interface UseSiteNameReturn {
  siteNameDraft: string;
  siteNameBusy: boolean;
  debouncedSiteNameSave: (name: string) => void;
}

export function useSiteName(opts: UseSiteNameOptions): UseSiteNameReturn {
  const { settings, setSettings } = opts;

  const [siteNameDraft, setSiteNameDraft] = useState(settings.siteName ?? siteConfig.appName);
  const [siteNameBusy, setSiteNameBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSiteNameSave(name: string) {
    const trimmed = name.trim();
    const finalName = trimmed || null;
    if (finalName === settings.siteName) return;
    setSiteNameBusy(true);
    try {
      const saved = await requestJson<AppSettings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightLogoAssetId: settings.lightLogoAssetId,
          darkLogoAssetId: settings.darkLogoAssetId,
          siteName: finalName,
        }),
      });
      setSettings(saved);
      setSiteNameDraft(saved.siteName ?? siteConfig.appName);
      document.title = saved.siteName || siteConfig.appName;
    } finally {
      setSiteNameBusy(false);
    }
  }

  function debouncedSiteNameSave(name: string) {
    setSiteNameDraft(name);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void handleSiteNameSave(name), 600);
  }

  return { siteNameDraft, siteNameBusy, debouncedSiteNameSave };
}
