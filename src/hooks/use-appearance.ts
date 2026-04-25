/**
 * 外观管理 Hook
 * @description 管理外观草稿、壁纸/资产上传、自动持久化等逻辑
 */

"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { AdminBootstrap, AppSettings, ThemeMode, ThemeAppearance, FloatingButtonItem } from "@/lib/base/types";
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

  /**
   * 将站点面板的设置显式保存到全局
   * @param siteName 站点名称
   * @param floatingButtons 快捷按钮配置（为 null 则不更新）
   */
  saveGlobalSettings: (siteName: string | null, floatingButtons: FloatingButtonItem[] | null) => Promise<boolean>;
}

export function useAppearance(opts: UseAppearanceOptions): UseAppearanceReturn {
  const {
    initialAppearances,
    initialSettings,
    isAuthenticated,
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

  /* ---- 自动持久化（仅外观，不含全局设置） ---- */
  const persistAppearanceDrafts = useEffectEvent(
    async (draft: AppearanceDraft) => {
      try {
        const savedAppearances = await requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPersistBody(draft)),
        });
        setAppearances(savedAppearances);
        if (adminData) {
          setAdminData((c) =>
            c ? { ...c, appearances: savedAppearances } : c,
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
      () => void persistAppearanceDrafts(appearanceDraft),
      360,
    );
    return () => window.clearTimeout(timeoutId);
  }, [appearanceDraft, appearances, isAuthenticated, pendingAppearanceNotice]);

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

  /** 待清理的旧 Logo/Favicon 资产 ID 列表（全局保存时统一清理） */
  const [pendingCleanupAssetIds, setPendingCleanupAssetIds] = useState<string[]>([]);

  /**
   * 上传 Logo/Favicon 资源（仅更新本地预览草稿，不自动持久化到全局）
   * 用户需在站点面板中点击"作用到全局"才会保存
   */
  async function uploadAsset(theme: ThemeMode, kind: AssetKind, file: File) {
    setUploadingAssetTheme(theme);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      // 传入旧资产 ID，服务端会自动删除旧文件
      const sDraft = settingsDraft;
      const oldAssetId = kind === "logo" ? sDraft.lightLogoAssetId : sDraft.faviconAssetId;
      if (oldAssetId) {
        fd.append("oldAssetId", oldAssetId);
        // 记录旧资产 ID，全局保存时统一清理
        setPendingCleanupAssetIds((prev) => prev.includes(oldAssetId) ? prev : [...prev, oldAssetId]);
      }
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: fd,
      });

      // 仅更新 settingsDraft 作为本地预览（不触发自动持久化）
      setSettingsDraft((c) => {
        if (kind === "logo") {
          return {
            ...c,
            lightLogoAssetId: asset.id,
            lightLogoUrl: asset.url,
            darkLogoAssetId: asset.id,
            darkLogoUrl: asset.url,
          };
        }
        return {
          ...c,
          faviconAssetId: asset.id,
          faviconUrl: asset.url,
        };
      });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "上传失败");
    } finally {
      setUploadingAssetTheme(null);
    }
  }

  /**
   * 移除 Logo/Favicon 资源（仅更新本地预览草稿，不自动持久化到全局）
   * 记录被移除的旧资产 ID，全局保存时统一清理服务端文件
   */
  function removeAsset(theme: ThemeMode, kind: AssetKind) {
    setSettingsDraft((c) => {
      // 记录被移除的旧资产 ID，全局保存时统一清理
      if (kind === "logo") {
        if (c.lightLogoAssetId) {
          setPendingCleanupAssetIds((prev) => prev.includes(c.lightLogoAssetId!) ? prev : [...prev, c.lightLogoAssetId!]);
        }
        return { ...c, lightLogoAssetId: null, lightLogoUrl: null, darkLogoAssetId: null, darkLogoUrl: null };
      }
      if (c.faviconAssetId) {
        setPendingCleanupAssetIds((prev) => prev.includes(c.faviconAssetId!) ? prev : [...prev, c.faviconAssetId!]);
      }
      return { ...c, faviconAssetId: null, faviconUrl: null };
    });
  }

  /**
   * 将站点面板的设置（Logo/Favicon/站点名称/默认模式/快捷按钮）保存到全局
   * 同时清理被替换/删除的旧 Logo/Favicon 资源文件
   * @returns 保存成功返回 true，失败返回 false
   */
  async function saveGlobalSettings(siteName: string | null, floatingButtons: FloatingButtonItem[] | null): Promise<boolean> {
    try {
      // 收集待清理的资产 ID（先快照，后续清空队列）
      const assetIdsToCleanup = [...pendingCleanupAssetIds];

      const savedSettings = await requestJson<AppSettings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightLogoAssetId: settingsDraft.lightLogoAssetId,
          darkLogoAssetId: settingsDraft.darkLogoAssetId,
          faviconAssetId: settingsDraft.faviconAssetId,
          siteName,
        }),
      });
      setSettings(savedSettings);
      setSettingsDraft(savedSettings);

      // 同时保存默认模式（写入管理员外观的 is_default）
      await requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPersistBody(appearanceDraft)),
      });

      // 同时保存快捷按钮（如果有变更）
      if (floatingButtons !== null) {
        await requestJson("/api/floating-buttons", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buttons: floatingButtons }),
        });
      }

      // 清理被替换/删除的旧 Logo/Favicon 资源文件
      if (assetIdsToCleanup.length > 0) {
        await requestJson("/api/assets/cleanup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetIds: assetIdsToCleanup }),
        });
      }

      // 清空待清理队列
      setPendingCleanupAssetIds([]);

      if (adminData) {
        setAdminData((c) =>
          c ? { ...c, settings: savedSettings } : c,
        );
      }
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存全局设置失败");
      return false;
    }
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
    /* 全局保存 */
    saveGlobalSettings,
  };
}
