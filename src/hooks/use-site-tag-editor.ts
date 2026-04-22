/**
 * 站点/标签编辑器 Hook
 * @description 管理站点和标签的 CRUD 操作、编辑模式、编辑器面板状态
 */

import { useRef, useState } from "react";
import type { Site, Tag } from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";
import type { UndoAction } from "@/hooks/use-undo-stack";

export interface UseSiteTagEditorOptions {
  activeTagId: string | null;
  /** 全局在线检测是否开启 */
  onlineCheckEnabled: boolean;
  /** 成功消息回调，可选附带撤销动作 */
  setMessage: (msg: string, undo?: UndoAction) => void;
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
  deleteCurrentSite: (siteId: string, snapshot?: SiteFormState, sortContext?: SiteDeleteSortContext) => Promise<void>;
  deleteCurrentTag: (tagId: string, snapshot?: TagFormState, siteIds?: string[], sortCtx?: TagDeleteSortContext) => Promise<void>;
  resetEditor: () => void;
  /** 将当前表单标记为原始快照（用于外部编辑入口的撤销恢复） */
  saveOriginalSnapshot: () => void;
}

/** 被系统保留的标签名 */
const RESERVED_TAG_NAMES = ["社交卡片"];

/** 删除站点时的排序上下文，用于撤销后恢复原位 */
export type SiteDeleteSortContext = {
  /** 删除前的全局站点 ID 列表（按 globalSortOrder 升序） */
  globalSiteIds: string[];
  /** 删除前的标签内站点 ID 列表（按标签 ID 分组） */
  tagSiteIds: Record<string, string[]>;
};

/** 删除标签时的排序上下文，用于撤销后恢复标签在标签栏中的原位 */
export type TagDeleteSortContext = {
  /** 删除前的标签 ID 列表（按 sortOrder 升序） */
  orderedTagIds: string[];
};

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
  /** 编辑前原始的表单快照，用于更新操作的撤销恢复 */
  const originalSiteFormRef = useRef<SiteFormState | null>(null);
  const originalTagFormRef = useRef<TagFormState | null>(null);

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
    const form: SiteFormState = {
      id: site.id,
      name: site.name,
      url: site.url,
      description: site.description,
      iconUrl: site.iconUrl ?? "",
      iconBgColor: site.iconBgColor ?? "transparent",
      skipOnlineCheck,
      tagIds: site.tags.map((t) => t.id),
    };
    originalSiteFormRef.current = { ...form, tagIds: [...form.tagIds] };
    setSiteForm(form);
  }

  function openTagEditor(tag: Tag) {
    setEditMode(true);
    setEditorPanel("tag");
    setTagAdminGroup("edit");
    const form: TagFormState = {
      id: tag.id,
      name: tag.name,
      isHidden: tag.isHidden,
      description: tag.description ?? "",
    };
    originalTagFormRef.current = { ...form };
    setTagForm(form);
  }

  function closeEditorPanel() {
    setEditorPanel(null);
    setSiteForm(defaultSiteForm);
    setTagForm(defaultTagForm);
    originalSiteFormRef.current = null;
    originalTagFormRef.current = null;
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

    // 保存提交前快照（用于撤销）
    // 对于更新操作，使用 openSiteEditor 时保存的原始数据作为撤销快照
    // 对于创建操作，使用当前表单数据（新建撤销=删除该站点）
    const originalSnapshot = originalSiteFormRef.current;

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

      // 构建撤销动作
      const undoAction: UndoAction = isNewSite && result.item?.id
        ? { label: "撤销", undo: async () => {
            await requestJson(`/api/sites?id=${encodeURIComponent(result.item.id)}`, { method: "DELETE" });
            await syncNavigationData();
            await syncAdminBootstrap();
          } }
        : { label: "撤销", undo: async () => {
            // 用编辑前的原始数据恢复，而非当前表单数据
            const snap = originalSnapshot;
            if (!snap) return;
            const snapUrl = snap.url.trim();
            const snapNormalized = /^https?:\/\//i.test(snapUrl) ? snapUrl : `https://${snapUrl}`;
            await requestJson("/api/sites", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...snap,
                url: snapNormalized,
                iconUrl: snap.iconUrl.trim() || null,
                iconBgColor: snap.iconBgColor || null,
                description: snap.description?.trim() || null,
              }),
            });
            await syncNavigationData();
            await syncAdminBootstrap();
          } };
      setMessage(isNewSite ? "新网站已创建。" : "网站修改已保存。", undoAction);

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

    // 保留名称校验：阻止提交保留的标签名
    if (tagForm.id !== SOCIAL_TAG_ID && RESERVED_TAG_NAMES.includes(tagForm.name.trim())) {
      setErrorMessage("该标签名不可使用。如需添加社交信息，请尝试通过新建卡片中的「社交卡片」来创建。");
      return;
    }

    // 保存提交前快照（用于撤销）
    // 对于更新操作，使用 openTagEditor 时保存的原始数据
    // 对于创建操作，使用当前表单数据（新建撤销=删除该标签）
    const tagSnapshot: TagFormState = originalTagFormRef.current ?? { ...tagForm };

    try {
      // 社交卡片虚拟标签：保存描述到 app_settings
      if (tagForm.id === SOCIAL_TAG_ID) {
        await requestJson("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ socialTagDescription: tagForm.description || null }),
        });
        setTagForm(defaultTagForm);
        setEditorPanel(null);
        setTagAdminGroup("create");
        setMessage("标签配置已保存。", {
          label: "撤销",
          undo: async () => {
            await requestJson("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ socialTagDescription: tagSnapshot.description || null }),
            });
            await syncNavigationData();
            await syncAdminBootstrap();
          },
        });
        await syncNavigationData();
        await syncAdminBootstrap();
        return;
      }

      const isUpdate = !!tagForm.id;
      const result = await requestJson<{ item?: { id: string } }>("/api/tags", {
        method: tagForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tagForm, logoUrl: null, logoBgColor: null }),
      });
      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setTagAdminGroup("create");

      // 构建撤销动作
      const undoAction: UndoAction = isUpdate
        ? { label: "撤销", undo: async () => {
            await requestJson("/api/tags", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...tagSnapshot, logoUrl: null, logoBgColor: null }),
            });
            await syncNavigationData();
            await syncAdminBootstrap();
          } }
        : { label: "撤销", undo: async () => {
            const newId = result.item?.id;
            if (!newId) return;
            await requestJson(`/api/tags?id=${encodeURIComponent(newId)}`, { method: "DELETE" });
            await syncNavigationData();
            await syncAdminBootstrap();
          } };
      setMessage("标签配置已保存。", undoAction);

      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存标签失败");
    }
  }

  async function deleteCurrentSite(siteId: string, snapshot?: SiteFormState, sortCtx?: SiteDeleteSortContext) {
    setErrorMessage("");
    setMessage("");
    try {
      await requestJson(`/api/sites?id=${encodeURIComponent(siteId)}`, { method: "DELETE" });
      if (siteForm.id === siteId) {
        setSiteForm(defaultSiteForm);
        setEditorPanel(null);
        setSiteAdminGroup("create");
      }
      if (snapshot) {
        setMessage("网站已从导航页移除。", {
          label: "撤销",
          undo: async () => {
            const rawUrl = snapshot.url.trim();
            const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
            const result = await requestJson<{ item: { id: string } }>("/api/sites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...snapshot,
                url: normalizedUrl,
                iconUrl: snapshot.iconUrl.trim() || null,
                iconBgColor: snapshot.iconBgColor || null,
                description: snapshot.description?.trim() || null,
              }),
            });
            const newId = result.item?.id;
            if (newId && sortCtx) {
              // 恢复全局排序位置
              const gIdx = sortCtx.globalSiteIds.indexOf(siteId);
              if (gIdx >= 0) {
                const restored = sortCtx.globalSiteIds.map((id) => id === siteId ? newId : id).filter((id) => id !== siteId);
                // 插入新 ID 到原位
                restored.splice(gIdx, 0, newId);
                await requestJson("/api/sites/reorder-global", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: restored }),
                });
              }
              // 恢复各标签内排序位置
              for (const [tagId, ids] of Object.entries(sortCtx.tagSiteIds)) {
                const tIdx = ids.indexOf(siteId);
                if (tIdx >= 0) {
                  const restored = ids.map((id) => id === siteId ? newId : id).filter((id) => id !== siteId);
                  restored.splice(tIdx, 0, newId);
                  await requestJson(`/api/tags/${tagId}/sites/reorder`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: restored }),
                  });
                }
              }
            }
            await syncNavigationData();
            await syncAdminBootstrap();
          },
        });
      } else {
        setMessage("网站已从导航页移除。");
      }
      await syncNavigationData();
      await syncAdminBootstrap();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除网站失败");
    }
  }

  async function deleteCurrentTag(tagId: string, snapshot?: TagFormState, siteIds?: string[], sortCtx?: TagDeleteSortContext) {
    setErrorMessage("");
    setMessage("");
    try {
      await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, { method: "DELETE" });
      if (tagForm.id === tagId) {
        setTagForm(defaultTagForm);
        setEditorPanel(null);
        setTagAdminGroup("create");
      }
      if (snapshot) {
        // 保存删除前的站点关联快照，用于撤销恢复
        const capturedSiteIds = siteIds ?? [];
        setMessage("标签已删除。", {
          label: "撤销",
          undo: async () => {
            const result = await requestJson<{ item?: { id: string } }>("/api/tags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...snapshot, logoUrl: null, logoBgColor: null }),
            });
            // 恢复标签与站点的关联
            const newTagId = result.item?.id;
            if (newTagId && capturedSiteIds.length > 0) {
              await requestJson(`/api/tags/${encodeURIComponent(newTagId)}/sites/restore`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: capturedSiteIds }),
              });
            }
            // 恢复标签在标签栏中的原始位置
            if (newTagId && sortCtx) {
              const restored = sortCtx.orderedTagIds
                .filter((id) => id !== tagId);
              const origIdx = sortCtx.orderedTagIds.indexOf(tagId);
              if (origIdx >= 0) {
                restored.splice(origIdx, 0, newTagId);
              } else {
                restored.push(newTagId);
              }
              await requestJson("/api/tags/reorder", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: restored }),
              });
            }
            await syncNavigationData();
            await syncAdminBootstrap();
          },
        });
      } else {
        setMessage("标签已删除。");
      }
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
    originalSiteFormRef.current = null;
    originalTagFormRef.current = null;
  }

  /** 将当前表单标记为原始快照（供 AdminDrawer 等外部编辑入口使用） */
  function saveOriginalSnapshot() {
    if (siteForm.id) {
      originalSiteFormRef.current = { ...siteForm, tagIds: [...siteForm.tagIds] };
    }
    if (tagForm.id) {
      originalTagFormRef.current = { ...tagForm };
    }
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
    resetEditor, saveOriginalSnapshot,
  };
}
