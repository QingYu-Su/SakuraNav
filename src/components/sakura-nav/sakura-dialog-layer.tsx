/**
 * 弹窗/对话框统一渲染层
 * @description 从 Context 获取共享数据，集中渲染所有弹窗和对话框
 * 新增弹窗/对话框时只需在本组件中添加，主组件无需修改渲染逻辑
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSakuraNavContext } from "./sakura-nav-context";
import type { SettingsTab } from "@/components/sakura-nav/settings-modal";
import type { CardSuperType } from "@/components/sakura-nav/card-type-picker";
import type { SocialCardType } from "@/lib/base/types";
import { siteToFormState } from "@/components/admin/types";
import type { TagDeleteSortContext } from "@/hooks/use-site-tag-editor";
import {
  ConfigConfirmDialog,
  ImportModeDialog,
  BookmarkImportDialog,
  SakuraImportConfirmDialog,
  DeleteSocialTagDialog,
  DeleteNoteTagDialog,
  DeleteTagDialog,
  DeleteDuplicateSiteDialog,
  SwitchUserDialog,
  SessionExpiredDialog,
  FloatingSearchDialog,
  NoteCardViewDialog,
} from "@/components/dialogs";
import {
  CardTypePicker,
  SocialCardTypePicker,
  SocialCardEditor,
  NoteCardEditor,
  EditorModal,
  SettingsModal,
  AdminDrawer,
} from "@/components/sakura-nav";
import { SearchEngineEditor } from "@/components/admin/search-engine-editor";
import type { Site } from "@/lib/base/types";
import type { WallpaperDevice, AssetKind } from "@/hooks/use-appearance";

// ── 公共接口 ──

/** 弹窗层的开关状态 */
export interface DialogLayerOpenState {
  settingsModalOpen: boolean;
  settingsTab: SettingsTab;
  settingsError: string;
  cardTypePickerOpen: boolean;
  engineEditorOpen: boolean;
  drawerOpen: boolean;
  floatingSearchOpen: boolean;
  duplicateDeleteTarget: Site | null;
  showScrollTopButton: boolean;
}

/** 弹窗层的命令式方法 */
export interface DialogLayerCallbacks {
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsTab: (tab: SettingsTab) => void;
  setSettingsError: (err: string) => void;
  openCardTypePicker: () => void;
  closeCardTypePicker: () => void;
  openEngineEditor: () => void;
  closeEngineEditor: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openFloatingSearch: () => void;
  closeFloatingSearch: () => void;
  setShowScrollTopButton: (v: boolean) => void;
  openDuplicateDelete: (site: Site) => void;
  closeDuplicateDelete: () => void;
}

/** 创建弹窗状态和回调 */
export function useDialogLayerState(): [DialogLayerOpenState, DialogLayerCallbacks] {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("appearance");
  const [settingsError, setSettingsError] = useState("");
  const [cardTypePickerOpen, setCardTypePickerOpen] = useState(false);
  const [engineEditorOpen, setEngineEditorOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [duplicateDeleteTarget, setDuplicateDeleteTarget] = useState<Site | null>(null);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

  const callbacks: DialogLayerCallbacks = {
    openSettings: useCallback(() => { setSettingsModalOpen(true); setSettingsError(""); }, []),
    closeSettings: useCallback(() => { setSettingsModalOpen(false); setSettingsError(""); }, []),
    setSettingsTab,
    setSettingsError,
    openCardTypePicker: useCallback(() => setCardTypePickerOpen(true), []),
    closeCardTypePicker: useCallback(() => setCardTypePickerOpen(false), []),
    openEngineEditor: useCallback(() => setEngineEditorOpen(true), []),
    closeEngineEditor: useCallback(() => setEngineEditorOpen(false), []),
    openDrawer: useCallback(() => setDrawerOpen(true), []),
    closeDrawer: useCallback(() => setDrawerOpen(false), []),
    openFloatingSearch: useCallback(() => setFloatingSearchOpen(true), []),
    closeFloatingSearch: useCallback(() => setFloatingSearchOpen(false), []),
    setShowScrollTopButton,
    openDuplicateDelete: useCallback((site: Site) => setDuplicateDeleteTarget(site), []),
    closeDuplicateDelete: useCallback(() => setDuplicateDeleteTarget(null), []),
  };

  const state: DialogLayerOpenState = {
    settingsModalOpen, settingsTab, settingsError,
    cardTypePickerOpen, engineEditorOpen, drawerOpen,
    floatingSearchOpen,
    duplicateDeleteTarget,
    showScrollTopButton,
  };

  return [state, callbacks];
}

// ── 内部子组件 ──

/** 从 Context 计算「当前标签标题」（弹窗层与布局层各需一份） */
function computeCurrentTitle(tags: Array<{ id: string; name: string }>, activeTagId: string | null): string {
  return activeTagId
    ? tags.find((t) => t.id === activeTagId)?.name ?? "全部卡片"
    : "全部卡片";
}

/** 设置相关弹窗组：设置弹窗 + 配置确认 + 导入模式 + 书签导入 */
function SettingsDialogs() {
  const ctx = useSakuraNavContext();
  const {
    themeMode, isAuthenticated, role,
    appearance, config, editor, siteName,
    floatingButtons, setFloatingButtons,
    dlState, dlCallbacks,
  } = ctx;

  return (
    <>
      {/* ── 设置弹窗 ── */}
      <SettingsModal
        open={dlState.settingsModalOpen}
        activeTab={dlState.settingsTab}
        onTabChange={dlCallbacks.setSettingsTab}
        onClose={() => {
          dlCallbacks.closeSettings();
          config.discardPendingAnalysis();
          appearance.sealAiApiKey();
        }}
        themeMode={themeMode}
        role={role}
        settingsError={dlState.settingsError}
        onClearSettingsError={() => dlCallbacks.setSettingsError("")}
        appearanceThemeTab={appearance.appearanceThemeTab}
        setAppearanceThemeTab={appearance.setAppearanceThemeTab}
        appearanceDraft={appearance.appearanceDraft}
        setAppearanceDraft={appearance.setAppearanceDraft}
        uploadingTheme={appearance.uploadingTheme}
        uploadingAssetTheme={appearance.uploadingAssetTheme}
        desktopWallpaperInputRef={appearance.desktopWallpaperInputRef}
        mobileWallpaperInputRef={appearance.mobileWallpaperInputRef}
        onUploadWallpaper={(t, d, f) => void appearance.uploadWallpaper(t, d as WallpaperDevice, f)}
        onRemoveWallpaper={appearance.removeWallpaper}
        onTriggerWallpaperFilePicker={(d) => {
          (d === "desktop"
            ? appearance.desktopWallpaperInputRef
            : appearance.mobileWallpaperInputRef
          ).current?.click();
        }}
        onCardFrostedChange={appearance.queueCardFrostedNotice}
        busyAction={config.configBusyAction}
        analyzing={config.analyzing}
        onExport={config.openExportModeDialog}
        onImportClick={config.handleImportClick}
        importError={config.importError}
        onReset={() => config.openConfigConfirm("reset")}
        onClear={() => config.openConfigConfirm("clear")}
        exportCooldown={config.exportCooldown}
        exportCooldownSec={config.exportCooldownSec}
        exportModeOpen={config.exportModeOpen}
        onExportScopeSelect={(scope) => void config.exportWithScope(scope)}
        onExportModeClose={config.closeExportModeDialog}
        settingsDraft={appearance.settingsDraft}
        siteName={siteName.siteNameDraft}
        onSiteNameChange={siteName.setSiteNameDraft}
        logoInputRef={appearance.logoInputRef}
        faviconInputRef={appearance.faviconInputRef}
        onUploadAsset={(t, k, f) => void appearance.uploadAsset(t, k as AssetKind, f)}
        onRemoveAsset={appearance.removeAsset}
        onTriggerAssetFilePicker={(k) => {
          (k === "logo" ? appearance.logoInputRef : appearance.faviconInputRef).current?.click();
        }}
        floatingButtons={floatingButtons}
        onFloatingButtonsChange={setFloatingButtons}
        onSaveGlobal={(sn, fb, ai) => appearance.saveGlobalSettings(sn, fb, ai)}
        aiDraftConfig={appearance.aiDraftConfig}
        onAiDraftChange={appearance.updateAiDraft}
      />

      {/* ── 配置确认弹窗 ── */}
      {config.configConfirmAction && isAuthenticated ? (
        <ConfigConfirmDialog
          action={config.configConfirmAction}
          themeMode={themeMode}
          error={config.configConfirmError}
          busy={config.configBusyAction === config.configConfirmAction}
          onClose={config.closeConfigConfirm}
          onSubmit={() => void config.submitConfigConfirm()}
        />
      ) : null}

      {/* ── 外部文件导入模式选择 ── */}
      {config.importModeOpen && isAuthenticated ? (
        <ImportModeDialog
          filename={config.importModeFilename}
          busy={config.configBusyAction === "import" || config.analyzing}
          themeMode={themeMode}
          onConfirm={() => void config.handleConfirmExternalImport()}
          onClose={config.closeImportModeDialog}
        />
      ) : null}

      {/* ── SakuraNav 配置导入确认 ── */}
      {config.sakuraImportConfirmOpen && isAuthenticated ? (
        <SakuraImportConfirmDialog
          filename={config.sakuraImportFilename}
          sitesOnly={config.sakuraImportSitesOnly}
          busy={config.configBusyAction === "import"}
          themeMode={themeMode}
          onConfirm={() => void config.handleConfirmSakuraImport()}
          onClose={config.closeSakuraImportConfirm}
        />
      ) : null}

      {/* ── 书签导入分析结果 ── */}
      {config.bookmarkDialogOpen && isAuthenticated ? (
        <BookmarkImportDialog
          items={config.bookmarkItems}
          busy={config.configBusyAction === "import"}
          themeMode={themeMode}
          onImportAll={(items) => void config.handleImportAllBookmarks(items)}
          onEditItem={(item) => {
            editor.openSiteCreator();
            config.handleEditBookmarkItem(item);
          }}
          onDeleteItem={config.deleteBookmarkItem}
          onRemoveDuplicates={config.removeDuplicateBookmarkItems}
          onClose={config.closeBookmarkDialog}
        />
      ) : null}
    </>
  );
}

/** 编辑器相关弹窗组：卡片选择器 + 编辑器 + 社交卡片 + 笔记卡片 + 标签删除 + 重复站点删除 */
function EditorDialogs() {
  const ctx = useSakuraNavContext();
  const {
    themeMode, isAuthenticated, adminData, tags,
    config, editor, socialCards, noteCards,
    syncNavigationData, syncAdminBootstrap, buildSortContext,
    tagDelete, dlState, dlCallbacks, siteListState,
    locateToSite,
  } = ctx;

  // 提取普通网站（不含社交/笔记卡片），用于笔记内网站卡片引用
  const normalSites = useMemo(
    () => siteListState.siteList.items.filter((s) => !s.cardType),
    [siteListState.siteList.items],
  );

  const [dupBusy, setDupBusy] = useState(false);

  return (
    <>
      {/* ── 卡片类型选择器 ── */}
      <CardTypePicker
        open={dlState.cardTypePickerOpen}
        themeMode={themeMode}
        onSelect={(type: CardSuperType) => {
          dlCallbacks.closeCardTypePicker();
          if (type === "site") {
            editor.openSiteCreator();
          } else if (type === "social") {
            socialCards.openCardCreator();
          } else if (type === "note") {
            noteCards.openCardCreator();
          }
        }}
        onClose={dlCallbacks.closeCardTypePicker}
      />

      {/* ── 站点/标签编辑弹窗 ── */}
      <EditorModal
        open={!!editor.editorPanel && editor.editMode}
        themeMode={themeMode}
        isAuthenticated={isAuthenticated}
        editorPanel={editor.editorPanel}
        siteForm={editor.siteForm}
        setSiteForm={editor.setSiteForm}
        tagForm={editor.tagForm}
        setTagForm={editor.setTagForm}
        tags={tags}
        adminDataTags={adminData?.tags}
        adminDataSites={adminData?.sites}
        onSubmitSite={(extraTagIds) => {
          if (config.bookmarkEditUid) {
            config.handleSaveBookmarkEdit(editor.siteForm);
            editor.closeEditorPanel();
            return;
          }
          void editor.submitSiteForm(extraTagIds);
        }}
        onSubmitTag={() => void editor.submitTagForm()}
        onTagsChange={async () => {
          await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
        }}
        onClose={() => {
          if (config.bookmarkEditUid) {
            config.handleCancelBookmarkEdit();
          }
          editor.closeEditorPanel();
        }}
        onLocateNote={(noteId) => {
          editor.closeEditorPanel();
          locateToSite(noteId);
        }}
        onAutoSaveClose={() => {
          // 书签编辑模式：自动保存书签修改
          if (config.bookmarkEditUid) {
            config.handleSaveBookmarkEdit(editor.siteForm);
            editor.closeEditorPanel();
            return;
          }

          const panel = editor.editorPanel;
          if (panel === "site") {
            const form = editor.siteForm;
            // 新建卡片：关闭即放弃（需点创建按钮才能提交）
            if (!form.id) {
              editor.closeEditorPanel();
              return;
            }
            // 编辑已有卡片：无修改则静默关闭，有修改才提交
            if (!editor.isSiteFormModified()) {
              editor.closeEditorPanel();
              return;
            }
            void editor.submitSiteForm();
            return;
          } else if (panel === "tag") {
            const form = editor.tagForm;
            // 新建标签：关闭即放弃
            if (!form.id) {
              editor.closeEditorPanel();
              return;
            }
            // 编辑已有标签：无修改则静默关闭，有修改才提交
            if (!editor.isTagFormModified()) {
              editor.closeEditorPanel();
              return;
            }
            void editor.submitTagForm();
            return;
          }

          editor.closeEditorPanel();
        }}
        bookmarkEdit={!!config.bookmarkEditUid}
        bookmarkRecommendedTags={config.bookmarkEditUid ? config.bookmarkEditRecommendedTags : undefined}
        bookmarkAutoSelectIcon={!!config.bookmarkEditUid}
        onEditDuplicateSite={(site) => {
          if (site.cardType) return;
          editor.openSiteEditor(site);
        }}
        onDeleteDuplicateSite={(site) => {
          dlCallbacks.openDuplicateDelete(site);
        }}
      />

      {/* ── 社交卡片类型选择器 ── */}
      <SocialCardTypePicker
        open={socialCards.showTypePicker}
        themeMode={themeMode}
        onSelect={(type: SocialCardType) => {
          socialCards.setShowTypePicker(false);
          socialCards.setCardForm({ cardType: type, fieldValue: "" });
        }}
        onClose={() => socialCards.setShowTypePicker(false)}
      />

      {/* ── 社交卡片编辑器 ── */}
      <SocialCardEditor
        open={!!socialCards.cardForm && editor.editMode}
        themeMode={themeMode}
        cardForm={socialCards.cardForm ?? { cardType: "qq", fieldValue: "" }}
        setCardForm={socialCards.setCardForm}
        onSubmit={() => void socialCards.submitCardForm()}
        onDelete={socialCards.cardForm?.id ? () => void socialCards.deleteCard(socialCards.cardForm!.id!) : undefined}
        onClose={socialCards.closeCardEditor}
        onAutoSaveClose={() => {
          const form = socialCards.cardForm;
          if (!form) { socialCards.closeCardEditor(); return; }
          // 新建：关闭即放弃
          if (!form.id) { socialCards.closeCardEditor(); return; }
          // 编辑：无修改则静默关闭
          if (!socialCards.isCardFormModified()) { socialCards.closeCardEditor(); return; }
          // 有修改则自动提交
          void socialCards.submitCardForm();
        }}
      />

      {/* ── 笔记卡片编辑器 ── */}
      <NoteCardEditor
        open={!!noteCards.cardForm && editor.editMode}
        themeMode={themeMode}
        cardForm={noteCards.cardForm ?? { title: "", content: "" }}
        setCardForm={noteCards.setCardForm}
        onSubmit={() => void noteCards.submitCardForm()}
        onDelete={noteCards.cardForm?.id ? () => void noteCards.deleteCard(noteCards.cardForm!.id!) : undefined}
        onClose={noteCards.closeCardEditor}
        sites={normalSites}
        onLocateSite={(siteId) => {
          if (noteCards.isCardFormModified()) void noteCards.submitCardForm();
          noteCards.closeCardEditor();
          locateToSite(siteId);
        }}
        onAutoSaveClose={() => {
          const form = noteCards.cardForm;
          if (!form) { noteCards.closeCardEditor(); return; }
          // 新建：关闭即放弃
          if (!form.id) { noteCards.closeCardEditor(); return; }
          // 编辑：无修改则静默关闭
          if (!noteCards.isCardFormModified()) { noteCards.closeCardEditor(); return; }
          // 有修改则自动提交
          void noteCards.submitCardForm();
        }}
      />

      {/* ── 笔记卡片查看弹窗 ── */}
      <NoteCardViewDialog
        open={!!noteCards.viewCard}
        card={noteCards.viewCard}
        themeMode={themeMode}
        sites={normalSites}
        onClose={() => {
          // 仅在查看期间有内容变更时才刷新导航数据（checkbox 交互）
          if (noteCards.consumeViewModified()) void syncNavigationData();
          noteCards.setViewCard(null);
        }}
        onContentUpdate={(newContent) => {
          const cardId = noteCards.viewCard?.id;
          // 同步更新 viewCard，保持弹窗渲染一致
          noteCards.setViewCard(prev => prev ? { ...prev, content: newContent } : null);
          // 同步更新 cards 数组，确保下次打开时展示最新内容
          if (cardId) noteCards.updateCardContent(cardId, newContent);
        }}
        onLocateSite={(siteId) => {
          // 关闭笔记弹窗
          if (noteCards.consumeViewModified()) void syncNavigationData();
          noteCards.setViewCard(null);
          // 清除标签筛选，定位到该站点
          locateToSite(siteId);
        }}
      />

      {/* ── 社交卡片标签删除确认 ── */}
      <DeleteSocialTagDialog
        open={tagDelete.deleteSocialTagDialogOpen}
        themeMode={themeMode}
        onConfirm={tagDelete.confirmDeleteSocialTag}
        onClose={tagDelete.closeSocialTagDialog}
      />

      {/* ── 笔记卡片标签删除确认 ── */}
      <DeleteNoteTagDialog
        open={tagDelete.deleteNoteTagDialogOpen}
        themeMode={themeMode}
        onConfirm={tagDelete.confirmDeleteNoteTag}
        onClose={tagDelete.closeNoteTagDialog}
      />

      {/* ── 普通标签删除确认 ── */}
      <DeleteTagDialog
        open={tagDelete.deleteTagDialogOpen}
        themeMode={themeMode}
        tagName={tagDelete.deleteTagTarget?.name ?? ""}
        siteCount={tagDelete.deleteTagTarget ? (adminData?.sites.filter((s) => s.tags.some((t) => t.id === tagDelete.deleteTagTarget!.id)).length ?? 0) : 0}
        onConfirm={tagDelete.confirmDeleteTag}
        onClose={tagDelete.closeDeleteTagDialog}
      />

      {/* ── 重复站点删除确认 ── */}
      <DeleteDuplicateSiteDialog
        open={!!dlState.duplicateDeleteTarget}
        themeMode={themeMode}
        siteName={dlState.duplicateDeleteTarget?.name ?? ""}
        busy={dupBusy}
        onConfirm={() => {
          if (!dlState.duplicateDeleteTarget) return;
          const site = dlState.duplicateDeleteTarget;
          setDupBusy(true);
          editor.deleteCurrentSite(site.id, siteToFormState(site), buildSortContext(site.id))
            .finally(() => {
              setDupBusy(false);
              dlCallbacks.closeDuplicateDelete();
            });
        }}
        onClose={dlCallbacks.closeDuplicateDelete}
      />
    </>
  );
}

/** 管理面板弹窗组：管理抽屉 + 搜索引擎编辑器 */
function AdminDialogs() {
  const ctx = useSakuraNavContext();
  const {
    themeMode, isAuthenticated, adminData, tags,
    editor, config,
    syncNavigationData, syncAdminBootstrap, buildSortContext,
    engineConfigs, setEngineConfigs,
    setErrorMessage,
    dlState, dlCallbacks,
  } = ctx;

  const [adminSection, setAdminSection] = useState<"sites" | "tags" | "appearance" | "config">("sites");

  return (
    <>
      {/* ── 管理抽屉 ── */}
      {dlState.drawerOpen && isAuthenticated ? (
        <AdminDrawer
          open={dlState.drawerOpen}
          themeMode={themeMode}
          isAuthenticated={isAuthenticated}
          adminSection={adminSection}
          setAdminSection={setAdminSection}
          adminData={adminData}
          tags={tags}
          siteForm={editor.siteForm}
          setSiteForm={editor.setSiteForm}
          tagForm={editor.tagForm}
          setTagForm={editor.setTagForm}
          siteActiveGroup={editor.siteAdminGroup}
          setSiteActiveGroup={editor.setSiteAdminGroup}
          tagActiveGroup={editor.tagAdminGroup}
          setTagActiveGroup={editor.setTagAdminGroup}
          onSubmitSite={(extraTagIds) => void editor.submitSiteForm(extraTagIds)}
          onSubmitTag={() => void editor.submitTagForm()}
          onError={setErrorMessage}
          onTagsChange={async () => {
            await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
          }}
          onStartEditSite={(s) => {
            editor.setSiteAdminGroup("edit");
            editor.setSiteForm(siteToFormState(s));
            editor.saveOriginalSnapshot();
          }}
          onStartEditTag={(t) => {
            editor.setTagAdminGroup("edit");
            const linkedSiteIds = (adminData?.sites ?? [])
              .filter((s) => s.tags.some((tag) => tag.id === t.id))
              .map((s) => s.id);
            editor.setTagForm({
              id: t.id,
              name: t.name,
              description: t.description ?? "",
              siteIds: linkedSiteIds,
            });
            editor.saveOriginalSnapshot();
          }}
          onDeleteSite={(id) => {
            const s = adminData?.sites.find((site) => site.id === id);
            const snap = s ? siteToFormState(s) : undefined;
            void editor.deleteCurrentSite(id, snap, buildSortContext(id));
          }}
          onDeleteTag={(id) => {
            const t = adminData?.tags.find((tag) => tag.id === id);
            const snap = t ? {
              id: t.id, name: t.name,
              description: t.description ?? "",
              siteIds: (adminData?.sites ?? []).filter((s) => s.tags.some((tag) => tag.id === id)).map((s) => s.id),
            } : undefined;
            const siteIds = adminData?.sites
              .filter((s) => s.tags.some((tag) => tag.id === id))
              .map((s) => s.id) ?? [];
            const tagSortCtx: TagDeleteSortContext | undefined = adminData
              ? { orderedTagIds: [...adminData.tags].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.id) }
              : undefined;
            void editor.deleteCurrentTag(id, snap, siteIds, tagSortCtx);
          }}
          onClose={() => {
            dlCallbacks.closeDrawer();
            config.discardPendingAnalysis();
          }}
        />
      ) : null}

      {/* ── 搜索引擎编辑器 ── */}
      {dlState.engineEditorOpen && isAuthenticated ? (
        <SearchEngineEditor
          engines={engineConfigs}
          themeMode={themeMode}
          onChange={(configs) => setEngineConfigs(configs)}
          onClose={dlCallbacks.closeEngineEditor}
        />
      ) : null}
    </>
  );
}

// ── 主组件 ──

/**
 * 弹窗/对话框统一渲染入口
 * @description 直接消费 Context，无需外部传 props — 新增弹窗只需在此组件或其子组件中添加
 */
export function SakuraDialogLayer() {
  const ctx = useSakuraNavContext();
  const {
    themeMode, initialSession,
    tags, activeTagId,
    switchUserOpen, setSwitchUserOpen, switchableUsers,
    handleUserSwitched, handleRemoveSwitchableUser, showTargetGone,
    sessionExpiredOpen, expiredMode, handleSessionExpiredConfirm,
    settings, engineConfigs,
    dlState, dlCallbacks,
    editor, socialCards, noteCards,
  } = ctx;

  const currentTitle = computeCurrentTitle(tags, activeTagId);

  // ── 弹窗打开时锁定 body 滚动，防止关闭后页面跳动 ──
  const anyModalOpen = !!(
    dlState.settingsModalOpen ||
    dlState.cardTypePickerOpen ||
    socialCards.showTypePicker ||
    (editor.editorPanel && editor.editMode) ||
    (socialCards.cardForm && editor.editMode) ||
    (noteCards.cardForm && editor.editMode) ||
    noteCards.viewCard ||
    dlState.drawerOpen ||
    dlState.engineEditorOpen ||
    dlState.floatingSearchOpen ||
    dlState.duplicateDeleteTarget ||
    switchUserOpen ||
    sessionExpiredOpen ||
    ctx.snapshotDialogOpen
  );
  useEffect(() => {
    if (anyModalOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [anyModalOpen]);

  return (
    <>
      {/* ── 设置相关 ── */}
      <SettingsDialogs />

      {/* ── 编辑器相关 ── */}
      <EditorDialogs />

      {/* ── 管理面板 ── */}
      <AdminDialogs />

      {/* ── 切换用户弹窗 ── */}
      <SwitchUserDialog
        open={switchUserOpen}
        themeMode={themeMode}
        currentUserId={initialSession?.userId ?? ""}
        users={switchableUsers}
        registrationEnabled={settings.registrationEnabled}
        onSwitched={handleUserSwitched}
        onTargetUserGone={showTargetGone}
        onRemoveUser={handleRemoveSwitchableUser}
        onClose={() => setSwitchUserOpen(false)}
      />

      {/* ── 会话失效弹窗 ── */}
      <SessionExpiredDialog
        open={sessionExpiredOpen}
        themeMode={themeMode}
        title={expiredMode === "target" ? "用户不存在" : "登录状态已失效"}
        message={expiredMode === "target" ? "该用户已被删除或不存在，请选择其他用户。" : "您的登录信息已过期或无效，请重新登录以继续使用。"}
        confirmLabel={expiredMode === "target" ? "知道了" : "确认"}
        onConfirm={handleSessionExpiredConfirm}
      />

      {/* ── 浮动搜索弹窗 ── */}
      <FloatingSearchDialog
        open={dlState.floatingSearchOpen}
        themeMode={themeMode}
        activeTagId={activeTagId}
        activeTagName={currentTitle}
        onClose={dlCallbacks.closeFloatingSearch}
        engines={engineConfigs}
      />
    </>
  );
}
