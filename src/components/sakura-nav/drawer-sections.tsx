/**
 * 抽屉面板组件集合
 * @description 包含外观抽屉、配置抽屉、编辑器面板、管理抽屉
 */

import { X, PencilLine, PaintBucket, GripVertical, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ConfigAdminPanel,
  AppearanceAdminPanel,
  SitesAdminPanel,
  TagsAdminPanel,
  SiteEditorForm,
  TagEditorForm,
} from "@/components/admin";
import { NotificationToast } from "@/components/dialogs/notification-toast";
import type { ToastState } from "@/components/dialogs/notification-toast";
import type { AdminBootstrap, Site, Tag, ThemeMode } from "@/lib/types";
import type { SiteFormState, TagFormState, AppearanceDraft, AdminSection, AdminGroup } from "@/components/admin";
import type { WallpaperTarget, WallpaperDevice } from "@/components/dialogs/wallpaper-url-dialog";
import type { AssetTarget, AssetKind } from "@/components/dialogs/asset-url-dialog";
import type { RefObject } from "react";
import React from "react";

/* ============================================ */
/* Toast 通知层                                  */
/* ============================================ */

type ToastLayerProps = {
  toasts: ToastState[];
  dismissToast: (id: number) => void;
};

export function ToastLayer({ toasts, dismissToast }: ToastLayerProps) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-5 top-24 z-50 flex w-[min(400px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <NotificationToast key={toast.id} toast={toast} onClose={dismissToast} />
      ))}
    </div>
  );
}

/* ============================================ */
/* 外观抽屉                                      */
/* ============================================ */

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

/* ============================================ */
/* 配置抽屉                                      */
/* ============================================ */

type ConfigDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  siteName: string;
  siteNameBusy: boolean;
  selectedFile: File | null;
  busyAction: "import" | "export" | "reset" | null;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onSiteNameChange: (name: string) => void;
  onFileChange: (file: File | null) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;
  onClose: () => void;
};

export function ConfigDrawer({
  open,
  isAuthenticated,
  siteName,
  siteNameBusy,
  selectedFile,
  busyAction,
  onlineCheckEnabled,
  onlineCheckTime,
  onlineCheckBusy,
  onlineCheckResult,
  onSiteNameChange,
  onFileChange,
  onExport,
  onImport,
  onReset,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,
  onClose,
}: ConfigDrawerProps) {
  if (!open || !isAuthenticated) return null;

  return (
    <div className="animate-drawer-fade fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
      <div className="animate-drawer-slide flex h-full w-full max-w-[640px] flex-col border-l border-white/12 bg-[#0f172af2] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Other</p>
            <h2 className="mt-1 text-2xl font-semibold">其他</h2>
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
          <ConfigAdminPanel
            siteName={siteName}
            siteNameBusy={siteNameBusy}
            selectedFile={selectedFile}
            busyAction={busyAction}
            onlineCheckEnabled={onlineCheckEnabled}
            onlineCheckTime={onlineCheckTime}
            onlineCheckBusy={onlineCheckBusy}
            onlineCheckResult={onlineCheckResult}
            onSiteNameChange={onSiteNameChange}
            onFileChange={onFileChange}
            onExport={onExport}
            onImport={onImport}
            onReset={onReset}
            onOnlineCheckToggle={onOnlineCheckToggle}
            onOnlineCheckTimeChange={onOnlineCheckTimeChange}
            onRunOnlineCheck={onRunOnlineCheck}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================ */
/* 编辑器面板                                     */
/* ============================================ */

type EditorModalProps = {
  open: boolean;
  isAuthenticated: boolean;
  editorPanel: "site" | "tag" | null;
  siteForm: SiteFormState;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  tagForm: TagFormState;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  tags: Tag[];
  adminDataTags: Tag[] | undefined;
  onSubmitSite: () => void;
  onSubmitTag: () => void;
  onDeleteSite: (() => void) | undefined;
  onDeleteTag: (() => void) | undefined;
  onTagsChange: () => Promise<void>;
  onClose: () => void;
};

export function EditorModal({
  open,
  isAuthenticated,
  editorPanel,
  siteForm,
  setSiteForm,
  tagForm,
  setTagForm,
  tags,
  adminDataTags,
  onSubmitSite,
  onSubmitTag,
  onDeleteSite,
  onDeleteTag,
  onTagsChange,
  onClose,
}: EditorModalProps) {
  if (!open || !isAuthenticated || !editorPanel) return null;

  return (
    <div className="animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center bg-slate-950/46 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-panel-rise w-full max-w-[760px] overflow-hidden rounded-[34px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {editorPanel === "site"
                ? siteForm.id ? "修改网站" : "新建网站"
                : tagForm.id ? "修改标签" : "新建标签"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 transition hover:bg-white/12"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6">
          {editorPanel === "site" ? (
            <SiteEditorForm
              submitLabel={siteForm.id ? "保存网站" : "创建网站"}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              tags={adminDataTags ?? tags}
              onSubmit={onSubmitSite}
              onDelete={onDeleteSite}
              onTagsChange={onTagsChange}
            />
          ) : (
            <TagEditorForm
              submitLabel={tagForm.id ? "保存标签" : "创建标签"}
              tagForm={tagForm}
              setTagForm={setTagForm}
              onSubmit={onSubmitTag}
              onDelete={onDeleteTag}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================ */
/* 管理抽屉                                      */
/* ============================================ */

type AdminDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  adminSection: AdminSection;
  setAdminSection: (section: AdminSection) => void;
  adminData: AdminBootstrap | null;
  tags: Tag[];
  siteForm: SiteFormState;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  tagForm: TagFormState;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  siteActiveGroup: AdminGroup;
  setSiteActiveGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  tagActiveGroup: AdminGroup;
  setTagActiveGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  onSubmitSite: () => void;
  onSubmitTag: () => void;
  onError: (msg: string) => void;
  onTagsChange: () => Promise<void>;
  onStartEditSite: (site: Site) => void;
  onStartEditTag: (tag: Tag) => void;
  onDeleteSite: (id: string) => void;
  onDeleteTag: (id: string) => void;
  onClose: () => void;
};

export function AdminDrawer({
  open,
  isAuthenticated,
  adminSection,
  setAdminSection,
  adminData,
  tags,
  siteForm,
  setSiteForm,
  tagForm,
  setTagForm,
  siteActiveGroup,
  setSiteActiveGroup,
  tagActiveGroup,
  setTagActiveGroup,
  onSubmitSite,
  onSubmitTag,
  onError,
  onTagsChange,
  onStartEditSite,
  onStartEditTag,
  onDeleteSite,
  onDeleteTag,
  onClose,
}: AdminDrawerProps) {
  if (!open || !isAuthenticated) return null;

  const tabs = [
    { key: "sites", label: "网站", icon: PencilLine },
    { key: "tags", label: "标签", icon: GripVertical },
    { key: "appearance", label: "外观", icon: PaintBucket },
    { key: "config", label: "配置", icon: Settings2 },
  ] as const;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-[640px] flex-col border-l border-white/12 bg-[#0f172af0] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Admin Drawer</p>
            <h2 className="mt-1 text-2xl font-semibold">管理导航页</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-white/10 px-6 py-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAdminSection(tab.key as AdminSection)}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm transition",
                adminSection === tab.key
                  ? "bg-white text-slate-950"
                  : "border border-white/12 bg-white/6 text-white/80 hover:bg-white/12",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {adminSection === "sites" ? (
            <SitesAdminPanel
              adminData={adminData}
              tags={tags}
              siteForm={siteForm}
              setSiteForm={setSiteForm}
              activeGroup={siteActiveGroup}
              setActiveGroup={setSiteActiveGroup}
              onSubmit={onSubmitSite}
              onError={onError}
              onTagsChange={onTagsChange}
              onStartEdit={onStartEditSite}
              onDelete={(siteId) => onDeleteSite(siteId)}
            />
          ) : null}
          {adminSection === "tags" ? (
            <TagsAdminPanel
              adminData={adminData}
              tags={tags}
              tagForm={tagForm}
              setTagForm={setTagForm}
              activeGroup={tagActiveGroup}
              setActiveGroup={setTagActiveGroup}
              onSubmit={onSubmitTag}
              onStartEdit={onStartEditTag}
              onDelete={(tagId) => onDeleteTag(tagId)}
            />
          ) : null}
          {/* Note: appearance/config sections in admin drawer are handled
              by dedicated drawers (AppearanceDrawer/ConfigDrawer) */}
        </div>
      </div>
    </div>
  );
}
