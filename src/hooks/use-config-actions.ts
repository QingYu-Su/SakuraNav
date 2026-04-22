/**
 * 配置操作 Hook
 * @description 管理配置导出/导入/重置、AI 分析书签导入等逻辑
 */

import { useRef, useState } from "react";
import type { AdminBootstrap, AppSettings, ThemeMode, ThemeAppearance, Tag, ImportMode, BookmarkImportItem, ImportDetectResult, BookmarkAnalysisItem } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { extractDomain, getFaviconPreviewUrl } from "@/lib/utils/icon-utils";
import { configActionLabels } from "@/components/dialogs";
import type { ConfigConfirmAction } from "@/components/dialogs/config-confirm-dialog";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";

export interface UseConfigActionsOptions {
  applyAdminBootstrap: (data: AdminBootstrap) => void;
  setAppearances: (v: Record<ThemeMode, ThemeAppearance>) => void;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setSettings: (v: AppSettings) => void;
  setSettingsDraft: (v: AppSettings) => void;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  setSiteAdminGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  setTagAdminGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  searchBarSetQuery: React.Dispatch<React.SetStateAction<string>>;
  setRefreshNonce: React.Dispatch<React.SetStateAction<number>>;
  /** 同步导航数据（标签列表 + 站点列表刷新） */
  syncNavigationData: () => Promise<void>;
  /** 同步管理后台引导数据 */
  syncAdminBootstrap: () => Promise<void>;
  /** 全局在线检测是否开启 */
  onlineCheckEnabled: boolean;
  /** 获取已有站点的 URL 列表（小写），用于增量导入去重 */
  getExistingSiteUrls: () => string[];
}

export interface UseConfigActionsReturn {
  configConfirmAction: ConfigConfirmAction | null;
  configConfirmPassword: string;
  configConfirmError: string;
  configBusyAction: "import" | "export" | "reset" | null;
  /** 是否正在 AI 分析中 */
  analyzing: boolean;
  /** SakuraNav 导入模式选择弹窗 */
  importModeOpen: boolean;
  importModeFilename: string;
  /** AI 分析结果弹窗 */
  bookmarkDialogOpen: boolean;
  bookmarkItems: BookmarkImportItem[];
  /** 当前正在编辑的书签项 UID（null 表示非书签编辑模式） */
  bookmarkEditUid: string | null;
  /** 当前编辑的书签项的推荐新标签 */
  bookmarkEditRecommendedTags: string[];
  /** 当前待导入的文件（暂存） */
  pendingImportFile: File | null;
  /** 导入操作的行内错误提示 */
  importError: string;
  openConfigConfirm: (action: ConfigConfirmAction) => void;
  closeConfigConfirm: () => void;
  submitConfigConfirm: () => Promise<void>;
  handlePasswordChange: (v: string) => void;
  /** 点击"导入文件"按钮 → 打开文件选择器 */
  handleImportClick: () => void;
  /** 直接导出（不需要密码确认） */
  exportConfig: () => Promise<void>;
  /** 选择文件后的处理 */
  handleFileSelected: (file: File) => void;
  /** 选择导入模式 */
  handleSelectImportMode: (mode: ImportMode) => Promise<void>;
  /** 关闭导入模式弹窗 */
  closeImportModeDialog: () => void;
  /** 关闭书签分析结果弹窗 */
  closeBookmarkDialog: () => void;
  /** 编辑书签项（打开独立 EditorModal） */
  handleEditBookmarkItem: (item: BookmarkImportItem) => void;
  /** 保存书签编辑结果（从 EditorModal 回调） */
  handleSaveBookmarkEdit: (form: SiteFormState) => void;
  /** 取消书签编辑 */
  handleCancelBookmarkEdit: () => void;
  /** 更新分析列表中的某一项 */
  updateBookmarkItem: (uid: string, updated: BookmarkImportItem) => void;
  /** 删除分析列表中的某一项 */
  deleteBookmarkItem: (uid: string) => void;
  /** 导入全部（批量创建） */
  handleImportAllBookmarks: (items: BookmarkImportItem[]) => Promise<void>;
  /** 获取当前标签列表（供分析弹窗使用） */
  getCurrentTags: () => Tag[];
  /** 通知用户关闭了容器，丢弃待完成的 AI 分析结果 */
  discardPendingAnalysis: () => void;
}

export function useConfigActions(opts: UseConfigActionsOptions): UseConfigActionsReturn {
  const {
    applyAdminBootstrap,
    setAppearances,
    setTags,
    setSettings,
    setSettingsDraft,
    setSiteForm,
    setTagForm,
    setSiteAdminGroup,
    setTagAdminGroup,
    searchBarSetQuery,
    setRefreshNonce,
    syncNavigationData,
    syncAdminBootstrap,
    onlineCheckEnabled,
    getExistingSiteUrls,
  } = opts;

  const [configConfirmAction, setConfigConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [configConfirmPassword, setConfigConfirmPassword] = useState("");
  const [configConfirmError, setConfigConfirmError] = useState("");
  const [configBusyAction, setConfigBusyAction] = useState<"import" | "export" | "reset" | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [importModeOpen, setImportModeOpen] = useState(false);
  const [importModeFilename, setImportModeFilename] = useState("");
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkImportItem[]>([]);
  const [bookmarkEditUid, setBookmarkEditUid] = useState<string | null>(null);
  const [bookmarkEditRecommendedTags, setBookmarkEditRecommendedTags] = useState<string[]>([]);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pendingImportMode, setPendingImportMode] = useState<ImportMode | null>(null);

  /** 导入操作的行内错误提示（替代 toast） */
  const [importError, setImportError] = useState("");

  /** 标记 AI 分析结果是否应被丢弃（用户关闭了设置弹窗/抽屉） */
  const analysisDiscardedRef = useRef(false);

  const tagsRef = useRef<Tag[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function getCurrentTags() {
    return tagsRef.current;
  }

  function openConfigConfirm(action: ConfigConfirmAction) {
    setConfigConfirmAction(action);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
  }

  function closeConfigConfirm() {
    if (configBusyAction) return;
    setConfigConfirmAction(null);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
  }

  function handlePasswordChange(v: string) {
    setConfigConfirmPassword(v);
    if (configConfirmError) setConfigConfirmError("");
  }

  async function exportConfig() {
    setConfigBusyAction("export");
    try {
      const response = await fetch("/api/config/export", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const d = await response.json().catch(() => null);
        throw new Error((d as Record<string, string>)?.error ?? "导出配置失败");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/i);
      link.href = url;
      link.download = match?.[1] ?? "sakuranav-config.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function importConfig(file: File, mode: ImportMode) {
    setConfigBusyAction("import");
    setImportModeOpen(false);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const data = await requestJson<AdminBootstrap>("/api/config/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      applyAdminBootstrap(data);
      setAppearances(data.appearances);
      setTags(data.tags);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      setSiteAdminGroup("create");
      setTagAdminGroup("create");
      setPendingImportFile(null);
      setRefreshNonce((v) => v + 1);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function resetConfig(password: string) {
    setConfigBusyAction("reset");
    try {
      const data = await requestJson<AdminBootstrap>("/api/config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      applyAdminBootstrap(data);
      setTags(data.tags);
      setAppearances(data.appearances);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      searchBarSetQuery("");
      setRefreshNonce((v) => v + 1);
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function submitConfigConfirm() {
    if (!configConfirmAction) return;

    // reset 操作需密码
    if (configConfirmAction === "reset" && !configConfirmPassword.trim()) {
      setConfigConfirmError("请输入当前账号密码。");
      return;
    }

    setConfigConfirmError("");
    try {
      if (configConfirmAction === "reset") {
        await resetConfig(configConfirmPassword);
      }
      setConfigConfirmAction(null);
      setConfigConfirmPassword("");
      setConfigConfirmError("");
    } catch (e) {
      setConfigConfirmError(
        e instanceof Error ? e.message : `${configActionLabels[configConfirmAction]}失败`,
      );
    }
  }

  /** 点击"导入文件"按钮 → 先弹导入模式选择，再选择文件 */
  function handleImportClick() {
    // 直接弹出导入模式选择对话框（不传文件名，因为还没选文件）
    setImportModeFilename("");
    setImportModeOpen(true);
  }

  /** 导入模式选定后 → 打开文件选择器 */
  function handleImportModeSelected(mode: ImportMode) {
    setPendingImportMode(mode);
    setImportModeOpen(false);
    triggerFilePicker();
  }

  /** 创建隐藏的 file input 触发选择器 */
  function triggerFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".zip,.html,.htm,.txt,.md,.markdown,.json,.csv";
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) handleFileSelected(file);
      };
      input.click();
      fileInputRef.current = input;
    }
  }

  /** 选择文件后：根据已选的导入模式分流 */
  async function handleFileSelected(file: File) {
    setPendingImportFile(file);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await requestJson<ImportDetectResult>("/api/config/detect", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (result.type === "sakuranav") {
        // SakuraNav 配置文件 → 直接按用户选择的模式导入
        setImportModeFilename(result.filename);
        await importConfig(file, pendingImportMode ?? "incremental");
      } else {
        // 外部文件 → AI 分析（所有模式都走 AI 分析路径）
        await startAiAnalysis(result.content, result.filename);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "文件检测失败");
      setPendingImportFile(null);
    } finally {
      setPendingImportMode(null);
    }
  }

  /** 通知用户已关闭容器（设置弹窗/抽屉），应丢弃后续分析结果 */
  function discardPendingAnalysis() {
    analysisDiscardedRef.current = true;
  }

  /** 启动 AI 分析 */
  async function startAiAnalysis(content: string, filename: string) {
    setAnalyzing(true);
    analysisDiscardedRef.current = false;
    try {
      // 先检查 AI 连通性
      await requestJson<{ ok: boolean }>("/api/ai/check", {
        method: "POST",
        credentials: "include",
      });

      // 调用 AI 分析
      const result = await requestJson<{ items: BookmarkAnalysisItem[] }>("/api/ai/import-bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, filename }),
        credentials: "include",
      });

      // 获取已有站点 URL 集合（增量模式下用于过滤）
      const mode = pendingImportMode ?? "incremental";
      const existingUrls = new Set(getExistingSiteUrls());

      // 转换为 BookmarkImportItem 列表
      const items: BookmarkImportItem[] = result.items
        .map((item, index) => {
          // 使用 favicon.im 生成预览图标 URL，供列表和编辑弹窗使用
          let faviconUrl = "";
          try {
            const domain = extractDomain(item.url);
            faviconUrl = getFaviconPreviewUrl(domain);
          } catch { /* URL 解析失败则留空 */ }
          return {
            uid: `import-${Date.now()}-${index}`,
            name: item.name,
            url: item.url,
            description: item.description ?? "",
            iconUrl: faviconUrl,
            iconBgColor: "transparent",
            skipOnlineCheck: false,
            tagIds: item.matchedTagIds ?? [],
            newTags: item.recommendedTags ?? [],
          };
        })
        .filter((item) => {
          // 增量模式：过滤掉已存在的站点（URL 不区分大小写比较）
          if (mode === "incremental" && existingUrls.has(item.url.toLowerCase())) {
            return false;
          }
          return true;
        });

      if (items.length === 0 && mode === "incremental") {
        return;
      }

      // 用户已关闭设置弹窗/抽屉，丢弃分析结果
      if (analysisDiscardedRef.current) {
        return;
      }

      setBookmarkItems(items);
      setBookmarkDialogOpen(true);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "AI 分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSelectImportMode(mode: ImportMode) {
    handleImportModeSelected(mode);
  }

  function closeImportModeDialog() {
    if (configBusyAction) return;
    setImportModeOpen(false);
    setPendingImportMode(null);
    setPendingImportFile(null);
  }

  function closeBookmarkDialog() {
    setBookmarkDialogOpen(false);
    setBookmarkItems([]);
  }

  function updateBookmarkItem(uid: string, updated: BookmarkImportItem) {
    setBookmarkItems((prev) => prev.map((item) => (item.uid === uid ? updated : item)));
  }

  function deleteBookmarkItem(uid: string) {
    setBookmarkItems((prev) => prev.filter((item) => item.uid !== uid));
  }

  /** 编辑书签项：记录 UID 并将数据填入 siteForm，由父组件负责打开 EditorModal */
  function handleEditBookmarkItem(item: BookmarkImportItem) {
    setBookmarkEditUid(item.uid);
    setBookmarkEditRecommendedTags(item.newTags);
    setSiteForm({
      name: item.name,
      url: item.url,
      description: item.description || null,
      iconUrl: item.iconUrl,
      iconBgColor: item.iconBgColor,
      skipOnlineCheck: item.skipOnlineCheck,
      tagIds: item.tagIds,
    });
  }

  /** 从 EditorModal 保存书签编辑：将表单数据回写到 bookmarkItems */
  function handleSaveBookmarkEdit(form: SiteFormState) {
    if (!bookmarkEditUid) return;
    setBookmarkItems((prev) =>
      prev.map((item) =>
        item.uid === bookmarkEditUid
          ? {
              ...item,
              name: form.name,
              url: form.url,
              description: form.description ?? "",
              iconUrl: form.iconUrl,
              iconBgColor: form.iconBgColor,
              skipOnlineCheck: form.skipOnlineCheck,
              tagIds: form.tagIds,
            }
          : item,
      ),
    );
    setBookmarkEditUid(null);
    setBookmarkEditRecommendedTags([]);
    setSiteForm(defaultSiteForm);
  }

  /** 取消书签编辑 */
  function handleCancelBookmarkEdit() {
    setBookmarkEditUid(null);
    setBookmarkEditRecommendedTags([]);
    setSiteForm(defaultSiteForm);
  }

  async function handleImportAllBookmarks(items: BookmarkImportItem[]) {
    setConfigBusyAction("import");
    try {
      const mode = pendingImportMode ?? "incremental";
      const result = await requestJson<{ ok: boolean; total: number; created: number; skipped?: number; updated?: number; createdSiteIds?: string[] }>("/api/sites/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, importMode: mode }),
        credentials: "include",
      });

      setBookmarkDialogOpen(false);
      setBookmarkItems([]);
      setPendingImportFile(null);

      // 刷新导航数据（标签列表 + 站点列表），确保新标签出现在侧边栏
      await syncNavigationData();
      await syncAdminBootstrap();

      // 后台静默触发在线检测（参考新建网站卡片的逻辑）
      const siteIds = result.createdSiteIds;
      if (onlineCheckEnabled && siteIds && siteIds.length > 0) {
        void (async () => {
          for (const siteId of siteIds) {
            try {
              await requestJson<{ id: string; online: boolean }>("/api/sites/check-online-single", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ siteId }),
              });
            } catch {
              /* 静默忽略单个检测失败 */
            }
          }
          // 全部检测完成后刷新数据
          await syncNavigationData();
          await syncAdminBootstrap();
        })();
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "批量导入失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  return {
    configConfirmAction,
    configConfirmPassword,
    configConfirmError,
    configBusyAction,
    analyzing,
    importModeOpen,
    importModeFilename,
    bookmarkDialogOpen,
    bookmarkItems,
    bookmarkEditUid,
    bookmarkEditRecommendedTags,
    pendingImportFile,
    importError,
    openConfigConfirm,
    closeConfigConfirm,
    submitConfigConfirm,
    handlePasswordChange,
    handleImportClick,
    exportConfig,
    handleFileSelected,
    handleSelectImportMode,
    closeImportModeDialog,
    closeBookmarkDialog,
    handleEditBookmarkItem,
    handleSaveBookmarkEdit,
    handleCancelBookmarkEdit,
    updateBookmarkItem,
    deleteBookmarkItem,
    handleImportAllBookmarks,
    getCurrentTags,
    discardPendingAnalysis,
  };
}
