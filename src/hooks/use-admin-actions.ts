/**
 * 管理操作 Hook
 * @description 封装站点/标签 CRUD、配置导入导出重置、拖拽排序等管理操作
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core";
import { siteConfig } from "@/lib/config";
import type {
  AppSettings,
  AdminBootstrap,
  PaginatedSites,
  Site,
  Tag,
  ThemeMode,
  ThemeAppearance,
} from "@/lib/types";
import { requestJson } from "@/lib/api";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import type { ConfigConfirmAction } from "@/components/dialogs/config-confirm-dialog";
import { configActionLabels } from "@/components/dialogs";

type DragKind = "tag" | "site";

export function useAdminActions(deps: {
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  appearances: Record<ThemeMode, ThemeAppearance>;
  setAppearances: React.Dispatch<React.SetStateAction<Record<ThemeMode, ThemeAppearance>>>;
  adminData: AdminBootstrap | null;
  setAdminData: React.Dispatch<React.SetStateAction<AdminBootstrap | null>>;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
  setRefreshNonce: React.Dispatch<React.SetStateAction<number>>;
  siteList: PaginatedSites;
  setSiteList: React.Dispatch<React.SetStateAction<PaginatedSites>>;
  debouncedQuery: string;
  activeTagId: string | null;
  applyAppearanceDraftFromBootstrap: (data: AdminBootstrap) => void;
  setSettingsDraft: React.Dispatch<React.SetStateAction<AppSettings>>;
  setSearchMenuOpen: (v: boolean) => void;
  setQuery: (q: string) => void;
  closeSuggestionMenus: () => void;
}) {
  const {
    isAuthenticated,
    setIsAuthenticated,
    tags,
    setTags,
    settings,
    setSettings,
    setAppearances,
    adminData,
    setAdminData,
    setMessage,
    setErrorMessage,
    setRefreshNonce,
    siteList,
    setSiteList,
    debouncedQuery,
    activeTagId,
    applyAppearanceDraftFromBootstrap,
    setSettingsDraft,
    setSearchMenuOpen: _setSearchMenuOpen,
    setQuery: _setQuery,
    closeSuggestionMenus: _closeSuggestionMenus,
  } = deps;

  // 编辑模式状态
  const [editMode, setEditMode] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"site" | "tag" | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [siteAdminGroup, setSiteAdminGroup] = useState<AdminGroup>("create");
  const [tagAdminGroup, setTagAdminGroup] = useState<AdminGroup>("create");

  // 管理面板
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSection, setAdminSection] = useState<"sites" | "tags" | "appearance" | "config">("sites");

  // 配置确认
  const [configImportFile, setConfigImportFile] = useState<File | null>(null);
  const [configConfirmAction, setConfigConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [configConfirmPassword, setConfigConfirmPassword] = useState("");
  const [configConfirmError, setConfigConfirmError] = useState("");
  const [configBusyAction, setConfigBusyAction] = useState<"import" | "export" | "reset" | null>(null);

  // 站点名称
  const [siteNameDraft, setSiteNameDraft] = useState(settings.siteName ?? siteConfig.appName);
  const [siteNameBusy, setSiteNameBusy] = useState(false);
  const siteNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 在线检查
  const [onlineCheckBusy, setOnlineCheckBusy] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<{ checked: number; online: number; offline: number } | null>(null);

  // 拖拽状态
  const [activeDrag, setActiveDrag] = useState<{ id: string; kind: DragKind } | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(null);
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  const snapToCursorModifier: Modifier = useCallback(
    ({ transform, activeNodeRect }) => {
      if (!activeDragOffset || !activeNodeRect) {
        return transform;
      }
      const offsetX = activeDragOffset.x - activeNodeRect.width / 2;
      const offsetY = activeDragOffset.y - activeNodeRect.height / 2;
      return {
        ...transform,
        x: transform.x + offsetX,
        y: transform.y + offsetY,
      };
    },
    [activeDragOffset],
  );

  const applyAdminBootstrap = useCallback((data: AdminBootstrap) => {
    setAdminData(data);
    applyAppearanceDraftFromBootstrap(data);
    setSettings(data.settings);
    setSettingsDraft(data.settings);
  }, [setAdminData, applyAppearanceDraftFromBootstrap, setSettings, setSettingsDraft]);

  const syncNavigationData = useCallback(async () => {
    const tagsResponse = await requestJson<{ items: Tag[] }>("/api/navigation/tags");
    setTags(tagsResponse.items);
    setRefreshNonce((value) => value + 1);
  }, [setTags, setRefreshNonce]);

  const syncAdminBootstrap = useCallback(async () => {
    if (!isAuthenticated) {
      setAdminData(null);
      return;
    }
    const data = await requestJson<AdminBootstrap>("/api/admin/bootstrap");
    applyAdminBootstrap(data);
  }, [isAuthenticated, applyAdminBootstrap, setAdminData]);

  // 自动在线检查
  useEffect(() => {
    if (!isAuthenticated || !settings.onlineCheckEnabled) return;
    const lastRun = settings.onlineCheckLastRun ? new Date(settings.onlineCheckLastRun) : null;
    const now = new Date();
    const targetHour = settings.onlineCheckTime;
    if (now.getHours() >= targetHour) {
      const todayTarget = new Date(now);
      todayTarget.setHours(targetHour, 0, 0, 0);
      const needCheck = !lastRun || lastRun.getTime() < todayTarget.getTime();
      if (needCheck) {
        void (async () => {
          try {
            await requestJson("/api/sites/check-online", { method: "POST" });
            await syncNavigationData();
          } catch { /* 静默失败 */ }
        })();
      }
    }
  }, [isAuthenticated, settings.onlineCheckEnabled, settings.onlineCheckLastRun, settings.onlineCheckTime, syncNavigationData]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      const data = await requestJson<AdminBootstrap>("/api/admin/bootstrap");
      applyAdminBootstrap(data);
    })();
  }, [isAuthenticated, applyAdminBootstrap]);

  async function handleSiteNameSave(name: string) {
    const trimmed = name.trim();
    const finalName = trimmed || null;
    if (finalName === settings.siteName) return;
    setSiteNameBusy(true);
    try {
      const saved = await requestJson<AppSettings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightLogoAssetId: settings.lightLogoAssetId,
          darkLogoAssetId: settings.darkLogoAssetId,
          siteName: finalName,
        }),
      });
      setSettings(saved);
      setSiteNameDraft(saved.siteName ?? siteConfig.appName);
      document.title = saved.siteName || siteConfig.appName;
    } catch (error) {
      console.error("保存站点名称失败:", error);
    } finally {
      setSiteNameBusy(false);
    }
  }

  function debouncedSiteNameSave(name: string) {
    setSiteNameDraft(name);
    if (siteNameTimerRef.current) clearTimeout(siteNameTimerRef.current);
    siteNameTimerRef.current = setTimeout(() => {
      void handleSiteNameSave(name);
    }, 600);
  }

  async function handleOnlineCheckToggle(enabled: boolean) {
    try {
      const saved = await requestJson<AppSettings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightLogoAssetId: settings.lightLogoAssetId,
          darkLogoAssetId: settings.darkLogoAssetId,
          onlineCheckEnabled: enabled,
        }),
      });
      setSettings(saved);
    } catch (error) {
      console.error("保存在线检查设置失败:", error);
    }
  }

  async function handleOnlineCheckSettingChange(field: "onlineCheckTime", value: number) {
    try {
      const saved = await requestJson<AppSettings>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lightLogoAssetId: settings.lightLogoAssetId,
          darkLogoAssetId: settings.darkLogoAssetId,
          [field]: value,
        }),
      });
      setSettings(saved);
    } catch (error) {
      console.error("保存在线检查设置失败:", error);
    }
  }

  async function handleRunOnlineCheck() {
    setOnlineCheckBusy(true);
    setOnlineCheckResult(null);
    try {
      const res = await requestJson<{ checked: number; online: number; offline: number }>("/api/sites/check-online", {
        method: "POST",
      });
      setOnlineCheckResult(res);
      await syncNavigationData();
    } catch (error) {
      console.error("在线检查失败:", error);
    } finally {
      setOnlineCheckBusy(false);
    }
  }

  async function handleLogout() {
    await requestJson("/api/auth/logout", { method: "POST" });
    setIsAuthenticated(false);
    setDrawerOpen(false);
    setEditMode(false);
    setEditorPanel(null);
    setAdminData(null);
    setMessage("已退出登录，编辑权限已关闭。");
    await syncNavigationData();
  }

  function toggleEditMode() {
    if (!isAuthenticated) return;
    if (!editMode) {
      setEditMode(true);
      return;
    }
    setEditMode(false);
    setEditorPanel(null);
    setSiteForm(defaultSiteForm);
    setTagForm(defaultTagForm);
  }

  function openSiteCreator() {
    setEditMode(true);
    setEditorPanel("site");
    setSiteAdminGroup("create");
    setSiteForm({
      ...defaultSiteForm,
      tagIds: activeTagId ? [activeTagId] : [],
    });
  }

  function openTagCreator() {
    setEditMode(true);
    setEditorPanel("tag");
    setTagAdminGroup("create");
    setTagForm(defaultTagForm);
  }

  function openSiteEditor(site: Site) {
    setEditMode(true);
    setEditorPanel("site");
    setSiteAdminGroup("edit");
    setSiteForm({
      id: site.id,
      name: site.name,
      url: site.url,
      description: site.description,
      iconUrl: site.iconUrl ?? "",
      iconBgColor: site.iconBgColor ?? "transparent",
      tagIds: site.tags.map((tag) => tag.id),
    });
  }

  function openTagEditor(tag: Tag) {
    setEditMode(true);
    setEditorPanel("tag");
    setTagAdminGroup("edit");
    setTagForm({
      id: tag.id,
      name: tag.name,
      isHidden: tag.isHidden,
      description: tag.description ?? "",
    });
  }

  function closeEditorPanel() {
    setEditorPanel(null);
    setSiteForm(defaultSiteForm);
    setTagForm(defaultTagForm);
  }

  function openConfigConfirm(action: ConfigConfirmAction) {
    if (action === "import" && !configImportFile) {
      setErrorMessage("请先选择要导入的配置压缩包。");
      return;
    }
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

  async function submitSiteForm() {
    setErrorMessage("");
    setMessage("");

    if (!siteForm.iconUrl.trim()) {
      setErrorMessage("请先选择或上传一个图标。");
      return;
    }

    const payload = {
      ...siteForm,
      iconUrl: siteForm.iconUrl.trim() || null,
      iconBgColor: siteForm.iconBgColor || null,
      description: siteForm.description?.trim() || null,
    };

    try {
      if (siteForm.id) {
        await requestJson("/api/sites", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await requestJson("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setSiteForm(defaultSiteForm);
      setEditorPanel(null);
      setSiteAdminGroup("create");
      setMessage(siteForm.id ? "网站修改已保存。" : "新网站已创建。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存网站失败");
    }
  }

  async function submitTagForm() {
    setErrorMessage("");
    setMessage("");

    try {
      const tagPayload = { ...tagForm, logoUrl: null, logoBgColor: null };
      if (tagForm.id) {
        await requestJson("/api/tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tagPayload),
        });
      } else {
        await requestJson("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tagPayload),
        });
      }

      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setTagAdminGroup("create");
      setMessage("标签配置已保存。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存标签失败");
    }
  }

  async function exportCurrentConfig(password: string) {
    setConfigBusyAction("export");
    setErrorMessage("");
    setMessage("");

    try {
      const response = await fetch("/api/config/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "导出配置失败");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/i);
      link.href = url;
      link.download = filenameMatch?.[1] ?? "sakuranav-config.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("配置压缩包已生成，浏览器会开始下载。");
    } catch (error) {
      throw error instanceof Error ? error : new Error("导出配置失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function importConfigArchive(password: string) {
    if (!configImportFile) {
      throw new Error("请先选择要导入的配置压缩包。");
    }

    setConfigBusyAction("import");
    setErrorMessage("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", configImportFile);
      formData.append("password", password);
      const data = await requestJson<{
        ok: boolean;
        tags: Tag[];
        sites: Site[];
        appearances: Record<ThemeMode, ThemeAppearance>;
        settings: AppSettings;
      }>("/api/config/import", {
        method: "POST",
        body: formData,
      });

      applyAdminBootstrap({
        tags: data.tags,
        sites: data.sites,
        appearances: data.appearances,
        settings: data.settings,
      });
      setAppearances(data.appearances);
      setTags(data.tags);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      setSiteAdminGroup("create");
      setTagAdminGroup("create");
      setConfigImportFile(null);
      setRefreshNonce((value) => value + 1);
      setMessage("配置压缩包已导入，当前导航数据已刷新。");
    } catch (error) {
      throw error instanceof Error ? error : new Error("导入配置失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function resetConfigToDefaults(password: string) {
    setConfigBusyAction("reset");
    setErrorMessage("");
    setMessage("");

    try {
      const data = await requestJson<{
        ok: true;
        tags: Tag[];
        sites: Site[];
        appearances: Record<ThemeMode, ThemeAppearance>;
        settings: AppSettings;
      }>("/api/config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      applyAdminBootstrap({
        tags: data.tags,
        sites: data.sites,
        appearances: data.appearances,
        settings: data.settings,
      });
      setTags(data.tags);
      setAppearances(data.appearances);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setConfigImportFile(null);
      _setQuery("");
      setRefreshNonce((value) => value + 1);
      setMessage("已恢复默认内容配置。");
    } catch (error) {
      throw error instanceof Error ? error : new Error("恢复默认失败");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function submitConfigConfirm() {
    if (!configConfirmAction) return;
    if (!configConfirmPassword.trim()) {
      setConfigConfirmError("请输入当前账号密码。");
      return;
    }
    setConfigConfirmError("");

    try {
      if (configConfirmAction === "export") {
        await exportCurrentConfig(configConfirmPassword);
      } else if (configConfirmAction === "import") {
        await importConfigArchive(configConfirmPassword);
      } else {
        await resetConfigToDefaults(configConfirmPassword);
      }
      setConfigConfirmAction(null);
      setConfigConfirmPassword("");
      setConfigConfirmError("");
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : `${configActionLabels[configConfirmAction]}失败`;
      setConfigConfirmError(messageText);
    }
  }

  async function deleteCurrentSite(siteId: string) {
    setErrorMessage("");
    setMessage("");

    try {
      await requestJson(`/api/sites?id=${encodeURIComponent(siteId)}`, {
        method: "DELETE",
      });
      if (siteForm.id === siteId) {
        setSiteForm(defaultSiteForm);
        setEditorPanel(null);
        setSiteAdminGroup("create");
      }
      setMessage("网站已从导航页移除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除网站失败");
    }
  }

  async function deleteCurrentTag(tagId: string) {
    setErrorMessage("");
    setMessage("");

    try {
      await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, {
        method: "DELETE",
      });
      if (tagForm.id === tagId) {
        setTagForm(defaultTagForm);
        setEditorPanel(null);
        setTagAdminGroup("create");
      }
      setMessage("标签已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "删除标签失败");
    }
  }

  async function handleTagSort(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode) return;
    const oldIndex = tags.findIndex((tag) => tag.id === event.active.id);
    const newIndex = tags.findIndex((tag) => tag.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextTags = arrayMove(tags, oldIndex, newIndex).map((tag, index) => ({
      ...tag,
      sortOrder: index,
    }));
    setTags(nextTags);
    setAdminData((current) =>
      current ? { ...current, tags: nextTags } : current,
    );

    try {
      await requestJson("/api/tags/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextTags.map((tag) => tag.id) }),
      });
      setMessage("标签顺序已更新。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存标签顺序失败");
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    }
  }

  async function handleSiteSort(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode || !adminData) return;
    if (debouncedQuery) return;

    const fullOrderedIds = activeTagId
      ? adminData.sites
          .filter((site) => site.tags.some((tag) => tag.id === activeTagId))
          .sort((left, right) => {
            const leftOrder = left.tags.find((tag) => tag.id === activeTagId)?.sortOrder ?? 0;
            const rightOrder = right.tags.find((tag) => tag.id === activeTagId)?.sortOrder ?? 0;
            return leftOrder - rightOrder;
          })
          .map((site) => site.id)
      : [...adminData.sites]
          .sort((left, right) => left.globalSortOrder - right.globalSortOrder)
          .map((site) => site.id);

    const oldIndex = fullOrderedIds.indexOf(String(event.active.id));
    const newIndex = fullOrderedIds.indexOf(String(event.over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const reorderedIds = arrayMove(fullOrderedIds, oldIndex, newIndex);
    const currentSiteMap = new Map(siteList.items.map((site) => [site.id, site]));
    const reorderedVisibleItems = reorderedIds
      .filter((siteId) => currentSiteMap.has(siteId))
      .map((siteId) => currentSiteMap.get(siteId) as Site);

    setSiteList((current) => ({
      ...current,
      items: reorderedVisibleItems,
    }));

    setAdminData((current) => {
      if (!current) return current;
      const orderMap = new Map(reorderedIds.map((id, index) => [id, index]));
      return {
        ...current,
        sites: current.sites.map((site) => {
          if (!orderMap.has(site.id)) return site;
          if (activeTagId) {
            return {
              ...site,
              tags: site.tags.map((tag) =>
                tag.id === activeTagId
                  ? { ...tag, sortOrder: orderMap.get(site.id) ?? tag.sortOrder }
                  : tag,
              ),
            };
          }
          return {
            ...site,
            globalSortOrder: orderMap.get(site.id) ?? site.globalSortOrder,
          };
        }),
      };
    });

    try {
      if (activeTagId) {
        await requestJson(`/api/tags/${activeTagId}/sites/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reorderedIds }),
        });
      } else {
        await requestJson("/api/sites/reorder-global", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reorderedIds }),
        });
      }
      setMessage(activeTagId ? "标签内网站顺序已更新。" : "网站顺序已更新。");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存网站顺序失败");
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
    }
  }

  function handleDragStart(kind: DragKind) {
    return (event: DragStartEvent) => {
      setActiveDrag({ id: String(event.active.id), kind });
      const rect = event.active.rect.current.initial;
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;
      setActiveDragSize(width && height ? { width, height } : null);
      if (rect && event.activatorEvent instanceof MouseEvent) {
        setActiveDragOffset({
          x: event.activatorEvent.clientX - rect.left,
          y: event.activatorEvent.clientY - rect.top,
        });
      } else {
        setActiveDragOffset(null);
      }
    };
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
  }

  const activeDraggedTag =
    activeDrag?.kind === "tag" ? tags.find((tag) => tag.id === activeDrag.id) ?? null : null;
  const activeDraggedSite =
    activeDrag?.kind === "site"
      ? siteList.items.find((site) => site.id === activeDrag.id) ??
        adminData?.sites.find((site) => site.id === activeDrag.id) ??
        null
      : null;

  return {
    editMode, setEditMode,
    editorPanel, setEditorPanel,
    siteForm, setSiteForm,
    tagForm, setTagForm,
    siteAdminGroup, setSiteAdminGroup,
    tagAdminGroup, setTagAdminGroup,
    drawerOpen, setDrawerOpen,
    adminSection, setAdminSection,
    configImportFile, setConfigImportFile,
    configConfirmAction, setConfigConfirmAction,
    configConfirmPassword, setConfigConfirmPassword,
    configConfirmError, setConfigConfirmError,
    configBusyAction,
    siteNameDraft, siteNameBusy,
    onlineCheckBusy, onlineCheckResult,
    activeDrag, activeDragSize,
    portalContainer, snapToCursorModifier,
    activeDraggedTag, activeDraggedSite,
    syncNavigationData, syncAdminBootstrap,
    handleLogout, toggleEditMode,
    openSiteCreator, openTagCreator,
    openSiteEditor, openTagEditor,
    closeEditorPanel,
    openConfigConfirm, closeConfigConfirm,
    submitSiteForm, submitTagForm,
    submitConfigConfirm,
    deleteCurrentSite, deleteCurrentTag,
    handleTagSort, handleSiteSort,
    handleDragStart, handleDragCancel,
    debouncedSiteNameSave,
    handleOnlineCheckToggle, handleOnlineCheckSettingChange,
    handleRunOnlineCheck,
  };
}
