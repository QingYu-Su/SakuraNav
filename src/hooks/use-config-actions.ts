/**
 * 配置操作 Hook
 * @description 管理配置导出/导入/重置、AI 分析书签导入等逻辑
 */

import { useRef, useState, useCallback, useEffect } from "react";
import type { AdminBootstrap, AppSettings, ThemeMode, ThemeAppearance, Tag, ImportMode, BookmarkImportItem, ImportDetectResult, BookmarkAnalysisItem, Site } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { extractDomain, getFaviconPreviewUrl } from "@/lib/utils/icon-utils";
import { configActionLabels } from "@/components/dialogs";
import { getAiDraftConfig } from "@/lib/utils/ai-draft-ref";
import type { ConfigConfirmAction } from "@/components/dialogs/config-confirm-dialog";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";

/** 导出防抖间隔（毫秒） */
const EXPORT_COOLDOWN_MS = 10000;

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
  /** 获取已有站点列表，用于导入时检测重复 */
  getExistingSites: () => Site[];
}

export interface UseConfigActionsReturn {
  configConfirmAction: ConfigConfirmAction | null;
  configConfirmPassword: string;
  configConfirmError: string;
  configBusyAction: "import" | "export" | "reset" | "clear" | null;
  /** 是否正在 AI 分析中 */
  analyzing: boolean;
  /** SakuraNav 导入确认弹窗 */
  sakuraImportConfirmOpen: boolean;
  sakuraImportFilename: string;
  /** 非 SakuraNav 导入模式选择弹窗 */
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
  /** 导出冷却中 */
  exportCooldown: boolean;
  /** 导出冷却剩余秒数 */
  exportCooldownSec: number;
  openConfigConfirm: (action: ConfigConfirmAction) => void;
  closeConfigConfirm: () => void;
  submitConfigConfirm: () => Promise<void>;
  handlePasswordChange: (v: string) => void;
  /** 点击"导入文件"按钮 → 直接打开文件选择器 */
  handleImportClick: () => void;
  /** 直接导出（不需要密码确认，带防抖） */
  exportConfig: () => Promise<void>;
  /** 选择文件后的处理（检测类型后分流） */
  handleFileSelected: (file: File) => void;
  /** 确认外部文件 AI 分析导入 */
  handleConfirmExternalImport: () => Promise<void>;
  /** 确认 SakuraNav 配置文件清空导入 */
  handleConfirmSakuraImport: () => Promise<void>;
  /** 关闭外部文件导入确认弹窗 */
  closeImportModeDialog: () => void;
  /** 关闭 SakuraNav 导入确认弹窗 */
  closeSakuraImportConfirm: () => void;
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
    getExistingSites,
  } = opts;

  const [configConfirmAction, setConfigConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [configConfirmPassword, setConfigConfirmPassword] = useState("");
  const [configConfirmError, setConfigConfirmError] = useState("");
  const [configBusyAction, setConfigBusyAction] = useState<"import" | "export" | "reset" | "clear" | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [importModeOpen, setImportModeOpen] = useState(false);
  const [importModeFilename, setImportModeFilename] = useState("");
  const [sakuraImportConfirmOpen, setSakuraImportConfirmOpen] = useState(false);
  const [sakuraImportFilename, setSakuraImportFilename] = useState("");
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [bookmarkItems, setBookmarkItems] = useState<BookmarkImportItem[]>([]);
  const [bookmarkEditUid, setBookmarkEditUid] = useState<string | null>(null);
  const [bookmarkEditRecommendedTags, setBookmarkEditRecommendedTags] = useState<string[]>([]);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const [exportCooldown, setExportCooldown] = useState(false);
  const [exportCooldownSec, setExportCooldownSec] = useState(0);

  /** 标记 AI 分析结果是否应被丢弃（用户关闭了设置弹窗/抽屉） */
  const analysisDiscardedRef = useRef(false);

  const tagsRef = useRef<Tag[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理倒计时定时器
  useEffect(() => {
    return () => {
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
      if (exportIntervalRef.current) clearInterval(exportIntervalRef.current);
    };
  }, []);

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

  const exportConfig = useCallback(async () => {
    if (exportCooldown) return;
    setConfigBusyAction("export");
    try {
      let response: Response;
      try {
        response = await fetch("/api/user/data/export", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        throw new Error("网络连接失败，请检查网络后重试");
      }
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
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "导出失败");
    } finally {
      setConfigBusyAction(null);
      // 防抖冷却：显示倒计时
      setExportCooldown(true);
      const totalSec = Math.ceil(EXPORT_COOLDOWN_MS / 1000);
      setExportCooldownSec(totalSec);
      exportIntervalRef.current = setInterval(() => {
        setExportCooldownSec((prev) => {
          if (prev <= 1) {
            if (exportIntervalRef.current) clearInterval(exportIntervalRef.current);
            exportIntervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      exportTimerRef.current = setTimeout(() => {
        setExportCooldown(false);
        setExportCooldownSec(0);
        exportTimerRef.current = null;
      }, EXPORT_COOLDOWN_MS);
    }
  }, [exportCooldown]);

  async function importConfig(file: File, mode: ImportMode) {
    setConfigBusyAction("import");
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const data = await requestJson<AdminBootstrap>("/api/user/data/import", {
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

  async function resetConfig() {
    setConfigBusyAction("reset");
    try {
      const data = await requestJson<AdminBootstrap>("/api/user/data/reset", {
        method: "POST",
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

  async function clearConfig() {
    setConfigBusyAction("clear");
    try {
      const data = await requestJson<AdminBootstrap>("/api/user/data/clear", {
        method: "POST",
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

    setConfigConfirmError("");
    try {
      if (configConfirmAction === "reset") {
        await resetConfig();
      } else if (configConfirmAction === "clear") {
        await clearConfig();
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

  /** 点击"导入文件"按钮 → 直接打开文件选择器（不再先选模式） */
  function handleImportClick() {
    setImportError("");
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

  /** 选择文件后：先检测类型，再分流处理 */
  async function handleFileSelected(file: File) {
    setPendingImportFile(file);
    setImportError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await requestJson<ImportDetectResult>("/api/user/data/detect", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (result.type === "sakuranav") {
        // SakuraNav 配置文件 → 弹出清空确认弹窗
        setSakuraImportFilename(result.filename);
        setSakuraImportConfirmOpen(true);
      } else {
        // 外部文件 → 弹出 AI 分析确认弹窗
        setImportModeFilename(result.filename);
        setPendingImportFile(file);
        setImportModeOpen(true);
        // 暂存外部文件内容用于 AI 分析
        pendingExternalContentRef.current = result.content;
        pendingExternalFilenameRef.current = result.filename;
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "文件检测失败");
      setPendingImportFile(null);
    }
  }

  /** 暂存外部文件内容 */
  const pendingExternalContentRef = useRef("");
  const pendingExternalFilenameRef = useRef("");

  /** 确认 SakuraNav 配置文件的清空导入 */
  async function handleConfirmSakuraImport() {
    if (!pendingImportFile) return;
    setSakuraImportConfirmOpen(false);
    await importConfig(pendingImportFile, "clean");
  }

  /** 关闭 SakuraNav 导入确认弹窗 */
  function closeSakuraImportConfirm() {
    if (configBusyAction) return;
    setSakuraImportConfirmOpen(false);
    setPendingImportFile(null);
  }

  /** 通知用户已关闭容器 */
  function discardPendingAnalysis() {
    analysisDiscardedRef.current = true;
  }

  /** 启动 AI 分析 */
  async function startAiAnalysis(content: string, filename: string) {
    setAnalyzing(true);
    analysisDiscardedRef.current = false;
    const draftConfig = getAiDraftConfig();
    try {
      await requestJson<{ ok: boolean }>("/api/ai/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _draftAiConfig: draftConfig }),
        credentials: "include",
      });

      const result = await requestJson<{ items: BookmarkAnalysisItem[] }>("/api/ai/import-bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, filename, _draftAiConfig: draftConfig }),
        credentials: "include",
      });

      // 构建已有站点 URL → 站点信息映射，用于检测重复
      const existingSites = getExistingSites();
      const normalizeUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const existingUrlMap = new Map<string, Site>();
      for (const s of existingSites) {
        existingUrlMap.set(normalizeUrl(s.url), s);
      }

      const items: BookmarkImportItem[] = result.items
        .map((item, index) => {
          let faviconUrl = "";
          try {
            const domain = extractDomain(item.url);
            faviconUrl = getFaviconPreviewUrl(domain);
          } catch { /* URL 解析失败则留空 */ }

          // 检测是否与已有站点重复
          const normalizedItemUrl = normalizeUrl(item.url);
          const matched = existingUrlMap.get(normalizedItemUrl);
          const duplicateHint = matched
            ? `与已有网站「${matched.name}」（${matched.url}）可能重复`
            : null;

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
            duplicateHint,
          };
        });

      if (items.length === 0) {
        return;
      }

      if (analysisDiscardedRef.current) {
        return;
      }

      setBookmarkItems(items);
      setBookmarkDialogOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setImportError(msg || "AI 分析失败");
    } finally {
      setAnalyzing(false);
    }
  }

  /** 确认外部文件 AI 分析导入 */
  async function handleConfirmExternalImport() {
    setImportModeOpen(false);
    const content = pendingExternalContentRef.current;
    const filename = pendingExternalFilenameRef.current;
    if (content) {
      await startAiAnalysis(content, filename);
    }
    pendingExternalContentRef.current = "";
    pendingExternalFilenameRef.current = "";
  }

  function closeImportModeDialog() {
    if (configBusyAction) return;
    setImportModeOpen(false);
    setPendingImportFile(null);
    pendingExternalContentRef.current = "";
    pendingExternalFilenameRef.current = "";
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
      onlineCheckFrequency: "1d",
      onlineCheckTimeout: 3,
      onlineCheckMatchMode: "status",
      onlineCheckKeyword: "",
      onlineCheckFailThreshold: 3,
      tagIds: item.tagIds,
    });
  }

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

  function handleCancelBookmarkEdit() {
    setBookmarkEditUid(null);
    setBookmarkEditRecommendedTags([]);
    setSiteForm(defaultSiteForm);
  }

  async function handleImportAllBookmarks(items: BookmarkImportItem[]) {
    setConfigBusyAction("import");
    try {
      const result = await requestJson<{ ok: boolean; total: number; created: number; skipped?: number; updated?: number; createdSiteIds?: string[] }>("/api/sites/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 外部文件导入始终使用增量模式，不删除任何已有标签和卡片
        // 允许创建重复 URL 的站点（重复提示已在 AI 分析列表中展示，由用户自行决定是否删除）
        body: JSON.stringify({ items, importMode: "incremental", allowDuplicates: true }),
        credentials: "include",
      });

      setBookmarkDialogOpen(false);
      setBookmarkItems([]);
      setPendingImportFile(null);

      await syncNavigationData();
      await syncAdminBootstrap();

      const siteIds = result.createdSiteIds;
      if (siteIds && siteIds.length > 0) {
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
    sakuraImportConfirmOpen,
    sakuraImportFilename,
    importModeOpen,
    importModeFilename,
    bookmarkDialogOpen,
    bookmarkItems,
    bookmarkEditUid,
    bookmarkEditRecommendedTags,
    pendingImportFile,
    importError,
    exportCooldown,
    exportCooldownSec,
    openConfigConfirm,
    closeConfigConfirm,
    submitConfigConfirm,
    handlePasswordChange,
    handleImportClick,
    exportConfig,
    handleFileSelected,
    handleConfirmExternalImport,
    handleConfirmSakuraImport,
    closeImportModeDialog,
    closeSakuraImportConfirm,
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
