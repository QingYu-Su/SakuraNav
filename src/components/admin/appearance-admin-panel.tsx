/**
 * 外观管理面板组件
 * @description 提供主题外观配置界面，包括壁纸、Logo、字体、磨砂效果等设置
 */

"use client";

import { type Dispatch, type RefObject, type SetStateAction, useState } from "react";
import { type FontPresetKey, type ThemeMode } from "@/lib/base/types";
import { fontPresets } from "@/lib/config/config";
import { cn } from "@/lib/utils/utils";
import { WallpaperSlotCard } from "./wallpaper-slot-card";
import { AssetSlotCard } from "./asset-slot-card";
import type { AppearanceDraft } from "./types";
import type { WallpaperDevice, WallpaperTarget } from "../dialogs/wallpaper-url-dialog";
import type { AssetKind, AssetTarget } from "../dialogs/asset-url-dialog";
import { getDialogSectionClass, getDialogSubtleClass } from "@/components/sakura-nav/style-helpers";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

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
  themeMode = "dark",
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
  themeMode?: ThemeMode;
}) {
  const theme = appearanceThemeTab;

  /* ---- 裁剪弹窗状态 ---- */
  type CropTarget = "wallpaper-desktop" | "wallpaper-mobile" | "logo" | "favicon";
  type PendingCrop = { src: string; target: CropTarget; cropTheme: ThemeMode };
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);

  /** 根据裁剪目标获取裁剪配置 */
  function getCropConfig(target: CropTarget) {
    switch (target) {
      case "wallpaper-desktop":
        return { cropShape: "rect" as const, aspectRatio: 16 / 9, outputType: "image/jpeg" as const };
      case "wallpaper-mobile":
        return { cropShape: "rect" as const, aspectRatio: 9 / 16, outputType: "image/jpeg" as const };
      case "logo":
        return { cropShape: "rect" as const, aspectRatio: 1, outputType: "image/png" as const };
      case "favicon":
        return { cropShape: "round" as const, aspectRatio: 1, outputType: "image/png" as const };
    }
  }

  /** 裁剪确认后调用对应上传回调 */
  async function handleCropConfirm(blob: Blob) {
    if (!pendingCrop) return;
    const { target, cropTheme } = pendingCrop;
    const src = pendingCrop.src;
    setPendingCrop(null);
    URL.revokeObjectURL(src);

    const isWallpaper = target === "wallpaper-desktop" || target === "wallpaper-mobile";
    const fileName = isWallpaper ? "wallpaper.jpg" : "icon.png";
    const file = new File([blob], fileName, { type: blob.type });

    if (target === "wallpaper-desktop") onUploadWallpaper(cropTheme, "desktop", file);
    else if (target === "wallpaper-mobile") onUploadWallpaper(cropTheme, "mobile", file);
    else if (target === "logo") onUploadAsset(cropTheme, "logo", file);
    else if (target === "favicon") onUploadAsset(cropTheme, "favicon", file);
  }

  function handleCropCancel() {
    if (pendingCrop) URL.revokeObjectURL(pendingCrop.src);
    setPendingCrop(null);
  }

  const wallpaperMenuFor = (device: WallpaperDevice) =>
    appearanceMenuTarget?.theme === theme && appearanceMenuTarget.device === device;
  const assetMenuFor = (kind: AssetKind) =>
    assetMenuTarget?.theme === theme && assetMenuTarget.kind === kind;
  const tabActiveClass = themeMode === "light"
    ? "bg-slate-900 text-white"
    : "bg-white text-slate-950";
  const tabInactiveClass = themeMode === "light"
    ? "border border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100"
    : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12";

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
              appearanceThemeTab === mode ? tabActiveClass : tabInactiveClass,
            )}
          >
            {mode === "light" ? "明亮主题" : "暗黑主题"}
          </button>
        ))}
      </div>

      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">默认模式</h3>
            <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
              设置首次访问用户看到的默认主题。
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <span className={cn("text-sm", themeMode === "light" ? "text-slate-600" : "text-white/70")}>设为默认</span>
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
                "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2",
                themeMode === "light" ? "focus:ring-slate-300" : "focus:ring-white/30",
                appearanceDraft[theme].isDefault
                  ? themeMode === "light" ? "bg-slate-900" : "bg-white"
                  : themeMode === "light" ? "bg-slate-200" : "bg-white/20",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-flex h-5 w-5 items-center justify-center rounded-full shadow ring-0 transition duration-200 ease-in-out",
                  themeMode === "light" ? "bg-white" : "bg-slate-900",
                  appearanceDraft[theme].isDefault ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </label>
        </div>
      </section>

      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">Logo 与 Favicon</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          自定义网站右上角 Logo 和浏览器标签图标。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2 text-sm">
            <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>网站 Logo</span>
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
              themeMode={themeMode}
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setPendingCrop({ src: URL.createObjectURL(file), target: "logo", cropTheme: theme });
                }
                event.currentTarget.value = "";
              }}
              className="hidden"
            />
          </div>

          <div className="grid gap-2 text-sm">
            <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>Favicon</span>
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
              themeMode={themeMode}
              rounded
            />
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setPendingCrop({ src: URL.createObjectURL(file), target: "favicon", cropTheme: theme });
                }
                event.currentTarget.value = "";
              }}
              className="hidden"
            />
          </div>
        </div>
      </section>

      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">磨砂效果</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          为卡片和 UI 组件添加磨砂背景效果。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* 桌面端磨砂效果 */}
          <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
            <div className="flex items-center justify-between">
              <div>
                <span className={cn("text-sm", themeMode === "light" ? "text-slate-600" : "text-white/75")}>桌面端磨砂效果</span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className={cn("text-xs", themeMode === "light" ? "text-slate-500" : "text-white/70")}>{appearanceDraft[theme].desktopCardFrosted ? "已开启" : "已关闭"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={appearanceDraft[theme].desktopCardFrosted}
                  onClick={() => {
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
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2",
                    themeMode === "light" ? "focus:ring-slate-300" : "focus:ring-white/30",
                    appearanceDraft[theme].desktopCardFrosted
                      ? themeMode === "light" ? "bg-slate-900" : "bg-white"
                      : themeMode === "light" ? "bg-slate-200" : "bg-white/20",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full shadow ring-0 transition duration-200 ease-in-out",
                      themeMode === "light" ? "bg-white" : "bg-slate-900",
                      appearanceDraft[theme].desktopCardFrosted ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* 移动端磨砂效果 */}
          <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
            <div className="flex items-center justify-between">
              <div>
                <span className={cn("text-sm", themeMode === "light" ? "text-slate-600" : "text-white/75")}>移动端磨砂效果</span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className={cn("text-xs", themeMode === "light" ? "text-slate-500" : "text-white/70")}>{appearanceDraft[theme].mobileCardFrosted ? "已开启" : "已关闭"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={appearanceDraft[theme].mobileCardFrosted}
                  onClick={() => {
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
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2",
                    themeMode === "light" ? "focus:ring-slate-300" : "focus:ring-white/30",
                    appearanceDraft[theme].mobileCardFrosted
                      ? themeMode === "light" ? "bg-slate-900" : "bg-white"
                      : themeMode === "light" ? "bg-slate-200" : "bg-white/20",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-flex h-4 w-4 items-center justify-center rounded-full shadow ring-0 transition duration-200 ease-in-out",
                      themeMode === "light" ? "bg-white" : "bg-slate-900",
                      appearanceDraft[theme].mobileCardFrosted ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">壁纸</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          为当前主题设置桌面端和移动端背景。
        </p>
        <div className="mt-4 grid gap-4">
          <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
            <div className="grid gap-2 text-sm">
              <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>桌面端壁纸</span>
              <input
                ref={desktopWallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setPendingCrop({ src: URL.createObjectURL(file), target: "wallpaper-desktop", cropTheme: theme });
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
                themeMode={themeMode}
              />
            </div>
          </div>

          <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
            <div className="grid gap-2 text-sm">
              <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>移动端壁纸</span>
              <input
                ref={mobileWallpaperInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setPendingCrop({ src: URL.createObjectURL(file), target: "wallpaper-mobile", cropTheme: theme });
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
                themeMode={themeMode}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">字体样式与颜色</h3>
            <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
              调整当前主题的字体和文字颜色。
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRestoreTypographyDefaults(theme)}
            className={cn(
              "inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm transition",
              themeMode === "light"
                ? "border-slate-200/60 bg-white text-slate-600 hover:bg-slate-50"
                : "border-white/12 bg-white/8 text-white/82 hover:bg-white/14",
            )}
          >
            恢复默认
          </button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>字体预设</span>
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
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none"
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
            <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>字体大小</span>
            <div className={cn("rounded-2xl border px-4 py-4", themeMode === "light" ? "border-slate-200/60 bg-slate-50" : "border-white/12 bg-white/8")}>
              <div className={cn("mb-3 flex items-center justify-between text-sm", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
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
                className={cn("h-2 w-full cursor-pointer", themeMode === "light" ? "accent-slate-900" : "accent-white")}
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm">
            <span className={cn(themeMode === "light" ? "text-slate-600" : "text-white/75")}>文字颜色</span>
            <div className={cn("flex items-center gap-3 rounded-2xl border px-3 py-3", themeMode === "light" ? "border-slate-200/60 bg-slate-50" : "border-white/12 bg-white/8")}>
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
                className={cn("h-12 w-16 rounded-2xl border px-1", themeMode === "light" ? "border-slate-200/60 bg-slate-50" : "border-white/12 bg-white/8")}
              />
              <span className={cn("text-sm", themeMode === "light" ? "text-slate-600" : "text-white/70")}>{appearanceDraft[theme].textColor}</span>
            </div>
          </label>
    </div>
    </section>

    {/* 裁剪弹窗 */}
    {pendingCrop && (() => {
      const config = getCropConfig(pendingCrop.target);
      return (
        <ImageCropDialog
          imageSrc={pendingCrop.src}
          cropShape={config.cropShape}
          aspectRatio={config.aspectRatio}
          outputType={config.outputType}
          circular={pendingCrop.target === "favicon"}
          onConfirm={(blob) => void handleCropConfirm(blob)}
          onCancel={handleCropCancel}
          themeMode={themeMode}
        />
      );
    })()}
    </div>
  );
}
