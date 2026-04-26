/**
 * 设置弹窗
 * @description 居中弹窗，包含「外观」「数据」「站点」「管理」四个子面板
 */

import { useState, useEffect, useCallback } from "react";
import { X, PaintBucket, Database, Globe, Shield, Trash2, UserPlus, LoaderCircle, Save, CheckCircle2 } from "lucide-react";
import { ImageCropDialog } from "@/components/dialogs/image-crop-dialog";
import { requestJson } from "@/lib/base/api";
import type { ThemeMode, FloatingButtonItem, UserRole, User } from "@/lib/base/types";
import { AppearanceAdminPanel } from "@/components/admin";
import type { AppearanceDraft } from "@/components/admin";
import { ConfigAdminPanel } from "@/components/admin";
import { FloatingButtonsPanel } from "@/components/admin";
import { cn } from "@/lib/utils/utils";
import type { WallpaperDevice } from "@/hooks/use-appearance";
import type { AssetKind } from "@/hooks/use-appearance";
import type { RefObject } from "react";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogSecondaryBtnClass,
  getDialogSectionClass,
  getDialogInputClass,
} from "./style-helpers";
import { AssetSlotCard } from "@/components/admin/asset-slot-card";
import { AiModelPanel } from "@/components/admin/ai-model-panel";

export type SettingsTab = "appearance" | "data" | "site" | "management";

type SettingsModalProps = {
  open: boolean;
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onClose: () => void;
  themeMode: ThemeMode;
  role: UserRole | null;
  /** 设置弹窗内嵌错误提示 */
  settingsError: string;
  onClearSettingsError: () => void;

  /* ── 外观面板透传 ── */
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

  /* ── 数据面板透传 ── */
  busyAction: "import" | "export" | "reset" | "clear" | null;
  analyzing: boolean;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onExport: () => void;
  onImportClick: () => void;
  importError: string;
  onReset: () => void;
  onClear: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;
  exportCooldown?: boolean;
  exportCooldownSec?: number;

  /* ── 站点面板透传 ── */
  settingsDraft: import("@/lib/base/types").AppSettings;
  siteName: string;
  onSiteNameChange: (name: string) => void;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  onUploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => void;
  onRemoveAsset: (theme: ThemeMode, kind: AssetKind) => void;
  onTriggerAssetFilePicker: (kind: AssetKind) => void;
  floatingButtons: FloatingButtonItem[];
  onFloatingButtonsChange: (buttons: FloatingButtonItem[]) => void;
  onSaveGlobal: (siteName: string | null, floatingButtons: FloatingButtonItem[] | null, aiConfig?: { aiApiKey: string; aiBaseUrl: string; aiModel: string } | null) => Promise<boolean>;
  /* ── AI 草稿配置（页面级状态） ── */
  aiDraftConfig: { aiApiKey: string; aiBaseUrl: string; aiModel: string };
  onAiDraftChange: (field: "aiApiKey" | "aiBaseUrl" | "aiModel", value: string) => void;
};

const baseTabs = [
  { key: "appearance" as const, label: "外观", icon: PaintBucket, privilege: "none" as const },
  { key: "data" as const, label: "数据", icon: Database, privilege: "none" as const },
];

const adminTabs = [
  { key: "site" as const, label: "站点", icon: Globe, privilege: "admin" as const },
  { key: "management" as const, label: "管理", icon: Shield, privilege: "admin" as const },
];

/** 根据权限等级获取 Tab 按钮样式 */
function getTabBtnClass(privilege: string, active: boolean, isDark: boolean, themeMode: ThemeMode): string {
  if (active) {
    if (privilege === "admin") return isDark ? "bg-teal-600/80 text-white" : "bg-teal-600 text-white";
    return themeMode === "light" ? "bg-slate-900 text-white" : "bg-white text-slate-950";
  }
  if (privilege === "admin") return isDark ? "border border-teal-500/30 text-teal-300 hover:bg-teal-500/15" : "border border-teal-400/40 text-teal-600 hover:bg-teal-50";
  return cn(getDialogSecondaryBtnClass(themeMode), themeMode === "light" ? "text-slate-600" : "text-white/80");
}

export function SettingsModal({
  open,
  activeTab,
  onTabChange,
  onClose,
  themeMode,
  role,
  settingsError,
  onClearSettingsError,

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

  busyAction,
  analyzing,
  onlineCheckEnabled,
  onlineCheckTime,
  onlineCheckBusy,
  onlineCheckResult,
  onExport,
  onImportClick,
  importError,
  onReset,
  onClear,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,
  exportCooldown,
  exportCooldownSec,

  settingsDraft,
  siteName,
  onSiteNameChange,
  logoInputRef,
  faviconInputRef,
  onUploadAsset,
  onRemoveAsset,
  onTriggerAssetFilePicker,
  floatingButtons,
  onFloatingButtonsChange,
  onSaveGlobal,
  aiDraftConfig,
  onAiDraftChange,
}: SettingsModalProps) {
  if (!open) return null;

  const isDark = themeMode === "dark";

  // 管理员显示"站点"和"管理"Tab
  const isAdmin = role === "admin";
  const tabs = [
    ...baseTabs,
    ...(isAdmin ? adminTabs : []),
  ];

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
                getTabBtnClass(tab.privilege, activeTab === tab.key, isDark, themeMode),
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* 内嵌错误提示 */}
          {settingsError ? (
            <div className={cn(
              "mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm",
              isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-rose-300 bg-rose-50 text-rose-700",
            )}>
              <span>{settingsError}</span>
              <button
                type="button"
                onClick={onClearSettingsError}
                className={cn("ml-3 shrink-0 rounded-lg p-1 transition hover:opacity-70", isDark ? "text-rose-300" : "text-rose-500")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {activeTab === "appearance" ? (
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
          ) : null}
          {activeTab === "data" ? (
            <ConfigAdminPanel
              busyAction={busyAction}
              analyzing={analyzing}
              onlineCheckEnabled={onlineCheckEnabled}
              onlineCheckTime={onlineCheckTime}
              onlineCheckBusy={onlineCheckBusy}
              onlineCheckResult={onlineCheckResult}
              onExport={onExport}
              onImportClick={onImportClick}
              importError={importError}
              onReset={onReset}
              onClear={onClear}
              onOnlineCheckToggle={onOnlineCheckToggle}
              onOnlineCheckTimeChange={onOnlineCheckTimeChange}
              onRunOnlineCheck={onRunOnlineCheck}
              themeMode={themeMode}
              exportCooldown={exportCooldown}
              exportCooldownSec={exportCooldownSec}
            />
          ) : null}
          {activeTab === "site" && isAdmin ? (
            <SitePanel
              themeMode={themeMode}
              settingsDraft={settingsDraft}
              appearanceDraft={appearanceDraft}
              setAppearanceDraft={setAppearanceDraft}
              siteName={siteName}
              onSiteNameChange={onSiteNameChange}
              logoInputRef={logoInputRef}
              faviconInputRef={faviconInputRef}
              onUploadAsset={onUploadAsset}
              onRemoveAsset={onRemoveAsset}
              onTriggerAssetFilePicker={onTriggerAssetFilePicker}
              floatingButtons={floatingButtons}
              onFloatingButtonsChange={onFloatingButtonsChange}
              onSaveGlobal={onSaveGlobal}
              aiDraftConfig={aiDraftConfig}
              onAiDraftChange={onAiDraftChange}
            />
          ) : null}
          {activeTab === "management" && isAdmin ? (
            <ManagementPanel themeMode={themeMode} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── 站点面板：站点名称 + 默认模式 + Logo/Favicon + 快捷按钮 + 全局保存 ── */

function SitePanel({
  themeMode,
  settingsDraft,
  appearanceDraft,
  setAppearanceDraft,
  siteName,
  onSiteNameChange,
  logoInputRef,
  faviconInputRef,
  onUploadAsset,
  onRemoveAsset,
  onTriggerAssetFilePicker,
  floatingButtons,
  onFloatingButtonsChange,
  onSaveGlobal,
  aiDraftConfig,
  onAiDraftChange,
}: {
  themeMode: ThemeMode;
  settingsDraft: import("@/lib/base/types").AppSettings;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: React.Dispatch<React.SetStateAction<AppearanceDraft>>;
  siteName: string;
  onSiteNameChange: (name: string) => void;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  onUploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => void;
  onRemoveAsset: (theme: ThemeMode, kind: AssetKind) => void;
  onTriggerAssetFilePicker: (kind: AssetKind) => void;
  floatingButtons: FloatingButtonItem[];
  onFloatingButtonsChange: (buttons: FloatingButtonItem[]) => void;
  onSaveGlobal: (siteName: string | null, floatingButtons: FloatingButtonItem[] | null, aiConfig?: { aiApiKey: string; aiBaseUrl: string; aiModel: string } | null) => Promise<boolean>;
  aiDraftConfig: { aiApiKey: string; aiBaseUrl: string; aiModel: string };
  onAiDraftChange: (field: "aiApiKey" | "aiBaseUrl" | "aiModel", value: string) => void;
}) {
  const isDark = themeMode === "dark";

  // 站点面板使用当前外观主题 tab 来展示对应主题的 Logo/Favicon
  // 默认用 light 主题
  const theme: ThemeMode = "light";

  /* ---- 裁剪弹窗状态 ---- */
  type AssetCropTarget = "logo" | "favicon";
  type PendingAssetCrop = { src: string; target: AssetCropTarget };
  const [pendingCrop, setPendingCrop] = useState<PendingAssetCrop | null>(null);

  /* ---- 全局保存确认弹窗状态 ---- */
  const [showGlobalConfirm, setShowGlobalConfirm] = useState(false);
  const [globalSaveBusy, setGlobalSaveBusy] = useState(false);
  const [globalSaveDone, setGlobalSaveDone] = useState(false);

  /** 裁剪确认后调用对应上传回调 */
  function handleAssetCropConfirm(blob: Blob) {
    if (!pendingCrop) return;
    const { target } = pendingCrop;
    const src = pendingCrop.src;
    setPendingCrop(null);
    URL.revokeObjectURL(src);

    const file = new File([blob], `${target}.png`, { type: "image/png" });
    onUploadAsset(theme, target, file);
  }

  function handleAssetCropCancel() {
    if (pendingCrop) URL.revokeObjectURL(pendingCrop.src);
    setPendingCrop(null);
  }

  async function handleGlobalSave() {
    setGlobalSaveBusy(true);
    const ok = await onSaveGlobal(siteName || null, floatingButtons, {
      aiApiKey: aiDraftConfig.aiApiKey,
      aiBaseUrl: aiDraftConfig.aiBaseUrl,
      aiModel: aiDraftConfig.aiModel,
    });
    setGlobalSaveBusy(false);
    if (ok) {
      setGlobalSaveDone(true);
    }
  }

  return (
    <div className="space-y-6">
      {/* 全局提示 */}
      <div className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        isDark ? "border-amber-500/25 bg-amber-500/8 text-amber-200/90" : "border-amber-300/50 bg-amber-50 text-amber-700",
      )}>
        <Globe className="mt-0.5 h-4 w-4 shrink-0" />
        <span>此面板的设置将对所有用户生效。您可以在当前页面预览和调试，完成后点击底部的「作用到全局」按钮保存。未保存的更改在刷新后将丢失。</span>
      </div>

      {/* 站点名称 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">站点名称</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          设置显示在浏览器标签和导航栏中的网站名称。
        </p>
        <div className="mt-4">
          <input
            type="text"
            value={siteName}
            onChange={(e) => onSiteNameChange(e.target.value)}
            maxLength={30}
            placeholder="输入站点名称"
            className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))}
          />
        </div>
      </section>

      {/* 默认模式 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <div>
          <h3 className="text-lg font-semibold">默认模式</h3>
          <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
            设置首次访问用户看到的默认主题。
          </p>
        </div>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setAppearanceDraft((current) => ({
                light: { ...current.light, isDefault: true },
                dark: { ...current.dark, isDefault: false },
              }));
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
              appearanceDraft.light.isDefault
                ? isDark
                  ? "border-amber-400/60 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/40"
                  : "border-amber-500/50 bg-amber-50 text-amber-700 shadow-[0_0_12px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/30"
                : isDark
                  ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  : "border-black/8 bg-black/3 text-slate-500 hover:bg-black/5",
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" /><path d="M12 20v2" />
              <path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" />
              <path d="M2 12h2" /><path d="M20 12h2" />
              <path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" />
            </svg>
            明亮模式
          </button>
          <button
            type="button"
            onClick={() => {
              setAppearanceDraft((current) => ({
                light: { ...current.light, isDefault: false },
                dark: { ...current.dark, isDefault: true },
              }));
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2.5 text-sm font-medium transition-all duration-200",
              appearanceDraft.dark.isDefault
                ? isDark
                  ? "border-violet-400/60 bg-violet-400/20 text-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.25)] ring-1 ring-violet-400/40"
                  : "border-violet-500/50 bg-violet-50 text-violet-700 shadow-[0_0_12px_rgba(139,92,246,0.15)] ring-1 ring-violet-400/30"
                : isDark
                  ? "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                  : "border-black/8 bg-black/3 text-slate-500 hover:bg-black/5",
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            暗黑模式
          </button>
        </div>
      </section>

      {/* Logo 与 Favicon */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">Logo 与 Favicon</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          自定义网站右上角 Logo 和浏览器标签图标。
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2 text-sm">
            <span className={cn(isDark ? "text-white/75" : "text-slate-600")}>网站 Logo</span>
            <AssetSlotCard
              label="Logo"
              imageUrl={settingsDraft.lightLogoUrl}
              uploading={false}
              onUploadLocal={() => onTriggerAssetFilePicker("logo")}
              onRemove={() => onRemoveAsset(theme, "logo")}
              themeMode={themeMode}
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPendingCrop({ src: URL.createObjectURL(file), target: "logo" });
                e.currentTarget.value = "";
              }}
            />
          </div>

          <div className="grid gap-2 text-sm">
            <span className={cn(isDark ? "text-white/75" : "text-slate-600")}>Favicon</span>
            <AssetSlotCard
              label="Favicon"
              imageUrl={settingsDraft.faviconUrl}
              uploading={false}
              onUploadLocal={() => onTriggerAssetFilePicker("favicon")}
              onRemove={() => onRemoveAsset(theme, "favicon")}
              themeMode={themeMode}
              rounded
            />
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPendingCrop({ src: URL.createObjectURL(file), target: "favicon" });
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </section>

      {/* 快捷按钮 */}
      <FloatingButtonsPanel
        themeMode={themeMode}
        buttons={floatingButtons}
        onButtonsChange={onFloatingButtonsChange}
      />

      {/* AI 模型配置 */}
      <AiModelPanel
        themeMode={themeMode}
        aiApiKeyMasked={settingsDraft.aiApiKeyMasked}
        aiDraftConfig={aiDraftConfig}
        onAiDraftChange={onAiDraftChange}
      />

      {/* 作用到全局按钮 */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowGlobalConfirm(true)}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition",
            isDark
              ? "bg-amber-500/80 text-white hover:bg-amber-400/90"
              : "bg-amber-500 text-white hover:bg-amber-600",
          )}
        >
          <Save className="h-4 w-4" />
          作用到全局
        </button>
      </div>

      {/* Logo / Favicon 裁剪弹窗 */}
      {pendingCrop ? (
        <ImageCropDialog
          imageSrc={pendingCrop.src}
          cropShape={pendingCrop.target === "favicon" ? "round" : "rect"}
          aspectRatio={1}
          title={pendingCrop.target === "favicon" ? "裁剪 Favicon" : "裁剪 Logo"}
          circular={pendingCrop.target === "favicon"}
          onConfirm={(blob) => handleAssetCropConfirm(blob)}
          onCancel={handleAssetCropCancel}
          themeMode={themeMode}
        />
      ) : null}

      {/* 全局保存确认弹窗 */}
      {showGlobalConfirm ? (
        <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
          <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[30px] border")}>
            <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
              <div>
                <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Confirm</p>
                <h2 className="mt-1 text-2xl font-semibold">作用到全局</h2>
              </div>
              <button
                type="button"
                onClick={() => { setShowGlobalConfirm(false); setGlobalSaveDone(false); }}
                disabled={globalSaveBusy}
                className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-55")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {globalSaveDone ? (
              /* ── 保存成功动画提示 ── */
              <div className="flex flex-col items-center gap-4 px-6 py-10">
                <div className="animate-[global-success-pop_0.5s_ease-out_forwards]">
                  <CheckCircle2 className={cn("h-16 w-16", isDark ? "text-emerald-400" : "text-emerald-500")} strokeWidth={1.5} />
                </div>
                <div className="animate-[global-success-fade_0.4s_0.2s_ease-out_both] text-center">
                  <p className="text-lg font-semibold">已作用到全局</p>
                  <p className={cn("mt-1.5 text-sm", getDialogSubtleClass(themeMode))}>
                    所有设置已成功保存，可以安全关闭此窗口。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowGlobalConfirm(false); setGlobalSaveDone(false); }}
                  className={cn(
                    "mt-2 inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium transition",
                    isDark
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "bg-black/5 text-slate-700 hover:bg-black/8",
                  )}
                >
                  关闭
                </button>
              </div>
            ) : (
              /* ── 确认保存内容 ── */
              <div className="space-y-5 px-6 py-6">
                <div className={cn(getDialogSectionClass(themeMode), "rounded-[24px] border px-4 py-4 text-sm leading-7", getDialogSubtleClass(themeMode))}>
                  确定将当前站点设置（站点名称、Logo、Favicon、默认模式、快捷按钮）作用到全局吗？此操作将影响所有用户的显示效果。
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowGlobalConfirm(false)}
                    disabled={globalSaveBusy}
                    className={cn(getDialogSecondaryBtnClass(themeMode), "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55")}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGlobalSave()}
                    disabled={globalSaveBusy}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
                      isDark
                        ? "bg-amber-500/80 text-white hover:bg-amber-400/90"
                        : "bg-amber-500 text-white hover:bg-amber-600",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  >
                    {globalSaveBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    确认保存
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── 管理面板：用户管理 + 注册开关 ── */

type UserConfirmAction = {
  type: "delete";
  userId: string;
  username: string;
};

function ManagementPanel({ themeMode }: { themeMode: ThemeMode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<UserConfirmAction | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const data = await requestJson<{ items: User[] }>("/api/admin/users");
      setUsers(data.items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [usersData, regData] = await Promise.all([
          requestJson<{ items: User[] }>("/api/admin/users"),
          requestJson<{ registrationEnabled?: boolean }>("/api/admin/registration"),
        ]);
        if (cancelled) return;
        setUsers(usersData.items);
        setRegistrationEnabled(regData.registrationEnabled ?? true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  function requestDeleteConfirm(userId: string, username: string) {
    setConfirmAction({ type: "delete", userId, username });
  }

  async function executeConfirmAction() {
    if (!confirmAction) return;
    setBusy(true);
    try {
      await requestJson(`/api/admin/users?id=${confirmAction.userId}`, { method: "DELETE" });
      await loadUsers();
      setConfirmAction(null);
    } catch { /* ignore */ }
    setBusy(false);
  }

  async function handleToggleRegistration() {
    setBusy(true);
    try {
      const newVal = !registrationEnabled;
      await requestJson("/api/admin/registration", {
        method: "PUT",
        body: JSON.stringify({ enabled: newVal }),
      });
      setRegistrationEnabled(newVal);
    } catch { /* ignore */ }
    setBusy(false);
  }

  const isDark = themeMode === "dark";

  return (
    <>
    <div className="space-y-6">
      {/* 注册开关 */}
      <div>
        <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white/70" : "text-slate-600")}>
          注册设置
        </h3>
        <div className={cn(
          "flex items-center justify-between rounded-2xl border p-4",
          isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-black/3"
        )}>
          <div className="flex items-center gap-3">
            <UserPlus className={cn("h-5 w-5", isDark ? "text-white/60" : "text-slate-500")} />
            <div>
              <p className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>
                开放注册
              </p>
              <p className={cn("text-xs", isDark ? "text-white/50" : "text-slate-500")}>
                {registrationEnabled ? "新用户可以自行注册账号" : "注册功能已关闭"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleToggleRegistration()}
            disabled={busy}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              registrationEnabled ? "bg-teal-600" : isDark ? "bg-white/20" : "bg-slate-300",
              "disabled:opacity-50"
            )}
          >
            <span className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              registrationEnabled ? "left-[22px]" : "left-0.5"
            )} />
          </button>
        </div>
      </div>

      {/* 用户列表 */}
      <div>
        <h3 className={cn("text-sm font-semibold mb-3", isDark ? "text-white/70" : "text-slate-600")}>
          用户管理
        </h3>
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className={cn("text-sm py-4 text-center", isDark ? "text-white/40" : "text-slate-400")}>
              暂无注册用户
            </p>
          ) : null}
          {users.map((user) => {
            const isAdminUser = user.role === "admin";
            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4",
                  isAdminUser
                    ? isDark ? "border-teal-500/40 bg-teal-500/15" : "border-teal-400/40 bg-teal-100/50"
                    : isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-black/3"
                )}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className={cn(
                      "text-sm font-medium",
                      isAdminUser ? (isDark ? "text-teal-200" : "text-teal-800") : (isDark ? "text-white" : "text-slate-900")
                    )}>
                      {user.username}
                    </p>
                    <p className={cn("text-xs", isDark ? "text-white/50" : "text-slate-500")}>
                      {isAdminUser ? "管理员" : "普通用户"}
                    </p>
                  </div>
                </div>
                {!isAdminUser ? (
                  <button
                    type="button"
                    onClick={() => requestDeleteConfirm(user.id, user.username)}
                    disabled={busy}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                      "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30",
                      "disabled:opacity-50"
                    )}
                    title="删除用户"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> 删除
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>

    {/* 用户操作确认弹窗 */}
    {confirmAction ? (
      <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center")}>
        <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[30px] border")}>
          <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
            <div>
              <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Confirm</p>
              <h2 className="mt-1 text-2xl font-semibold">删除用户</h2>
            </div>
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              disabled={busy}
              className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-55")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className={cn(getDialogSectionClass(themeMode), "rounded-[24px] border px-4 py-4 text-sm leading-7", getDialogSubtleClass(themeMode))}>
              {`确定要删除用户「${confirmAction.username}」吗？此操作不可撤销。该用户的所有数据将被永久清除，包括标签、站点、外观配置和所有上传的资源文件。`}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={busy}
                className={cn(getDialogSecondaryBtnClass(themeMode), "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55")}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void executeConfirmAction()}
                disabled={busy}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
                  isDark ? "bg-rose-600/80 text-white hover:bg-rose-500/90" : "bg-rose-600 text-white hover:bg-rose-700",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                确认删除
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
