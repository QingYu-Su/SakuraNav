/**
 * 站点/标签编辑器 Hook
 * @description 管理站点和标签的 CRUD 操作、编辑模式、编辑器面板状态
 */

import { useState } from "react";
import type { Site, Tag } from "@/lib/types";
import { requestJson } from "@/lib/api";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";

export interface UseSiteTagEditorOptions {
  activeTagId: string | null;
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
  submitSiteForm: () => Promise<void>;
  submitTagForm: () => Promise<void>;
  deleteCurrentSite: (siteId: string) => Promise<void>;
  deleteCurrentTag: (tagId: string) => Promise<void>;
  resetEditor: () => void;
}

export function useSiteTagEditor(opts: UseSiteTagEditorOptions): UseSiteTagEditorReturn {
  const { activeTagId, setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap } = opts;

  const [editMode, setEditMode] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"site" | "tag" | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [siteAdminGroup, setSiteAdminGroup] = useState<AdminGroup>("create");
  const [tagAdminGroup, setTagAdminGroup] = useState<AdminGroup>("create");

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
    setSiteForm({
      id: site.id,
      name: site.name,
      url: site.url,
      description: site.description,
      iconUrl: site.iconUrl ?? "",
      iconBgColor: site.iconBgColor ?? "transparent",
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
      await requestJson("/api/sites", {
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
