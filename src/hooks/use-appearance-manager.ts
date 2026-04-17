/**
 * 外观管理 Hook
 * @description 封装外观草稿状态、壁纸/资产上传移除、自动持久化等逻辑
 */

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type {
  AppSettings,
  AdminBootstrap,
  ThemeAppearance,
  ThemeMode,
} from "@/lib/types";
import { themeAppearanceDefaults } from "@/lib/config";
import { requestJson } from "@/lib/api";
import { getThemeLabel, getThemeDeviceLabel, getThemeAssetLabel } from "@/lib/theme-styles";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
import type { AppearanceDraft } from "@/components/admin";

type AppearanceNotice = {
  key: string;
  message: string;
};

export function useAppearanceManager(deps: {
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  appearances: Record<ThemeMode, ThemeAppearance>;
  settings: AppSettings;
  isAuthenticated: boolean;
  adminData: AdminBootstrap | null;
  setAdminData: React.Dispatch<React.SetStateAction<AdminBootstrap | null>>;
  setAppearances: React.Dispatch<React.SetStateAction<Record<ThemeMode, ThemeAppearance>>>;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
}) {
  const {
    initialAppearances,
    initialSettings,
    appearances,
    settings,
    isAuthenticated,
    adminData,
    setAdminData,
    setAppearances,
    setSettings,
    setMessage,
    setErrorMessage,
  } = deps;

  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>({
    light: {
      desktopWallpaperAssetId: initialAppearances.light.desktopWallpaperAssetId,
      desktopWallpaperUrl: initialAppearances.light.desktopWallpaperUrl,
      mobileWallpaperAssetId: initialAppearances.light.mobileWallpaperAssetId,
      mobileWallpaperUrl: initialAppearances.light.mobileWallpaperUrl,
      fontPreset: initialAppearances.light.fontPreset,
      fontSize: initialAppearances.light.fontSize,
      overlayOpacity: initialAppearances.light.overlayOpacity,
      textColor: initialAppearances.light.textColor,
      logoAssetId: initialAppearances.light.logoAssetId ?? null,
      logoUrl: initialAppearances.light.logoUrl ?? null,
      faviconAssetId: initialAppearances.light.faviconAssetId ?? null,
      faviconUrl: initialAppearances.light.faviconUrl ?? null,
      desktopCardFrosted: initialAppearances.light.desktopCardFrosted ?? false,
      mobileCardFrosted: initialAppearances.light.mobileCardFrosted ?? false,
      isDefault: initialAppearances.light.isDefault ?? false,
    },
    dark: {
      desktopWallpaperAssetId: initialAppearances.dark.desktopWallpaperAssetId,
      desktopWallpaperUrl: initialAppearances.dark.desktopWallpaperUrl,
      mobileWallpaperAssetId: initialAppearances.dark.mobileWallpaperAssetId,
      mobileWallpaperUrl: initialAppearances.dark.mobileWallpaperUrl,
      fontPreset: initialAppearances.dark.fontPreset,
      fontSize: initialAppearances.dark.fontSize,
      overlayOpacity: initialAppearances.dark.overlayOpacity,
      textColor: initialAppearances.dark.textColor,
      logoAssetId: initialAppearances.dark.logoAssetId ?? null,
      logoUrl: initialAppearances.dark.logoUrl ?? null,
      faviconAssetId: initialAppearances.dark.faviconAssetId ?? null,
      faviconUrl: initialAppearances.dark.faviconUrl ?? null,
      desktopCardFrosted: initialAppearances.dark.desktopCardFrosted ?? false,
      mobileCardFrosted: initialAppearances.dark.mobileCardFrosted ?? false,
      isDefault: initialAppearances.dark.isDefault ?? true,
    },
  });
  const [settingsDraft, setSettingsDraft] = useState(initialSettings);
  const [appearanceThemeTab, setAppearanceThemeTab] = useState<ThemeMode>("light");
  const [uploadingTheme, setUploadingTheme] = useState<ThemeMode | null>(null);
  const [uploadingAssetTheme, setUploadingAssetTheme] = useState<ThemeMode | null>(null);
  const [appearanceMenuTarget, setAppearanceMenuTarget] = useState<WallpaperTarget | null>(null);
  const [assetMenuTarget, setAssetMenuTarget] = useState<AssetTarget | null>(null);
  const [wallpaperUrlTarget, setWallpaperUrlTarget] = useState<WallpaperTarget | null>(null);
  const [assetUrlTarget, setAssetUrlTarget] = useState<AssetTarget | null>(null);
  const [wallpaperUrlValue, setWallpaperUrlValue] = useState("");
  const [assetUrlValue, setAssetUrlValue] = useState("");
  const [wallpaperUrlError, setWallpaperUrlError] = useState("");
  const [assetUrlError, setAssetUrlError] = useState("");
  const [wallpaperUrlBusy, setWallpaperUrlBusy] = useState(false);
  const [assetUrlBusy, setAssetUrlBusy] = useState(false);
  const [pendingAppearanceNotice, setPendingAppearanceNotice] = useState<AppearanceNotice | null>(null);

  const desktopWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const mobileWallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  const persistAppearanceDrafts = useEffectEvent(
    async (
      nextAppearanceDraft: AppearanceDraft,
      nextSettingsDraft: AppSettings,
      successMessage?: string,
    ) => {
      try {
        const [savedAppearances, savedSettings] = await Promise.all([
          requestJson<Record<ThemeMode, ThemeAppearance>>("/api/appearance", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              light: {
                desktopWallpaperAssetId: nextAppearanceDraft.light.desktopWallpaperAssetId,
                mobileWallpaperAssetId: nextAppearanceDraft.light.mobileWallpaperAssetId,
                fontPreset: nextAppearanceDraft.light.fontPreset,
                fontSize: nextAppearanceDraft.light.fontSize,
                overlayOpacity: nextAppearanceDraft.light.overlayOpacity,
                textColor: nextAppearanceDraft.light.textColor,
                logoAssetId: nextAppearanceDraft.light.logoAssetId,
                faviconAssetId: nextAppearanceDraft.light.faviconAssetId,
                desktopCardFrosted: nextAppearanceDraft.light.desktopCardFrosted,
                mobileCardFrosted: nextAppearanceDraft.light.mobileCardFrosted,
                isDefault: nextAppearanceDraft.light.isDefault,
              },
              dark: {
                desktopWallpaperAssetId: nextAppearanceDraft.dark.desktopWallpaperAssetId,
                mobileWallpaperAssetId: nextAppearanceDraft.dark.mobileWallpaperAssetId,
                fontPreset: nextAppearanceDraft.dark.fontPreset,
                fontSize: nextAppearanceDraft.dark.fontSize,
                overlayOpacity: nextAppearanceDraft.dark.overlayOpacity,
                textColor: nextAppearanceDraft.dark.textColor,
                logoAssetId: nextAppearanceDraft.dark.logoAssetId,
                faviconAssetId: nextAppearanceDraft.dark.faviconAssetId,
                desktopCardFrosted: nextAppearanceDraft.dark.desktopCardFrosted,
                mobileCardFrosted: nextAppearanceDraft.dark.mobileCardFrosted,
                isDefault: nextAppearanceDraft.dark.isDefault,
              },
            }),
          }),
          requestJson<AppSettings>("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lightLogoAssetId: nextSettingsDraft.lightLogoAssetId,
              darkLogoAssetId: nextSettingsDraft.darkLogoAssetId,
              siteName: settings.siteName,
            }),
          }),
        ]);

        setAppearances(savedAppearances);
        setSettings(savedSettings);
        setSettingsDraft(savedSettings);
        if (adminData) {
          setAdminData({
            ...adminData,
            appearances: savedAppearances,
            settings: savedSettings,
          });
        }
        if (successMessage) {
          setMessage(successMessage);
          setPendingAppearanceNotice(null);
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "保存外观失败");
      }
    },
  );

  // 自动持久化：draft 与 persisted 不同时延时保存
  useEffect(() => {
    if (!isAuthenticated) return;

    const draftMatchesPersisted =
      appearanceDraft.light.desktopWallpaperAssetId === appearances.light.desktopWallpaperAssetId &&
      appearanceDraft.light.mobileWallpaperAssetId === appearances.light.mobileWallpaperAssetId &&
      appearanceDraft.light.fontPreset === appearances.light.fontPreset &&
      appearanceDraft.light.fontSize === appearances.light.fontSize &&
      appearanceDraft.light.overlayOpacity === appearances.light.overlayOpacity &&
      appearanceDraft.light.textColor === appearances.light.textColor &&
      appearanceDraft.light.logoAssetId === appearances.light.logoAssetId &&
      appearanceDraft.light.faviconAssetId === appearances.light.faviconAssetId &&
      appearanceDraft.light.desktopCardFrosted === appearances.light.desktopCardFrosted &&
      appearanceDraft.light.mobileCardFrosted === appearances.light.mobileCardFrosted &&
      appearanceDraft.light.isDefault === appearances.light.isDefault &&
      appearanceDraft.dark.desktopWallpaperAssetId === appearances.dark.desktopWallpaperAssetId &&
      appearanceDraft.dark.mobileWallpaperAssetId === appearances.dark.mobileWallpaperAssetId &&
      appearanceDraft.dark.fontPreset === appearances.dark.fontPreset &&
      appearanceDraft.dark.fontSize === appearances.dark.fontSize &&
      appearanceDraft.dark.overlayOpacity === appearances.dark.overlayOpacity &&
      appearanceDraft.dark.textColor === appearances.dark.textColor &&
      appearanceDraft.dark.logoAssetId === appearances.dark.logoAssetId &&
      appearanceDraft.dark.faviconAssetId === appearances.dark.faviconAssetId &&
      appearanceDraft.dark.desktopCardFrosted === appearances.dark.desktopCardFrosted &&
      appearanceDraft.dark.mobileCardFrosted === appearances.dark.mobileCardFrosted &&
      appearanceDraft.dark.isDefault === appearances.dark.isDefault;

    if (draftMatchesPersisted) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistAppearanceDrafts(
        appearanceDraft,
        settingsDraft,
        pendingAppearanceNotice?.message,
      );
    }, 360);

    return () => window.clearTimeout(timeoutId);
  }, [appearanceDraft, appearances, isAuthenticated, pendingAppearanceNotice, settingsDraft]);

  async function uploadAppearanceWallpaper(
    theme: ThemeMode,
    device: WallpaperDevice,
    file: File,
  ) {
    setUploadingTheme(theme);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "wallpaper");
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(device === "desktop"
            ? { desktopWallpaperAssetId: asset.id, desktopWallpaperUrl: asset.url }
            : { mobileWallpaperAssetId: asset.id, mobileWallpaperUrl: asset.url }),
        },
      }));
      setAppearanceMenuTarget(null);
      setMessage(`${getThemeDeviceLabel(theme, device, "壁纸")}已上传。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "壁纸上传失败");
    } finally {
      setUploadingTheme(null);
    }
  }

  async function uploadAppearanceWallpaperByUrl(
    theme: ThemeMode,
    device: WallpaperDevice,
    sourceUrl: string,
  ) {
    setWallpaperUrlBusy(true);
    setWallpaperUrlError("");

    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, kind: "wallpaper" }),
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(device === "desktop"
            ? { desktopWallpaperAssetId: asset.id, desktopWallpaperUrl: asset.url }
            : { mobileWallpaperAssetId: asset.id, mobileWallpaperUrl: asset.url }),
        },
      }));
      setWallpaperUrlTarget(null);
      setWallpaperUrlValue("");
      setAppearanceMenuTarget(null);
      setMessage(`${getThemeDeviceLabel(theme, device, "壁纸")}已通过链接更新。`);
    } catch (error) {
      setWallpaperUrlError(error instanceof Error ? error.message : "壁纸 URL 上传失败");
    } finally {
      setWallpaperUrlBusy(false);
    }
  }

  function removeAppearanceWallpaper(theme: ThemeMode, device: WallpaperDevice) {
    setAppearanceDraft((current) => ({
      ...current,
      [theme]: {
        ...current[theme],
        ...(device === "desktop"
          ? { desktopWallpaperAssetId: null, desktopWallpaperUrl: null }
          : { mobileWallpaperAssetId: null, mobileWallpaperUrl: null }),
      },
    }));
    setAppearanceMenuTarget(null);
    setMessage(`${getThemeDeviceLabel(theme, device, "壁纸")}已移除。`);
  }

  function openWallpaperUrlDialog(target: WallpaperTarget) {
    setWallpaperUrlTarget(target);
    setWallpaperUrlValue("");
    setWallpaperUrlError("");
    setAppearanceMenuTarget(null);
  }

  function closeWallpaperUrlDialog() {
    if (wallpaperUrlBusy) return;
    setWallpaperUrlTarget(null);
    setWallpaperUrlValue("");
    setWallpaperUrlError("");
  }

  function triggerWallpaperFilePicker(device: WallpaperDevice) {
    if (device === "desktop") {
      desktopWallpaperInputRef.current?.click();
    } else {
      mobileWallpaperInputRef.current?.click();
    }
    setAppearanceMenuTarget(null);
  }

  async function uploadAppearanceAsset(
    theme: ThemeMode,
    kind: AssetKind,
    file: File,
  ) {
    setUploadingAssetTheme(theme);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        body: formData,
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(kind === "logo"
            ? { logoAssetId: asset.id, logoUrl: asset.url }
            : { faviconAssetId: asset.id, faviconUrl: asset.url }),
        },
      }));
      setAssetMenuTarget(null);
      setMessage(`${getThemeAssetLabel(theme, kind)}已上传。`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploadingAssetTheme(null);
    }
  }

  async function uploadAppearanceAssetByUrl(
    theme: ThemeMode,
    kind: AssetKind,
    sourceUrl: string,
  ) {
    setAssetUrlBusy(true);
    setAssetUrlError("");

    try {
      const asset = await requestJson<{ id: string; url: string }>("/api/assets/wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, kind }),
      });

      setAppearanceDraft((current) => ({
        ...current,
        [theme]: {
          ...current[theme],
          ...(kind === "logo"
            ? { logoAssetId: asset.id, logoUrl: asset.url }
            : { faviconAssetId: asset.id, faviconUrl: asset.url }),
        },
      }));
      setAssetUrlTarget(null);
      setAssetUrlValue("");
      setAssetMenuTarget(null);
      setMessage(`${getThemeAssetLabel(theme, kind)}已通过链接更新。`);
    } catch (error) {
      setAssetUrlError(error instanceof Error ? error.message : "URL 上传失败");
    } finally {
      setAssetUrlBusy(false);
    }
  }

  function removeAppearanceAsset(theme: ThemeMode, kind: AssetKind) {
    setAppearanceDraft((current) => ({
      ...current,
      [theme]: {
        ...current[theme],
        ...(kind === "logo"
          ? { logoAssetId: null, logoUrl: null }
          : { faviconAssetId: null, faviconUrl: null }),
      },
    }));
    setAssetMenuTarget(null);
    setMessage(`${getThemeAssetLabel(theme, kind)}已移除。`);
  }

  function openAssetUrlDialog(target: AssetTarget) {
    setAssetUrlTarget(target);
    setAssetUrlValue("");
    setAssetUrlError("");
    setAssetMenuTarget(null);
  }

  function closeAssetUrlDialog() {
    if (assetUrlBusy) return;
    setAssetUrlTarget(null);
    setAssetUrlValue("");
    setAssetUrlError("");
  }

  function triggerAssetFilePicker(kind: AssetKind) {
    if (kind === "logo") {
      logoInputRef.current?.click();
    } else {
      faviconInputRef.current?.click();
    }
    setAssetMenuTarget(null);
  }

  function queueTypographyNotice(theme: ThemeMode) {
    setPendingAppearanceNotice({
      key: `typography-${theme}`,
      message: `${getThemeLabel(theme)}主题字体设置已保存。`,
    });
  }

  function queueCardFrostedNotice(theme: ThemeMode) {
    setPendingAppearanceNotice({
      key: `card-frosted-${theme}`,
      message: `${getThemeLabel(theme)}主题卡片磨砂效果已保存。`,
    });
  }

  function restoreThemeTypographyDefaults(theme: ThemeMode) {
    setAppearanceDraft((current) => ({
      ...current,
      [theme]: {
        ...current[theme],
        fontPreset: themeAppearanceDefaults[theme].fontPreset,
        fontSize: themeAppearanceDefaults[theme].fontSize,
        textColor: themeAppearanceDefaults[theme].textColor,
      },
    }));
    queueTypographyNotice(theme);
  }

  /** 当 adminData 加载后重新同步外观草稿 */
  function applyAppearanceDraftFromBootstrap(data: AdminBootstrap) {
    setAppearanceDraft({
      light: {
        desktopWallpaperAssetId: data.appearances.light.desktopWallpaperAssetId,
        desktopWallpaperUrl: data.appearances.light.desktopWallpaperUrl,
        mobileWallpaperAssetId: data.appearances.light.mobileWallpaperAssetId,
        mobileWallpaperUrl: data.appearances.light.mobileWallpaperUrl,
        fontPreset: data.appearances.light.fontPreset,
        fontSize: data.appearances.light.fontSize,
        overlayOpacity: data.appearances.light.overlayOpacity,
        textColor: data.appearances.light.textColor,
        logoAssetId: data.appearances.light.logoAssetId ?? null,
        logoUrl: data.appearances.light.logoUrl ?? null,
        faviconAssetId: data.appearances.light.faviconAssetId ?? null,
        faviconUrl: data.appearances.light.faviconUrl ?? null,
        desktopCardFrosted: data.appearances.light.desktopCardFrosted ?? false,
        mobileCardFrosted: data.appearances.light.mobileCardFrosted ?? false,
        isDefault: data.appearances.light.isDefault ?? false,
      },
      dark: {
        desktopWallpaperAssetId: data.appearances.dark.desktopWallpaperAssetId,
        desktopWallpaperUrl: data.appearances.dark.desktopWallpaperUrl,
        mobileWallpaperAssetId: data.appearances.dark.mobileWallpaperAssetId,
        mobileWallpaperUrl: data.appearances.dark.mobileWallpaperUrl,
        fontPreset: data.appearances.dark.fontPreset,
        fontSize: data.appearances.dark.fontSize,
        overlayOpacity: data.appearances.dark.overlayOpacity,
        textColor: data.appearances.dark.textColor,
        logoAssetId: data.appearances.dark.logoAssetId ?? null,
        logoUrl: data.appearances.dark.logoUrl ?? null,
        faviconAssetId: data.appearances.dark.faviconAssetId ?? null,
        faviconUrl: data.appearances.dark.faviconUrl ?? null,
        desktopCardFrosted: data.appearances.dark.desktopCardFrosted ?? false,
        mobileCardFrosted: data.appearances.dark.mobileCardFrosted ?? false,
        isDefault: data.appearances.dark.isDefault ?? true,
      },
    });
  }

  return {
    appearanceDraft,
    setAppearanceDraft,
    settingsDraft,
    setSettingsDraft,
    appearanceThemeTab,
    setAppearanceThemeTab,
    uploadingTheme,
    uploadingAssetTheme,
    appearanceMenuTarget,
    setAppearanceMenuTarget,
    assetMenuTarget,
    setAssetMenuTarget,
    wallpaperUrlTarget,
    wallpaperUrlValue,
    wallpaperUrlError,
    wallpaperUrlBusy,
    assetUrlTarget,
    assetUrlValue,
    assetUrlError,
    assetUrlBusy,
    desktopWallpaperInputRef,
    mobileWallpaperInputRef,
    logoInputRef,
    faviconInputRef,
    uploadAppearanceWallpaper,
    uploadAppearanceWallpaperByUrl,
    removeAppearanceWallpaper,
    openWallpaperUrlDialog,
    closeWallpaperUrlDialog,
    triggerWallpaperFilePicker,
    uploadAppearanceAsset,
    uploadAppearanceAssetByUrl,
    removeAppearanceAsset,
    openAssetUrlDialog,
    closeAssetUrlDialog,
    triggerAssetFilePicker,
    queueTypographyNotice,
    queueCardFrostedNotice,
    restoreThemeTypographyDefaults,
    applyAppearanceDraftFromBootstrap,
  };
}
