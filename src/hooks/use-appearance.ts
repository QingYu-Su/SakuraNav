/**
 * 外观管理 Hook
 * @description 管理外观草稿、壁纸/资产上传、自动持久化等逻辑
 */

"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { AdminBootstrap, AppSettings, ThemeMode, ThemeAppearance, UserRole } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { AppearanceDraft } from "@/components/admin/types";
import {
  buildAppearanceDraft,
  buildPersistBody,
  appearanceDraftMatches,
} from "@/lib/utils/appearance-utils";

/** 壁纸设备类型 */
export type WallpaperDevice = "desktop" | "mobile";

/** 资源类型 */
export type AssetKind = "logo" | "favicon";

export interface UseAppearanceOptions {
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  isAuthenticated: boolean;
  /** 当前用户角色，admin/superuser 可修改全局设置 */
  role: UserRole | null;
  /** 当前 settings（用于持久化时传递非草稿字段） */
  settings: AppSettings;
  /** 当前 appearances（用于比较是否有变更） */
  appearances: Record<ThemeMode, ThemeAppearance>;
  /** 当前 adminData（可能为 null） */
  adminData: AdminBootstrap | null;
  setAppearances: (v: Record<ThemeMode, ThemeAppearance>) => void;
  setSettings: (v: AppSettings) => void;
  setAdminData: React.Dispatch<React.SetStateAction<AdminBootstrap | null>>;
  setErrorMessage: (msg: string) => void;
}

export interface UseAppearanceReturn {
  /* ---- 草稿状态 ---- */
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: React.Dispatch<React.SetStateAction<AppearanceDraft>>;
  settingsDraft: AppSettings;
  setSettingsDraft: React.Dispatch<React.SetStateAction<AppSettings>>;
  appearanceThemeTab: ThemeMode;
  setAppearanceThemeTab: React.Dispatch<React.SetStateAction<ThemeMode>>;

  /* ---- 上传状态 ---- */
  uploadingTheme: ThemeMode | null;
  uploadingAssetTheme: ThemeMode | null;

  /* ---- 文件输入 Refs ---- */
  desktopWallpaperInputRef: React.RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  faviconInputRef: React.RefObject<HTMLInputElement | null>;

  /* ---- 处理函数 ---- */
  uploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => Promise<void>;
  removeWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  uploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => Promise<void>;
  removeAsset: (theme: ThemeMode, kind: AssetKind) => void;
  queueCardFrostedNotice: (theme: ThemeMode) => void;

  /* ---- 重新初始化（admin bootstrap 后调用） ---- */
  applyAppearanceBootstrap: (appearances: Record<ThemeMode, ThemeAppearance>, settings: AppSettings) => void;
}

export function useAppearance(opts: UseAppearanceOptions): UseAppearanceReturn {
  const {
    initialAppearances,
    initialSettings,
    isAuthenticated,
    role,
    settings,
    appearances,
    adminData,
    setAppearances,
    setSettings,
    setAdminData,
    setErrorMessage,
  } = opts;

  /* ---- 草稿状态 ---- */
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>(
    () => buildAppearanceDraft(initialAppearances),
  );
  const [settingsDraft, setSettingsDraft] = useState(initialSettings);
  const [appearanceThemeTab, setAppearanceThemeTab] = useState<ThemeMode>("light");

  /* ---- 上传状态 ---- */
  const [uploadingTheme, setUploadingTheme] = useState<ThemeMode | null>(null);
  const [uploadingAssetTheme, setUploadingAssetTheme] = useState<ThemeMode | null>(null);

  /* ---- 文件输入 Refs ---- */
  const desktopWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const mobileWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  /* ---- 自动持久化 ---- */
  const persistAppearanceDrafts = useEffectEvent(
    async (draft: AppearanceDraft, sDraft: AppSettings) => {
      try {
        // 仅管理员/超级用户同时持久化全局设置（Logo、站点名称等）
        const canEditGlobalSettings = role === "admin" || role === "superuser";
        const results = await Promise.all([
          requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPersistBody(draft)),
          }),
          canEditGlobalSettings
            ? requestJson<AppSettings>("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lightLogoAssetId: sDraft.lightLogoAssetId,
                  darkLogoAssetId: sDraft.darkLogoAssetId,
                  siteName: settings.siteName,
                }),
              })
            : Promise.resolve(settings),
        ]);
        const [savedAppearances, savedSettings] = results;
        setAppearances(savedAppearances);
        setSettings(savedSettings);
        setSettingsDraft(savedSettings);
        if (adminData) {
          setAdminData((c) =>
            c ? { ...c, appearances: savedAppearances, settings: savedSettings } : c,
          );
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "保存外观失败");
      }
    },
  );

  const [pendingAppearanceNotice, setPendingAppearanceNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (appearanceDraftMatches(appearanceDraft, appearances)) return;
    const timeoutId = window.setTimeout(
      () => void persistAppearanceDrafts(appearanceDraft, settingsDraft),
      360,
    );
    return () => window.clearTimeout(timeoutId);
  }, [appearanceDraft, appearances, isAuthenticated, pendingAppearanceNotice, settingsDraft]);

  /* ---- 壁纸处理 ---- */

  async function uploadWallpaper(theme: ThemeMode, device: WallpaperDevice, file: File) {
    setUploadingTheme(theme);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "wallpaper");
      // 传入旧资产 ID，服务端会自动删除旧文件
      const draft = appearanceDraft[theme];
      const oldAssetId = device === "desktop" ? draft.desktopWallpaperAssetId : draft.mobileWallpaperAssetId;
      if (oldAssetId) fd.append("oldAssetId", oldAssetId);
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: fd,
      });
      setAppearanceDraft((c) => ({
        ...c,
        [theme]: {
          ...c[theme],
          ...(device === "desktop"
            ? { desktopWallpaperAssetId: asset.id, desktopWallpaperUrl: asset.url }
            : { mobileWallpaperAssetId: asset.id, mobileWallpaperUrl: asset.url }),
        },
      }));
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "壁纸上传失败");
    } finally {
      setUploadingTheme(null);
    }
  }

  function removeWallpaper(theme: ThemeMode, device: WallpaperDevice) {
    setAppearanceDraft((c) => ({
      ...c,
      [theme]: {
        ...c[theme],
        ...(device === "desktop"
          ? { desktopWallpaperAssetId: null, desktopWallpaperUrl: null }
          : { mobileWallpaperAssetId: null, mobileWallpaperUrl: null }),
      },
    }));
  }

  /* ---- 资产处理 ---- */

  async function uploadAsset(theme: ThemeMode, kind: AssetKind, file: File) {
    setUploadingAssetTheme(theme);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      // 传入旧资产 ID，服务端会自动删除旧文件
      const draft = appearanceDraft[theme];
      const oldAssetId = kind === "logo" ? draft.logoAssetId : draft.faviconAssetId;
      if (oldAssetId) fd.append("oldAssetId", oldAssetId);
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: fd,
      });
      setAppearanceDraft((c) => ({
        ...c,
        [theme]: {
          ...c[theme],
          ...(kind === "logo"
            ? { logoAssetId: asset.id, logoUrl: asset.url }
            : { faviconAssetId: asset.id, faviconUrl: asset.url }),
        },
      }));
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploadingAssetTheme(null);
    }
  }

  function removeAsset(theme: ThemeMode, kind: AssetKind) {
    setAppearanceDraft((c) => ({
      ...c,
      [theme]: {
        ...c[theme],
        ...(kind === "logo"
          ? { logoAssetId: null, logoUrl: null }
          : { faviconAssetId: null, faviconUrl: null }),
      },
    }));
  }

  /* ---- 磨砂效果通知 ---- */

  function queueCardFrostedNotice(theme: ThemeMode) {
    setPendingAppearanceNotice(`card-frosted-${theme}`);
  }

  /* ---- Bootstrap 重新初始化 ---- */

  const applyAppearanceBootstrap = useCallback(
    (newAppearances: Record<ThemeMode, ThemeAppearance>, newSettings: AppSettings) => {
      setAppearanceDraft(buildAppearanceDraft(newAppearances));
      setSettings(newSettings);
      setSettingsDraft(newSettings);
    },
    [setSettings],
  );

  return {
    /* 草稿 */
    appearanceDraft,
    setAppearanceDraft,
    settingsDraft,
    setSettingsDraft,
    appearanceThemeTab,
    setAppearanceThemeTab,
    /* 上传状态 */
    uploadingTheme,
    uploadingAssetTheme,
    /* Refs */
    desktopWallpaperInputRef,
    mobileWallpaperInputRef,
    logoInputRef,
    faviconInputRef,
    /* 壁纸处理 */
    uploadWallpaper,
    removeWallpaper,
    /* 资产处理 */
    uploadAsset,
    removeAsset,
    /* 磨砂 */
    queueCardFrostedNotice,
    /* Bootstrap */
    applyAppearanceBootstrap,
  };
}
