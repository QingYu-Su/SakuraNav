/**
 * 站点名称管理 Hook
 * @description 管理站点名称的本地预览（不自动保存到全局，需配合"作用到全局"按钮）
 */

import { useState } from "react";
import type { AppSettings } from "@/lib/base/types";
import { siteConfig } from "@/lib/config/config";

export interface UseSiteNameOptions {
  settings: AppSettings;
}

export interface UseSiteNameReturn {
  siteNameDraft: string;
  setSiteNameDraft: (name: string) => void;
}

export function useSiteName(opts: UseSiteNameOptions): UseSiteNameReturn {
  const { settings } = opts;

  const [siteNameDraft, setSiteNameDraft] = useState(settings.siteName ?? siteConfig.appName);

  return { siteNameDraft, setSiteNameDraft };
}
