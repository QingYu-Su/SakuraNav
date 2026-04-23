/**
 * 设置弹窗
 * @description 居中弹窗，包含「外观」「数据」「站点」「管理」四个子面板
 */

import { useState, useEffect, useCallback } from "react";
import { X, PaintBucket, Database, Globe, Shield, UserCog, Trash2, UserPlus, UserMinus, LoaderCircle } from "lucide-react";
import { requestJson } from "@/lib/base/api";
import type { ThemeMode, FloatingButtonItem, UserRole, User } from "@/lib/base/types";
import { AppearanceAdminPanel } from "@/components/admin";
import type { AppearanceDraft } from "@/components/admin";
import { ConfigAdminPanel } from "@/components/admin";
import { FloatingButtonsPanel } from "@/components/admin";
import { cn } from "@/lib/utils/utils";
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
  getDialogSectionClass,
  getDialogInputClass,
} from "./style-helpers";
import { AssetSlotCard } from "@/components/admin/asset-slot-card";

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
  appearanceMenuTarget: WallpaperTarget | null;
  uploadingAssetTheme: ThemeMode | null;
  desktopWallpaperInputRef: RefObject<HTMLInputElement | null>;
  mobileWallpaperInputRef: RefObject<HTMLInputElement | null>;
  onUploadWallpaper: (theme: ThemeMode, device: WallpaperDevice, file: File) => void;
  onOpenWallpaperUrlDialog: (target: WallpaperTarget) => void;
  onOpenWallpaperMenu: React.Dispatch<React.SetStateAction<WallpaperTarget | null>>;
  onRemoveWallpaper: (theme: ThemeMode, device: WallpaperDevice) => void;
  onTriggerWallpaperFilePicker: (device: WallpaperDevice) => void;
  onTypographyChange: (theme: ThemeMode) => void;
  onRestoreTypographyDefaults: (theme: ThemeMode) => void;
  onCardFrostedChange: (theme: ThemeMode) => void;

  /* ── 数据面板透传 ── */
  busyAction: "import" | "export" | "reset" | null;
  analyzing: boolean;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onExport: () => void;
  onImportClick: () => void;
  importError: string;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;

  /* ── 站点面板透传 ── */
  siteName: string;
  siteNameBusy: boolean;
  assetMenuTarget: AssetTarget | null;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  onSiteNameChange: (name: string) => void;
  onUploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => void;
  onOpenAssetUrlDialog: (target: AssetTarget) => void;
  onOpenAssetMenu: React.Dispatch<React.SetStateAction<AssetTarget | null>>;
  onRemoveAsset: (theme: ThemeMode, kind: AssetKind) => void;
  onTriggerAssetFilePicker: (kind: AssetKind) => void;
  floatingButtons: FloatingButtonItem[];
  onFloatingButtonsChange: (buttons: FloatingButtonItem[]) => void;
};

const baseTabs = [
  { key: "appearance" as const, label: "外观", icon: PaintBucket },
  { key: "data" as const, label: "数据", icon: Database },
];

const privilegedTabs = [
  { key: "site" as const, label: "站点", icon: Globe },
];

const adminTab = { key: "management" as const, label: "管理", icon: Shield };

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
  appearanceMenuTarget,
  uploadingAssetTheme,
  desktopWallpaperInputRef,
  mobileWallpaperInputRef,
  onUploadWallpaper,
  onOpenWallpaperUrlDialog,
  onOpenWallpaperMenu,
  onRemoveWallpaper,
  onTriggerWallpaperFilePicker,
  onTypographyChange,
  onRestoreTypographyDefaults,
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
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,

  siteName,
  siteNameBusy,
  assetMenuTarget,
  logoInputRef,
  faviconInputRef,
  onSiteNameChange,
  onUploadAsset,
  onOpenAssetUrlDialog,
  onOpenAssetMenu,
  onRemoveAsset,
  onTriggerAssetFilePicker,
  floatingButtons,
  onFloatingButtonsChange,
}: SettingsModalProps) {
  if (!open) return null;

  const isDark = themeMode === "dark";

  // 超级用户/管理员显示"站点"Tab；管理员额外显示"管理"Tab
  const isPrivileged = role === "admin" || role === "superuser";
  const isAdmin = role === "admin";
  const tabs = [
    ...baseTabs,
    ...(isPrivileged ? privilegedTabs : []),
    ...(isAdmin ? [adminTab] : []),
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
              appearanceMenuTarget={appearanceMenuTarget}
              desktopWallpaperInputRef={desktopWallpaperInputRef}
              mobileWallpaperInputRef={mobileWallpaperInputRef}
              uploadingAssetTheme={uploadingAssetTheme}
              onUploadWallpaper={onUploadWallpaper}
              onOpenWallpaperUrlDialog={onOpenWallpaperUrlDialog}
              onOpenWallpaperMenu={onOpenWallpaperMenu}
              onRemoveWallpaper={onRemoveWallpaper}
              onTriggerWallpaperFilePicker={onTriggerWallpaperFilePicker}
              onTypographyChange={onTypographyChange}
              onRestoreTypographyDefaults={onRestoreTypographyDefaults}
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
              onOnlineCheckToggle={onOnlineCheckToggle}
              onOnlineCheckTimeChange={onOnlineCheckTimeChange}
              onRunOnlineCheck={onRunOnlineCheck}
              themeMode={themeMode}
            />
          ) : null}
          {activeTab === "site" && isPrivileged ? (
            <SitePanel
              themeMode={themeMode}
              appearanceDraft={appearanceDraft}
              setAppearanceDraft={setAppearanceDraft}
              siteName={siteName}
              siteNameBusy={siteNameBusy}
              assetMenuTarget={assetMenuTarget}
              logoInputRef={logoInputRef}
              faviconInputRef={faviconInputRef}
              onSiteNameChange={onSiteNameChange}
              onUploadAsset={onUploadAsset}
              onOpenAssetUrlDialog={onOpenAssetUrlDialog}
              onOpenAssetMenu={onOpenAssetMenu}
              onRemoveAsset={onRemoveAsset}
              onTriggerAssetFilePicker={onTriggerAssetFilePicker}
              floatingButtons={floatingButtons}
              onFloatingButtonsChange={onFloatingButtonsChange}
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

/* ── 站点面板：站点名称 + 默认模式 + Logo/Favicon + 快捷按钮 ── */

function SitePanel({
  themeMode,
  appearanceDraft,
  setAppearanceDraft,
  siteName,
  siteNameBusy,
  assetMenuTarget,
  logoInputRef,
  faviconInputRef,
  onSiteNameChange,
  onUploadAsset: _onUploadAsset,
  onOpenAssetUrlDialog,
  onOpenAssetMenu,
  onRemoveAsset,
  onTriggerAssetFilePicker,
  floatingButtons,
  onFloatingButtonsChange,
}: {
  themeMode: ThemeMode;
  appearanceDraft: AppearanceDraft;
  setAppearanceDraft: React.Dispatch<React.SetStateAction<AppearanceDraft>>;
  siteName: string;
  siteNameBusy: boolean;
  assetMenuTarget: AssetTarget | null;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  onSiteNameChange: (name: string) => void;
  onUploadAsset: (theme: ThemeMode, kind: AssetKind, file: File) => void;
  onOpenAssetUrlDialog: (target: AssetTarget) => void;
  onOpenAssetMenu: React.Dispatch<React.SetStateAction<AssetTarget | null>>;
  onRemoveAsset: (theme: ThemeMode, kind: AssetKind) => void;
  onTriggerAssetFilePicker: (kind: AssetKind) => void;
  floatingButtons: FloatingButtonItem[];
  onFloatingButtonsChange: (buttons: FloatingButtonItem[]) => void;
}) {
  const isDark = themeMode === "dark";

  // 站点面板使用当前外观主题 tab 来展示对应主题的 Logo/Favicon
  // 默认用 light 主题
  const theme: ThemeMode = "light";
  const assetMenuFor = (kind: AssetKind) =>
    assetMenuTarget?.theme === theme && assetMenuTarget.kind === kind;

  return (
    <div className="space-y-6">
      {/* 站点名称 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">站点名称</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          设置显示在浏览器标签和导航栏中的网站名称。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            value={siteName}
            onChange={(e) => onSiteNameChange(e.target.value)}
            maxLength={30}
            placeholder="输入站点名称"
            className={cn("flex-1 rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))}
          />
          {siteNameBusy ? (
            <LoaderCircle className={cn("h-5 w-5 shrink-0 animate-spin", getDialogSubtleClass(themeMode))} />
          ) : null}
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
              imageUrl={appearanceDraft[theme].logoUrl}
              uploading={false}
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
              className="hidden"
            />
          </div>

          <div className="grid gap-2 text-sm">
            <span className={cn(isDark ? "text-white/75" : "text-slate-600")}>Favicon</span>
            <AssetSlotCard
              label="Favicon"
              imageUrl={appearanceDraft[theme].faviconUrl}
              uploading={false}
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
              className="hidden"
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
    </div>
  );
}

/* ── 管理面板：用户管理 + 注册开关 ── */


function ManagementPanel({ themeMode }: { themeMode: ThemeMode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

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

  async function handleToggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "superuser" ? "user" : "superuser";
    setBusy(true);
    try {
      await requestJson("/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      await loadUsers();
    } catch { /* ignore */ }
    setBusy(false);
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("确定要删除该用户吗？其所有数据将一并删除。")) return;
    setBusy(true);
    try {
      await requestJson(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      await loadUsers();
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

  // 超级用户排在前面
  const sortedUsers = [...users].sort((a, b) => {
    if (a.role === "superuser" && b.role !== "superuser") return -1;
    if (a.role !== "superuser" && b.role === "superuser") return 1;
    return 0;
  });

  return (
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
              registrationEnabled ? "bg-violet-600" : isDark ? "bg-white/20" : "bg-slate-300",
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
          {sortedUsers.length === 0 ? (
            <p className={cn("text-sm py-4 text-center", isDark ? "text-white/40" : "text-slate-400")}>
              暂无注册用户
            </p>
          ) : null}
          {sortedUsers.map((user) => (
            <div
              key={user.id}
              className={cn(
                "flex items-center justify-between rounded-2xl border p-4",
                user.role === "superuser"
                  ? isDark ? "border-violet-500/30 bg-violet-500/8" : "border-violet-300 bg-violet-50/50"
                  : isDark ? "border-white/10 bg-white/5" : "border-black/8 bg-black/3"
              )}
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className={cn(
                    "text-sm font-medium",
                    user.role === "superuser"
                      ? isDark ? "text-violet-300" : "text-violet-600"
                      : isDark ? "text-white" : "text-slate-900"
                  )}>
                    {user.username}
                  </p>
                  <p className={cn("text-xs", isDark ? "text-white/50" : "text-slate-500")}>
                    {user.role === "superuser" ? "超级用户" : "普通用户"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleToggleRole(user.id, user.role)}
                  disabled={busy}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition",
                    user.role === "superuser"
                      ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      : "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30",
                    "disabled:opacity-50"
                  )}
                  title={user.role === "superuser" ? "降级为普通用户" : "升级为超级用户"}
                >
                  {user.role === "superuser" ? (
                    <><UserMinus className="h-3.5 w-3.5" /> 降级</>
                  ) : (
                    <><UserCog className="h-3.5 w-3.5" /> 升级</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteUser(user.id)}
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
