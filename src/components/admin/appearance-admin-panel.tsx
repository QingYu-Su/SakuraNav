/**
 * 外观管理面板组件
 * @description 用于管理主题外观设置，包括字体、壁纸、Logo、Favicon 等资源配置
 */

/**
 * 外观管理面板组件
 * @description 提供主题外观配置界面，包括壁纸、Logo、字体、磨砂效果等设置
 */

"use client";

import { type Dispatch, type RefObject, type SetStateAction } from "react";
import { type FontPresetKey, type ThemeMode } from "@/lib/base/types";
import { fontPresets } from "@/lib/config/config";
import { cn } from "@/lib/utils/utils";
import { WallpaperSlotCard } from "./wallpaper-slot-card";
import { AssetSlotCard } from "./asset-slot-card";
import type { AppearanceDraft } from "./types";
import type { WallpaperDevice, WallpaperTarget } from "../dialogs/wallpaper-url-dialog";
import type { AssetKind, AssetTarget } from "../dialogs/asset-url-dialog";

export function AppearanceAdminPanel({
  appearanceThemeTab,
  setAppearanceThemeTab,
  appearanceDraft,
  setAppearanceDraft,
  uploadingTheme,
  appearanceMenuTarget,
  desktopWallpaperInputRef,
  mobileWallpaperInputRef,
  logoInputRef,
  faviconInputRef,
  assetMenuTarget,
  uploadingAssetTheme,
  onUploadWallpaper,
  onOpenWallpaperUrlDialog,
  onOpenWallpaperMenu,
  onRemoveWallpaper,
  onTriggerWallpaperFilePicker,
  onUploadAsset,
  onOpenAssetUrlDialog,
  onOpenAssetMenu,
  onRemoveAsset,
  onTriggerAssetFilePicker,
  onTypographyChange,
  onRestoreTypographyDefaults,
  onCardFrostedChange,
}: {
  appearanceThemeTab: ThemeMode;
  setAppearanceThemeTab: Dispatch<SetStateAction<ThemeMode>>;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: Dispatch<SetStateAction<AppearanceDraft>>;
  uploadingTheme: ThemeMode | null;
  appearanceMenuTarget: WallpaperTarget | null;
  desktopWallpaperInputRef: RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: RefObject<HTMLInputElement | null>;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  assetMenuTarget: AssetTarget | null;
  uploadingAssetTheme: ThemeMode | null;
  onUploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => void;
  onOpenWallpaperUrlDialog: (target: WallpaperTarget) => void;
  onOpenWallpaperMenu: Dispatch<SetStateAction<WallpaperTarget | null>>;
  onRemoveWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  onTriggerWallpaperFilePicker: (device: WallpaperDevice) => void;
  onUploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => void;
  onOpenAssetUrlDialog: (target: AssetTarget) => void;
  onOpenAssetMenu: Dispatch<SetStateAction<AssetTarget | null>>;
  onRemoveAsset: (theme: ThemeMode, kind: AssetKind) => void;
  onTriggerAssetFilePicker: (kind: AssetKind) => void;
  onTypographyChange: (theme: ThemeMode) => void;
  onRestoreTypographyDefaults: (theme: ThemeMode) => void;
  onCardFrostedChange: (theme: ThemeMode) => void;
}) {
  const theme = appearanceThemeTab;
  const wallpaperMenuFor = (device: WallpaperDevice) =>
    appearanceMenuTarget?.theme === theme && appearanceMenuTarget.device === device;
  const assetMenuFor = (kind: AssetKind) =>
    assetMenuTarget?.theme === theme && assetMenuTarget.kind === kind;
  const hasDesktopWallpaper = Boolean(appearanceDraft[theme].desktopWallpaperUrl);
  const hasMobileWallpaper = Boolean(appearanceDraft[theme].mobileWallpaperUrl);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(["light", "dark"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setAppearanceThemeTab(mode);
              onOpenWallpaperMenu(null);
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
              appearanceThemeTab === mode
                ? "bg-white text-slate-950"
                : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
            )}
          >
            {mode === "light" ? "明亮主题" : "暗黑主题"}
          </button>
        ))}
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">默认模式</h3>
            <p className="mt-1 text-sm text-white/65">
              设置首次访问用户看到的默认主题。
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className="text-sm text-white/70">设为默认</span>
            <button
              type="button"
              role="switch"
              aria-checked={appearanceDraft[theme].isDefault}
              onClick={() => {
                setAppearanceDraft((current) => {
                  const newIsDefault = !current[theme].isDefault;
                  return {
                    light: {
                      ...current.light,
                      isDefault: theme === "light" ? newIsDefault : !newIsDefault ? current.light.isDefault : false,
                    },
                    dark: {
                      ...current.dark,
                      isDefault: theme === "dark" ? newIsDefault : !newIsDefault ? current.dark.isDefault : false,
                    },
                  };
                });
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/30",
                appearanceDraft[theme].isDefault ? "bg-white" : "bg-white/20",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-flex h-5 w-5 translate-x-0.5 items-center justify-center rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out",
                  appearanceDraft[theme].isDefault ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </label>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">Logo 与 Favicon</h3>
        <p className="mt-1 text-sm text-white/65">
          自定义网站右上角 Logo 和浏览器标签图标。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2 text-sm">
            <span className="text-white/75">网站 Logo</span>
            <AssetSlotCard
              label="Logo"
              imageUrl={appearanceDraft[theme].logoUrl}
              uploading={uploadingAssetTheme === theme}
              menuOpen={assetMenuFor("logo")}
              onOpenMenu={() => onOpenAssetMenu({ theme, kind: "logo" })}
              onCloseMenu={() => onOpenAssetMenu(null)}
              onUploadLocal={() => onTriggerAssetFilePicker("logo")}
              onUploadByUrl={() => onOpenAssetUrlDialog({ theme, kind: "logo" })}
              onRemove={() => onRemoveAsset(theme, "logo")}
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUploadAsset(theme, "logo", file);
                }
                event.target.value = "";
              }}
              className="hidden"
            />
          </div>

          <div className="grid gap-2 text-sm">
            <span className="text-white/75">Favicon</span>
            <AssetSlotCard
              label="Favicon"
              imageUrl={appearanceDraft[theme].faviconUrl}
              uploading={uploadingAssetTheme === theme}
              menuOpen={assetMenuFor("favicon")}
              onOpenMenu={() => onOpenAssetMenu({ theme, kind: "favicon" })}
              onCloseMenu={() => onOpenAssetMenu(null)}
              onUploadLocal={() => onTriggerAssetFilePicker("favicon")}
              onUploadByUrl={() => onOpenAssetUrlDialog({ theme, kind: "favicon" })}
              onRemove={() => onRemoveAsset(theme, "favicon")}
            />
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onUploadAsset(theme, "favicon", file);
                }
                event.target.value = "";
              }}
              className="hidden"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">网站卡片磨砂效果</h3>
        <p className="mt-1 text-sm text-white/65">
          开启后网站卡片将使用磨砂背景，关闭则为透明效果。需要先设置对应端的壁纸。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* 桌面端磨砂效果 */}
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-white/75">桌面端磨砂效果</span>
                <p className="mt-1 text-xs text-white/50">
                  {hasDesktopWallpaper ? "需要设置桌面端壁纸" : "需要先设置桌面端壁纸"}
                </p>
              </div>
              <label className={cn(
                "inline-flex items-center gap-2",
                hasDesktopWallpaper ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}>
                <span className="text-xs text-white/70">{appearanceDraft[theme].desktopCardFrosted ? "已开启" : "已关闭"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={appearanceDraft[theme].desktopCardFrosted}
                  disabled={!hasDesktopWallpaper}
                  onClick={() => {
                    if (!hasDesktopWallpaper) return;
                    setAppearanceDraft((current) => ({
                      ...current,
                      [theme]: {
                        ...current[theme],
                        desktopCardFrosted: !current[theme].desktopCardFrosted,
                      },
                    }));
                    onCardFrostedChange(theme);
                  }}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/30",
                    hasDesktopWallpaper
                      ? appearanceDraft[theme].desktopCardFrosted ? "bg-white" : "bg-white/20"
                      : "bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out",
                      appearanceDraft[theme].desktopCardFrosted ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* 移动端磨砂效果 */}
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-white/75">移动端磨砂效果</span>
                <p className="mt-1 text-xs text-white/50">
                  {hasMobileWallpaper ? "需要设置移动端壁纸" : "需要先设置移动端壁纸"}
                </p>
              </div>
              <label className={cn(
                "inline-flex items-center gap-2",
                hasMobileWallpaper ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}>
                <span className="text-xs text-white/70">{appearanceDraft[theme].mobileCardFrosted ? "已开启" : "已关闭"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={appearanceDraft[theme].mobileCardFrosted}
                  disabled={!hasMobileWallpaper}
                  onClick={() => {
                    if (!hasMobileWallpaper) return;
                    setAppearanceDraft((current) => ({
                      ...current,
                      [theme]: {
                        ...current[theme],
                        mobileCardFrosted: !current[theme].mobileCardFrosted,
                      },
                    }));
                    onCardFrostedChange(theme);
                  }}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-white/30",
                    hasMobileWallpaper
                      ? appearanceDraft[theme].mobileCardFrosted ? "bg-white" : "bg-white/20"
                      : "bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 shadow ring-0 transition duration-200 ease-in-out",
                      appearanceDraft[theme].mobileCardFrosted ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">壁纸</h3>
        <p className="mt-1 text-sm text-white/65">
          为当前主题设置桌面端和移动端背景。
        </p>
        <div className="mt-4 grid gap-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="grid gap-2 text-sm">
              <span className="text-white/75">桌面端壁纸</span>
              <input
                ref={desktopWallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadWallpaper(theme, "desktop", file);
                  }
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />
              <WallpaperSlotCard
                label="桌面端壁纸"
                imageUrl={appearanceDraft[theme].desktopWallpaperUrl}
                uploading={uploadingTheme === theme}
                menuOpen={wallpaperMenuFor("desktop")}
                onOpenMenu={() =>
                  onOpenWallpaperMenu((current) =>
                    current?.theme === theme && current.device === "desktop"
                      ? null
                      : { theme, device: "desktop" },
                  )
                }
                onCloseMenu={() => onOpenWallpaperMenu(null)}
                onUploadLocal={() => onTriggerWallpaperFilePicker("desktop")}
                onUploadByUrl={() => onOpenWallpaperUrlDialog({ theme, device: "desktop" })}
                onRemove={() => onRemoveWallpaper(theme, "desktop")}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="grid gap-2 text-sm">
              <span className="text-white/75">移动端壁纸</span>
              <input
                ref={mobileWallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    onUploadWallpaper(theme, "mobile", file);
                  }
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />
              <WallpaperSlotCard
                label="移动端壁纸"
                imageUrl={appearanceDraft[theme].mobileWallpaperUrl}
                uploading={uploadingTheme === theme}
                menuOpen={wallpaperMenuFor("mobile")}
                onOpenMenu={() =>
                  onOpenWallpaperMenu((current) =>
                    current?.theme === theme && current.device === "mobile"
                      ? null
                      : { theme, device: "mobile" },
                  )
                }
                onCloseMenu={() => onOpenWallpaperMenu(null)}
                onUploadLocal={() => onTriggerWallpaperFilePicker("mobile")}
                onUploadByUrl={() => onOpenWallpaperUrlDialog({ theme, device: "mobile" })}
                onRemove={() => onRemoveWallpaper(theme, "mobile")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">字体样式与颜色</h3>
            <p className="mt-1 text-sm text-white/65">
              调整当前主题的字体和文字颜色。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRestoreTypographyDefaults(theme)}
            className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/82 transition hover:bg-white/14"
          >
            恢复默认
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="text-white/75">字体预设</span>
            <select
              value={appearanceDraft[theme].fontPreset}
              onChange={(event) => {
                setAppearanceDraft((current) => ({
                  ...current,
                  [theme]: {
                    ...current[theme],
                    fontPreset: event.target.value as FontPresetKey,
                  },
                }));
                onTypographyChange(theme);
              }}
              style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
              className="rounded-2xl border border-white/12 bg-white px-4 py-3 text-slate-900 outline-none"
            >
              {Object.entries(fontPresets).map(([key, value]) => (
                <option
                  key={key}
                  value={key}
                  style={{ color: "#0f172a", backgroundColor: "#ffffff" }}
                >
                  {value.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-white/75">字体大小</span>
            <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4">
              <div className="mb-3 flex items-center justify-between text-sm text-white/70">
                <span>全站基础字号</span>
                <span>{appearanceDraft[theme].fontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={24}
                step={1}
                value={appearanceDraft[theme].fontSize}
                onChange={(event) => {
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      fontSize: Number(event.target.value),
                    },
                  }));
                  onTypographyChange(theme);
                }}
                className="h-2 w-full cursor-pointer accent-white"
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="text-white/75">文字颜色</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/8 px-3 py-3">
              <input
                type="color"
                value={appearanceDraft[theme].textColor}
                onChange={(event) => {
                  setAppearanceDraft((current) => ({
                    ...current,
                    [theme]: {
                      ...current[theme],
                      textColor: event.target.value,
                    },
                  }));
                  onTypographyChange(theme);
                }}
                className="h-12 w-16 rounded-2xl border border-white/12 bg-white/8 px-1"
              />
              <span className="text-sm text-white/70">{appearanceDraft[theme].textColor}</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
