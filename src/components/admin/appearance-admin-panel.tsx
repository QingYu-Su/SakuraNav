/**
 * 外观管理面板组件
 * @description 提供主题外观配置界面，包括壁纸、磨砂效果等设置
 */

"use client";

import { type Dispatch, type RefObject, type SetStateAction, useState } from "react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { WallpaperSlotCard } from "./wallpaper-slot-card";
import type { AppearanceDraft } from "./types";
import type { WallpaperDevice } from "@/hooks/use-appearance";
import { getDialogSectionClass, getDialogSubtleClass } from "@/components/sakura-nav/style-helpers";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";

export function AppearanceAdminPanel({
  appearanceThemeTab,
  setAppearanceThemeTab,
  appearanceDraft,
  setAppearanceDraft,
  uploadingTheme,
  desktopWallpaperInputRef,
  mobileWallpaperInputRef,
  uploadingAssetTheme: _uploadingAssetTheme,
  onUploadWallpaper,
  onRemoveWallpaper,
  onTriggerWallpaperFilePicker,
  onCardFrostedChange,
  themeMode = "dark",
}: {
  appearanceThemeTab: ThemeMode;
  setAppearanceThemeTab: Dispatch<SetStateAction<ThemeMode>>;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: Dispatch<SetStateAction<AppearanceDraft>>;
  uploadingTheme: ThemeMode | null;
  desktopWallpaperInputRef: RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: RefObject<HTMLInputElement | null>;
  uploadingAssetTheme: ThemeMode | null;
  onUploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => void;
  onRemoveWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  onTriggerWallpaperFilePicker: (device: WallpaperDevice) => void;
  onCardFrostedChange: (theme: ThemeMode) => void;
  themeMode?: ThemeMode;
}) {
  const theme = appearanceThemeTab;

  /* ---- 裁剪弹窗状态 ---- */
  type CropTarget = "wallpaper-desktop" | "wallpaper-mobile";
  type PendingCrop = { src: string; target: CropTarget; cropTheme: ThemeMode };
  const [pendingCrop, setPendingCrop] = useState<PendingCrop | null>(null);

  /** 根据裁剪目标获取裁剪配置 */
  function getCropConfig(target: CropTarget) {
    switch (target) {
      case "wallpaper-desktop":
        return { cropShape: "rect" as const, aspectRatio: 16 / 9, outputType: "image/jpeg" as const };
      case "wallpaper-mobile":
        return { cropShape: "rect" as const, aspectRatio: 9 / 16, outputType: "image/jpeg" as const };
    }
  }

  /** 裁剪确认后调用对应上传回调 */
  async function handleCropConfirm(blob: Blob) {
    if (!pendingCrop) return;
    const { target, cropTheme } = pendingCrop;
    const src = pendingCrop.src;
    setPendingCrop(null);
    URL.revokeObjectURL(src);

    const fileName = "wallpaper.jpg";
    const file = new File([blob], fileName, { type: blob.type });

    if (target === "wallpaper-desktop") onUploadWallpaper(cropTheme, "desktop", file);
    else if (target === "wallpaper-mobile") onUploadWallpaper(cropTheme, "mobile", file);
  }

  function handleCropCancel() {
    if (pendingCrop) URL.revokeObjectURL(pendingCrop.src);
    setPendingCrop(null);
  }

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
        <h3 className="text-lg font-semibold">磨砂效果</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          调整卡片和 UI 组件的磨砂背景强度。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* 桌面端磨砂效果 */}
          <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
            <div className="mb-3 flex items-center justify-between">
              <span className={cn("text-sm", themeMode === "light" ? "text-slate-600" : "text-white/75")}>桌面端磨砂强度</span>
              <span className={cn("text-xs tabular-nums", themeMode === "light" ? "text-slate-500" : "text-white/70")}>{appearanceDraft[theme].desktopCardFrosted}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={appearanceDraft[theme].desktopCardFrosted}
              onChange={(event) => {
                setAppearanceDraft((current) => ({
                  ...current,
                  [theme]: {
                    ...current[theme],
                    desktopCardFrosted: Number(event.target.value),
                  },
                }));
                onCardFrostedChange(theme);
              }}
              className="h-2 w-full cursor-pointer"
            />
            <div className={cn("mt-1 flex justify-between text-[11px]", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
              <span>透明</span>
              <span>最强</span>
            </div>
          </div>

          {/* 移动端磨砂效果 */}
          <div className={cn("rounded-[24px] border p-4", getDialogSectionClass(themeMode))}>
            <div className="mb-3 flex items-center justify-between">
              <span className={cn("text-sm", themeMode === "light" ? "text-slate-600" : "text-white/75")}>移动端磨砂强度</span>
              <span className={cn("text-xs tabular-nums", themeMode === "light" ? "text-slate-500" : "text-white/70")}>{appearanceDraft[theme].mobileCardFrosted}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={appearanceDraft[theme].mobileCardFrosted}
              onChange={(event) => {
                setAppearanceDraft((current) => ({
                  ...current,
                  [theme]: {
                    ...current[theme],
                    mobileCardFrosted: Number(event.target.value),
                  },
                }));
                onCardFrostedChange(theme);
              }}
              className="h-2 w-full cursor-pointer"
            />
            <div className={cn("mt-1 flex justify-between text-[11px]", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
              <span>透明</span>
              <span>最强</span>
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
                onUploadLocal={() => onTriggerWallpaperFilePicker("desktop")}
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
                onUploadLocal={() => onTriggerWallpaperFilePicker("mobile")}
                onRemove={() => onRemoveWallpaper(theme, "mobile")}
                themeMode={themeMode}
              />
            </div>
          </div>
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
          circular={false}
          onConfirm={(blob) => void handleCropConfirm(blob)}
          onCancel={handleCropCancel}
          themeMode={themeMode}
        />
      );
    })()}
    </div>
  );
}
