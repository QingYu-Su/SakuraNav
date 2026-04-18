/**
 * 站点/标签编辑器 Hook
 * @description 管理站点和标签的 CRUD 操作、编辑模式、编辑器面板状态
 */

import { useRef, useState } from "react";
import type { Site, Tag } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";

export interface UseSiteTagEditorOptions {
  activeTagId: string | null;
  /** 全局在线检测是否开启 */
  onlineCheckEnabled: boolean;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
}

export interface UseSiteTagEditorReturn {
  editMode: boolean;
  editorPanel: "site" | "tag" | null;
  siteForm: SiteFormState;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  tagForm: TagFormState;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  siteAdminGroup: AdminGroup;
  tagAdminGroup: AdminGroup;
  setSiteAdminGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  setTagAdminGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  toggleEditMode: () => void;
  openSiteCreator: () => void;
  openTagCreator: () => void;
  openSiteEditor: (site: Site) => void;
  openTagEditor: (tag: Tag) => void;
  closeEditorPanel: () => void;
  submitSiteForm: (extraTagIds?: string[]) => Promise<void>;
  submitTagForm: () => Promise<void>;
  deleteCurrentSite: (siteId: string) => Promise<void>;
  deleteCurrentTag: (tagId: string) => Promise<void>;
  resetEditor: () => void;
}

export function useSiteTagEditor(opts: UseSiteTagEditorOptions): UseSiteTagEditorReturn {
  const { activeTagId, onlineCheckEnabled, setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap } = opts;

  const [editMode, setEditMode] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"site" | "tag" | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [siteAdminGroup, setSiteAdminGroup] = useState<AdminGroup>("create");
  const [tagAdminGroup, setTagAdminGroup] = useState<AdminGroup>("create");

  /** 编辑前原始的 skipOnlineCheck 值，用于判断是否需要即时检测 */
  const originalSkipOnlineCheckRef = useRef(false);

  function toggleEditMode() {
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
    setSiteForm({ ...defaultSiteForm, tagIds: activeTagId ? [activeTagId] : [] });
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
    const skipOnlineCheck = site.skipOnlineCheck ?? false;
    originalSkipOnlineCheckRef.current = skipOnlineCheck;
    setSiteForm({
      id: site.id,
      name: site.name,
      url: site.url,
      description: site.description,
      iconUrl: site.iconUrl ?? "",
      iconBgColor: site.iconBgColor ?? "transparent",
      skipOnlineCheck,
      tagIds: site.tags.map((t) => t.id),
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

  /**
   * 提交网站表单（创建/更新），并在需要时触发即时在线检测
   * 即时检测场景：
   * 1. 新建网站且未跳过在线检测
   * 2. 编辑网站时，从"跳过"改为"不跳过"
   * @param extraTagIds AI 推荐新建标签后，需要额外关联的标签 ID
   */
  async function submitSiteForm(extraTagIds?: string[]) {
    setErrorMessage("");
    setMessage("");
    if (!siteForm.iconUrl.trim()) {
      setErrorMessage("请先选择或上传一个图标。");
      return;
    }
    const isNewSite = !siteForm.id;
    const skipOnlineCheck = siteForm.skipOnlineCheck;
    /** 编辑场景下，原始值为 true（跳过），现在改为 false（不跳过），需要即时检测 */
    const skipChangedFromTrueToFalse = !isNewSite && originalSkipOnlineCheckRef.current && !skipOnlineCheck;

    // 合并 AI 推荐新建的标签 ID，确保网站与这些标签建立关联
    const mergedTagIds = extraTagIds?.length
      ? [...siteForm.tagIds, ...extraTagIds.filter((id) => !siteForm.tagIds.includes(id))]
      : siteForm.tagIds;

    // 自动补全 URL 协议前缀
    const rawUrl = siteForm.url.trim();
    const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

    const payload = {
      ...siteForm,
      url: normalizedUrl,
      iconUrl: siteForm.iconUrl.trim() || null,
      iconBgColor: siteForm.iconBgColor || null,
      description: siteForm.description?.trim() || null,
      tagIds: mergedTagIds,
    };
    try {
      const result = await requestJson<{ item: { id: string } }>("/api/sites", {
        method: siteForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSiteForm(defaultSiteForm);
      setEditorPanel(null);
      setSiteAdminGroup("create");
      setMessage(siteForm.id ? "网站修改已保存。" : "新网站已创建。");
      await syncNavigationData();
      await syncAdminBootstrap();

      // 即时在线检测（后台静默执行，不阻塞用户操作）
      const needsOnlineCheck = onlineCheckEnabled && !skipOnlineCheck && (isNewSite || skipChangedFromTrueToFalse);
      if (needsOnlineCheck && result.item?.id) {
        const siteId = result.item.id;
        void requestJson<{ id: string; online: boolean }>("/api/sites/check-online-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        }).then(async () => {
          // 检测完成后刷新页面数据，显示在线/离线标志
          await syncNavigationData();
          await syncAdminBootstrap();
        }).catch(() => {
          /* 静默忽略检测失败 */
        });
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存网站失败");
    }
  }

  async function submitTagForm() {
    setErrorMessage("");
    setMessage("");
    try {
      const p = { ...tagForm, logoUrl: null, logoBgColor: null };
      await requestJson("/api/tags", {
        method: tagForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setTagAdminGroup("create");
      setMessage("标签配置已保存。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存标签失败");
    }
  }

  async function deleteCurrentSite(siteId: string) {
    setErrorMessage("");
    setMessage("");
    try {
      await requestJson(`/api/sites?id=${encodeURIComponent(siteId)}`, { method: "DELETE" });
      if (siteForm.id === siteId) {
        setSiteForm(defaultSiteForm);
        setEditorPanel(null);
        setSiteAdminGroup("create");
      }
      setMessage("网站已从导航页移除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除网站失败");
    }
  }

  async function deleteCurrentTag(tagId: string) {
    setErrorMessage("");
    setMessage("");
    try {
      await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, { method: "DELETE" });
      if (tagForm.id === tagId) {
        setTagForm(defaultTagForm);
        setEditorPanel(null);
        setTagAdminGroup("create");
      }
      setMessage("标签已删除。");
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除标签失败");
    }
  }

  function resetEditor() {
    setEditMode(false);
    setEditorPanel(null);
    setSiteForm(defaultSiteForm);
    setTagForm(defaultTagForm);
  }

  return {
    editMode, editorPanel,
    siteForm, setSiteForm,
    tagForm, setTagForm,
    siteAdminGroup, tagAdminGroup,
    setSiteAdminGroup, setTagAdminGroup,
    toggleEditMode,
    openSiteCreator, openTagCreator,
    openSiteEditor, openTagEditor,
    closeEditorPanel,
    submitSiteForm, submitTagForm,
    deleteCurrentSite, deleteCurrentTag,
    resetEditor,
  };
}
