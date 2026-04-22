/**
 * 设置弹窗
 * @description 居中弹窗，包含「外观」「快捷」「其他」三个子面板
 */

import { X, PaintBucket, Settings2, MousePointerClick } from "lucide-react";
import { AppearanceAdminPanel } from "@/components/admin";
import type { AppearanceDraft } from "@/components/admin";
import { ConfigAdminPanel } from "@/components/admin";
import { FloatingButtonsPanel } from "@/components/admin";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode, FloatingButtonItem } from "@/lib/base/types";
import type { UndoAction } from "@/hooks/use-undo-stack";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
import type { RefObject } from "react";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogSecondaryBtnClass,
} from "./style-helpers";

export type SettingsTab = "appearance" | "shortcuts" | "other";

type SettingsModalProps = {
  open: boolean;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
  themeMode: ThemeMode;

  /* ── 外观面板透传 ── */
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

  /* ── 配置面板透传 ── */
  siteName: string;
  siteNameBusy: boolean;
  busyAction: "import" | "export" | "reset" | null;
  analyzing: boolean;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onSiteNameChange: (name: string) => void;
  onExport: () => void;
  onImportClick: () => void;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;

  /* ── 快捷按钮面板透传 ── */
  floatingButtons: FloatingButtonItem[];
  onFloatingButtonsChange: (buttons: FloatingButtonItem[]) => void;
  onFloatingButtonsNotify: (msg: string, undo: UndoAction) => void;
};

const tabs = [
  { key: "appearance" as const, label: "外观", icon: PaintBucket },
  { key: "shortcuts" as const, label: "快捷", icon: MousePointerClick },
  { key: "other" as const, label: "其他", icon: Settings2 },
];

export function SettingsModal({
  open,
  activeTab,
  onTabChange,
  onClose,
  themeMode,

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

  siteName,
  siteNameBusy,
  busyAction,
  analyzing,
  onlineCheckEnabled,
  onlineCheckTime,
  onlineCheckBusy,
  onlineCheckResult,
  onSiteNameChange,
  onExport,
  onImportClick,
  onReset,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,

  floatingButtons,
  onFloatingButtonsChange,
  onFloatingButtonsNotify,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "fixed inset-0 z-50 flex items-center justify-center p-4")}>
      <div
        className={cn(
          getDialogPanelClass(themeMode),
          "flex h-[min(85vh,760px)] w-full max-w-[760px] flex-col rounded-[28px] border",
        )}
      >
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Settings</p>
            <h2 className="mt-1 text-2xl font-semibold">设置</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className={cn("flex gap-2 border-b px-6 py-4", getDialogDividerClass(themeMode))}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                activeTab === tab.key
                  ? themeMode === "light" ? "bg-slate-900 text-white" : "bg-white text-slate-950"
                  : cn(getDialogSecondaryBtnClass(themeMode), themeMode === "light" ? "text-slate-600" : "text-white/80"),
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === "appearance" ? (
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
              themeMode={themeMode}
            />
          ) : null}
          {activeTab === "shortcuts" ? (
            <FloatingButtonsPanel
              themeMode={themeMode}
              buttons={floatingButtons}
              onButtonsChange={onFloatingButtonsChange}
              onNotify={onFloatingButtonsNotify}
            />
          ) : null}
          {activeTab === "other" ? (
            <ConfigAdminPanel
              siteName={siteName}
              siteNameBusy={siteNameBusy}
              busyAction={busyAction}
              analyzing={analyzing}
              onlineCheckEnabled={onlineCheckEnabled}
              onlineCheckTime={onlineCheckTime}
              onlineCheckBusy={onlineCheckBusy}
              onlineCheckResult={onlineCheckResult}
              onSiteNameChange={onSiteNameChange}
              onExport={onExport}
              onImportClick={onImportClick}
              onReset={onReset}
              onOnlineCheckToggle={onOnlineCheckToggle}
              onOnlineCheckTimeChange={onOnlineCheckTimeChange}
              onRunOnlineCheck={onRunOnlineCheck}
              themeMode={themeMode}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
