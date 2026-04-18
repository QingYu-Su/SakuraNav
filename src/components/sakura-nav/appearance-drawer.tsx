/**
 * 外观抽屉
 */

import { X } from "lucide-react";
import { AppearanceAdminPanel } from "@/components/admin";
import type { AppearanceDraft } from "@/components/admin";
import type { ThemeMode } from "@/lib/base/types";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
import type { RefObject } from "react";
import React from "react";

type AppearanceDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  appearanceThemeTab: ThemeMode;
  setAppearanceThemeTab: React.Dispatch<React.SetStateAction<ThemeMode>>;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: React.Dispatch<React.SetStateAction<AppearanceDraft>>;
  uploadingTheme: ThemeMode | null;
  appearanceMenuTarget: WallpaperTarget | null;
  assetMenuTarget: AssetTarget | null;
  uploadingAssetTheme: ThemeMode | null;
  desktopWallpaperInputRef: RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: RefObject<HTMLInputElement | null>;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  onUploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => void;
  onOpenWallpaperUrlDialog: (target: WallpaperTarget) => void;
  onOpenWallpaperMenu: React.Dispatch<React.SetStateAction<WallpaperTarget | null>>;
  onRemoveWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  onTriggerWallpaperFilePicker: (device: WallpaperDevice) => void;
  onUploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => void;
  onOpenAssetUrlDialog: (target: AssetTarget) => void;
  onOpenAssetMenu: React.Dispatch<React.SetStateAction<AssetTarget | null>>;
  onRemoveAsset: (theme: ThemeMode, kind: AssetKind) => void;
  onTriggerAssetFilePicker: (kind: AssetKind) => void;
  onTypographyChange: (theme: ThemeMode) => void;
  onRestoreTypographyDefaults: (theme: ThemeMode) => void;
  onCardFrostedChange: (theme: ThemeMode) => void;
  onClose: () => void;
};



export function AppearanceDrawer({
  open,
  isAuthenticated,
  appearanceThemeTab,
  setAppearanceThemeTab,
  appearanceDraft,
  setAppearanceDraft,
  uploadingTheme,
  appearanceMenuTarget,
  assetMenuTarget,
  uploadingAssetTheme,
  desktopWallpaperInputRef,
  mobileWallpaperInputRef,
  logoInputRef,
  faviconInputRef,
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
  onClose,
}: AppearanceDrawerProps) {
  if (!open || !isAuthenticated) return null;

  return (
    <div className="animate-drawer-fade fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
      <div className="animate-drawer-slide flex h-full w-full max-w-[720px] flex-col border-l border-white/12 bg-[#0f172af2] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Appearance</p>
            <h2 className="mt-1 text-2xl font-semibold">外观</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
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
            appearanceMenuTarget={appearanceMenuTarget}
            desktopWallpaperInputRef={desktopWallpaperInputRef}
            mobileWallpaperInputRef={mobileWallpaperInputRef}
            logoInputRef={logoInputRef}
            faviconInputRef={faviconInputRef}
            assetMenuTarget={assetMenuTarget}
            uploadingAssetTheme={uploadingAssetTheme}
            onUploadWallpaper={onUploadWallpaper}
            onOpenWallpaperUrlDialog={onOpenWallpaperUrlDialog}
            onOpenWallpaperMenu={onOpenWallpaperMenu}
            onRemoveWallpaper={onRemoveWallpaper}
            onTriggerWallpaperFilePicker={onTriggerWallpaperFilePicker}
            onUploadAsset={onUploadAsset}
            onOpenAssetUrlDialog={onOpenAssetUrlDialog}
            onOpenAssetMenu={onOpenAssetMenu}
            onRemoveAsset={onRemoveAsset}
            onTriggerAssetFilePicker={onTriggerAssetFilePicker}
            onTypographyChange={onTypographyChange}
            onRestoreTypographyDefaults={onRestoreTypographyDefaults}
            onCardFrostedChange={onCardFrostedChange}
          />
        </div>
      </div>
    </div>
  );
}
