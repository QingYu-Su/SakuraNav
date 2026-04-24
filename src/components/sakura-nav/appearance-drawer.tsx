/**
 * 外观抽屉
 */

import { X } from "lucide-react";
import { AppearanceAdminPanel } from "@/components/admin";
import type { AppearanceDraft } from "@/components/admin";
import type { ThemeMode } from "@/lib/base/types";
import type { WallpaperDevice } from "@/hooks/use-appearance";
import type { RefObject } from "react";
import { cn } from "@/lib/utils/utils";
import { getDialogOverlayClass, getDrawerPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "./style-helpers";
import React from "react";

type AppearanceDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  appearanceThemeTab: ThemeMode;
  setAppearanceThemeTab: React.Dispatch<React.SetStateAction<ThemeMode>>;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: React.Dispatch<React.SetStateAction<AppearanceDraft>>;
  uploadingTheme: ThemeMode | null;
  uploadingAssetTheme: ThemeMode | null;
  desktopWallpaperInputRef: RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: RefObject<HTMLInputElement | null>;
  onUploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => void;
  onRemoveWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  onTriggerWallpaperFilePicker: (device: WallpaperDevice) => void;
  onCardFrostedChange: (theme: ThemeMode) => void;
  onClose: () => void;
  themeMode: ThemeMode;
};



export function AppearanceDrawer({
  open,
  isAuthenticated,
  appearanceThemeTab,
  setAppearanceThemeTab,
  appearanceDraft,
  setAppearanceDraft,
  uploadingTheme,
  uploadingAssetTheme,
  desktopWallpaperInputRef,
  mobileWallpaperInputRef,
  onUploadWallpaper,
  onRemoveWallpaper,
  onTriggerWallpaperFilePicker,
  onCardFrostedChange,
  onClose,
  themeMode,
}: AppearanceDrawerProps) {
  if (!open || !isAuthenticated) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex justify-end")}>
      <div className={cn(getDrawerPanelClass(themeMode), "animate-drawer-slide flex h-full w-full max-w-[720px] flex-col border-l")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Appearance</p>
            <h2 className="mt-1 text-2xl font-semibold">外观</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AppearanceAdminPanel
            appearanceThemeTab={appearanceThemeTab}
            setAppearanceThemeTab={setAppearanceThemeTab}
            appearanceDraft={appearanceDraft}
            setAppearanceDraft={setAppearanceDraft}
            uploadingTheme={uploadingTheme}
            desktopWallpaperInputRef={desktopWallpaperInputRef}
            mobileWallpaperInputRef={mobileWallpaperInputRef}
            uploadingAssetTheme={uploadingAssetTheme}
            onUploadWallpaper={onUploadWallpaper}
            onRemoveWallpaper={onRemoveWallpaper}
            onTriggerWallpaperFilePicker={onTriggerWallpaperFilePicker}
            onCardFrostedChange={onCardFrostedChange}
            themeMode={themeMode}
          />
        </div>
      </div>
    </div>
  );
}
