/**
 * 外观管理 Hook
 * @description 管理外观草稿、壁纸/资产上传、自动持久化等逻辑
 */

"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { AdminBootstrap, AppSettings, ThemeMode, ThemeAppearance, UserRole } from "@/lib/base/types";
import { themeAppearanceDefaults } from "@/lib/config/config";
import { requestJson } from "@/lib/base/api";
import type { AppearanceDraft } from "@/components/admin/types";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
import {
  buildAppearanceDraft,
  buildPersistBody,
  appearanceDraftMatches,
} from "@/lib/utils/appearance-utils";

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

  /* ---- 菜单目标 ---- */
  appearanceMenuTarget: WallpaperTarget | null;
  setAppearanceMenuTarget: React.Dispatch<React.SetStateAction<WallpaperTarget | null>>;
  assetMenuTarget: AssetTarget | null;
  setAssetMenuTarget: React.Dispatch<React.SetStateAction<AssetTarget | null>>;

  /* ---- URL 对话框状态 ---- */
  wallpaperUrlTarget: WallpaperTarget | null;
  wallpaperUrlValue: string;
  wallpaperUrlError: string;
  wallpaperUrlBusy: boolean;
  assetUrlTarget: AssetTarget | null;
  assetUrlValue: string;
  assetUrlError: string;
  assetUrlBusy: boolean;
  setWallpaperUrlValue: React.Dispatch<React.SetStateAction<string>>;
  setAssetUrlValue: React.Dispatch<React.SetStateAction<string>>;
  setWallpaperUrlError: React.Dispatch<React.SetStateAction<string>>;
  setAssetUrlError: React.Dispatch<React.SetStateAction<string>>;

  /* ---- 通知 ---- */
  pendingAppearanceNotice: string | null;

  /* ---- 文件输入 Refs ---- */
  desktopWallpaperInputRef: React.RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  faviconInputRef: React.RefObject<HTMLInputElement | null>;

  /* ---- 处理函数 ---- */
  uploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => Promise<void>;
  uploadWallpaperByUrl: (theme: ThemeMode, device: WallpaperDevice, sourceUrl: string) => Promise<void>;
  removeWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  uploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => Promise<void>;
  uploadAssetByUrl: (theme: ThemeMode, kind: AssetKind, sourceUrl: string) => Promise<void>;
  removeAsset: (theme: ThemeMode, kind: AssetKind) => void;
  queueTypographyNotice: (theme: ThemeMode) => void;
  queueCardFrostedNotice: (theme: ThemeMode) => void;
  restoreThemeTypographyDefaults: (theme: ThemeMode) => void;

  /* ---- 对话框操作 ---- */
  openWallpaperUrlDialog: (target: WallpaperTarget) => void;
  closeWallpaperUrlDialog: () => void;
  submitWallpaperUrl: () => void;
  openAssetUrlDialog: (target: AssetTarget) => void;
  closeAssetUrlDialog: () => void;
  submitAssetUrl: () => void;

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

  /* ---- 菜单目标 ---- */
  const [appearanceMenuTarget, setAppearanceMenuTarget] = useState<WallpaperTarget | null>(null);
  const [assetMenuTarget, setAssetMenuTarget] = useState<AssetTarget | null>(null);

  /* ---- 壁纸 URL 对话框 ---- */
  const [wallpaperUrlTarget, setWallpaperUrlTarget] = useState<WallpaperTarget | null>(null);
  const [wallpaperUrlValue, setWallpaperUrlValue] = useState("");
  const [wallpaperUrlError, setWallpaperUrlError] = useState("");
  const [wallpaperUrlBusy, setWallpaperUrlBusy] = useState(false);

  /* ---- 资产 URL 对话框 ---- */
  const [assetUrlTarget, setAssetUrlTarget] = useState<AssetTarget | null>(null);
  const [assetUrlValue, setAssetUrlValue] = useState("");
  const [assetUrlError, setAssetUrlError] = useState("");
  const [assetUrlBusy, setAssetUrlBusy] = useState(false);

  /* ---- 通知 ---- */
  const [pendingAppearanceNotice, setPendingAppearanceNotice] = useState<string | null>(null);

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
        setPendingAppearanceNotice(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "保存外观失败");
      }
    },
  );

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
      setAppearanceMenuTarget(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "壁纸上传失败");
    } finally {
      setUploadingTheme(null);
    }
  }

  async function uploadWallpaperByUrl(theme: ThemeMode, device: WallpaperDevice, sourceUrl: string) {
    setWallpaperUrlBusy(true);
    setWallpaperUrlError("");
    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, kind: "wallpaper" }),
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
      setWallpaperUrlTarget(null);
      setWallpaperUrlValue("");
      setAppearanceMenuTarget(null);
    } catch (e) {
      setWallpaperUrlError(e instanceof Error ? e.message : "壁纸 URL 上传失败");
    } finally {
      setWallpaperUrlBusy(false);
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
    setAppearanceMenuTarget(null);
  }

  /* ---- 资产处理 ---- */

  async function uploadAsset(theme: ThemeMode, kind: AssetKind, file: File) {
    setUploadingAssetTheme(theme);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
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
      setAssetMenuTarget(null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploadingAssetTheme(null);
    }
  }

  async function uploadAssetByUrl(theme: ThemeMode, kind: AssetKind, sourceUrl: string) {
    setAssetUrlBusy(true);
    setAssetUrlError("");
    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, kind }),
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
      setAssetUrlTarget(null);
      setAssetUrlValue("");
      setAssetMenuTarget(null);
    } catch (e) {
      setAssetUrlError(e instanceof Error ? e.message : "URL 上传失败");
    } finally {
      setAssetUrlBusy(false);
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
    setAssetMenuTarget(null);
  }

  /* ---- 排版/磨砂效果通知 ---- */

  function queueTypographyNotice(theme: ThemeMode) {
    setPendingAppearanceNotice(`typography-${theme}`);
  }

  function queueCardFrostedNotice(theme: ThemeMode) {
    setPendingAppearanceNotice(`card-frosted-${theme}`);
  }

  function restoreThemeTypographyDefaults(theme: ThemeMode) {
    setAppearanceDraft((c) => ({
      ...c,
      [theme]: {
        ...c[theme],
        fontPreset: themeAppearanceDefaults[theme].fontPreset,
        fontSize: themeAppearanceDefaults[theme].fontSize,
        textColor: themeAppearanceDefaults[theme].textColor,
      },
    }));
    queueTypographyNotice(theme);
  }

  /* ---- URL 对话框操作 ---- */

  function openWallpaperUrlDialog(target: WallpaperTarget) {
    setWallpaperUrlTarget(target);
    setWallpaperUrlValue("");
    setWallpaperUrlError("");
    setAppearanceMenuTarget(null);
  }

  function closeWallpaperUrlDialog() {
    if (!wallpaperUrlBusy) {
      setWallpaperUrlTarget(null);
      setWallpaperUrlValue("");
      setWallpaperUrlError("");
    }
  }

  function submitWallpaperUrl() {
    if (!wallpaperUrlTarget || !wallpaperUrlValue.trim()) {
      setWallpaperUrlError("请输入壁纸 URL。");
      return;
    }
    void uploadWallpaperByUrl(wallpaperUrlTarget.theme, wallpaperUrlTarget.device, wallpaperUrlValue.trim());
  }

  function openAssetUrlDialog(target: AssetTarget) {
    setAssetUrlTarget(target);
    setAssetUrlValue("");
    setAssetUrlError("");
    setAssetMenuTarget(null);
  }

  function closeAssetUrlDialog() {
    if (!assetUrlBusy) {
      setAssetUrlTarget(null);
      setAssetUrlValue("");
      setAssetUrlError("");
    }
  }

  function submitAssetUrl() {
    if (!assetUrlTarget || !assetUrlValue.trim()) {
      setAssetUrlError("请输入图片 URL。");
      return;
    }
    void uploadAssetByUrl(assetUrlTarget.theme, assetUrlTarget.kind, assetUrlValue.trim());
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
    /* 菜单 */
    appearanceMenuTarget,
    setAppearanceMenuTarget,
    assetMenuTarget,
    setAssetMenuTarget,
    /* URL 对话框 */
    wallpaperUrlTarget,
    wallpaperUrlValue,
    wallpaperUrlError,
    wallpaperUrlBusy,
    assetUrlTarget,
    assetUrlValue,
    assetUrlError,
    assetUrlBusy,
    setWallpaperUrlValue,
    setAssetUrlValue,
    setWallpaperUrlError,
    setAssetUrlError,
    /* 通知 */
    pendingAppearanceNotice,
    /* Refs */
    desktopWallpaperInputRef,
    mobileWallpaperInputRef,
    logoInputRef,
    faviconInputRef,
    /* 壁纸处理 */
    uploadWallpaper,
    uploadWallpaperByUrl,
    removeWallpaper,
    /* 资产处理 */
    uploadAsset,
    uploadAssetByUrl,
    removeAsset,
    /* 排版/磨砂 */
    queueTypographyNotice,
    queueCardFrostedNotice,
    restoreThemeTypographyDefaults,
    /* URL 对话框操作 */
    openWallpaperUrlDialog,
    closeWallpaperUrlDialog,
    submitWallpaperUrl,
    openAssetUrlDialog,
    closeAssetUrlDialog,
    submitAssetUrl,
    /* Bootstrap */
    applyAppearanceBootstrap,
  };
}
