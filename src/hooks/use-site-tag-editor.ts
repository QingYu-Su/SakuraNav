/**
 * 站点/标签编辑器 Hook
 * @description 管理站点和标签的 CRUD 操作、编辑模式、编辑器面板状态
 * @description 包含延迟删除机制：删除网站卡片时，自定义上传的图标不会立即删除，
 *   而是等到用户退出编辑模式或页面刷新时才清理，以支持编辑模式下的撤销操作
 */

import { useCallback, useRef, useState } from "react";
import type { Site, Tag } from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm, siteToFormState } from "@/components/admin";
import type { UndoAction } from "@/hooks/use-undo-stack";

export interface UseSiteTagEditorOptions {
  activeTagId: string | null;
  /** 获取当前所有站点数据（用于标签编辑时填充关联站点） */
  getAllSites: () => Site[];
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
  /** 清理所有待删除的孤立 icon 资源（退出编辑模式时调用） */
  flushPendingAssetCleanup: () => Promise<void>;
  /** 页面刷新/关闭时的同步清理（使用 fetch + keepalive） */
  flushPendingAssetCleanupSync: () => void;
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
  const { activeTagId, getAllSites, setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap } = opts;

  const [editMode, setEditMode] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"site" | "tag" | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormState>(defaultSiteForm);
  const [tagForm, setTagForm] = useState<TagFormState>(defaultTagForm);
  const [siteAdminGroup, setSiteAdminGroup] = useState<AdminGroup>("create");
  const [tagAdminGroup, setTagAdminGroup] = useState<AdminGroup>("create");

  /** 编辑前原始的表单快照，用于更新操作的撤销恢复 */
  const originalSiteFormRef = useRef<SiteFormState | null>(null);
  const originalTagFormRef = useRef<TagFormState | null>(null);

  /** 待删除的资源 ID 集合（延迟删除：退出编辑模式或页面刷新时才真正清理） */
  const pendingDeleteAssetIds = useRef<Set<string>>(new Set());

  function toggleEditMode() {
    if (!editMode) {
      setEditMode(true);
      return;
    }
    // 退出编辑模式时：清理待删除的资源
    void flushPendingAssetCleanup();
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
    const form = siteToFormState(site);
    originalSiteFormRef.current = { ...form, tagIds: [...form.tagIds], relatedSites: form.relatedSites.map((rs) => ({ ...rs })), todos: form.todos.map((t) => ({ ...t })) };
    setSiteForm(form);
  }

  function openTagEditor(tag: Tag) {
    setEditMode(true);
    setEditorPanel("tag");
    setTagAdminGroup("edit");
    // 根据当前所有站点数据，找出关联了该标签的站点 ID
    const allSites = getAllSites();
    const linkedSiteIds = allSites
      .filter((s) => s.tags.some((t) => t.id === tag.id))
      .map((s) => s.id);
    const form: TagFormState = {
      id: tag.id,
      name: tag.name,
      description: tag.description ?? "",
      siteIds: linkedSiteIds,
    };
    originalTagFormRef.current = { ...form, siteIds: [...form.siteIds] };
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
   * 提交网站表单（创建/更新），若开启了在线检测则保存后自动触发首次检测
   * 撤销操作不会重复触发在线检测，会保留上一次的检测结果
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
      // 传递原始 URL（编辑模式下从快照获取），用于检测 URL 变更
      originalUrl: isNewSite ? undefined : originalSnapshot?.url,
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
      // 只要开启了在线检测，保存后就自动触发一次检测
      const needsOnlineCheck = !skipOnlineCheck;
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

    // 提前判断是新建还是更新（快照构建和后续逻辑都需要）
    const isUpdate = !!tagForm.id;

    // 保存提交前快照（用于撤销）
    // 对于更新操作，使用 openTagEditor 时保存的原始数据（含编辑前的 siteIds）
    // 对于创建操作，siteIds 必须为 []（创建前标签不存在，不可能有任何关联）
    const tagSnapshot: TagFormState = isUpdate
      ? (originalTagFormRef.current ?? { ...tagForm, siteIds: [...tagForm.siteIds] })
      : { ...tagForm, siteIds: [] };

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

      const result = await requestJson<{ item?: { id: string } }>("/api/tags", {
        method: tagForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...tagForm, logoUrl: null, logoBgColor: null }),
      });

      const tagId = isUpdate ? tagForm.id! : result.item?.id;
      if (!tagId) {
        setErrorMessage("标签创建失败，未返回标签 ID");
        return;
      }

      // 同步网站卡片与标签的关联关系
      const allSites = getAllSites();
      const originalSiteIds = new Set(tagSnapshot.siteIds);
      const newSiteIds = new Set(tagForm.siteIds);

      // 需要添加该标签的网站（新勾选但之前未关联）
      const toAdd = tagForm.siteIds.filter((id) => !originalSiteIds.has(id));
      // 需要移除该标签的网站（之前关联但现在取消勾选）
      const toRemove = tagSnapshot.siteIds.filter((id) => !newSiteIds.has(id));

      // 在保存前快照受影响站点的原始数据（含原始 tagIds），供撤销恢复使用
      const affectedSiteIds = [...new Set([...toAdd, ...toRemove])];
      const affectedSitesSnapshot = affectedSiteIds
        .map((siteId) => {
          const site = allSites.find((s) => s.id === siteId);
          if (!site) return null;
          return {
            id: site.id,
            name: site.name,
            url: site.url,
            description: site.description ?? "",
            iconUrl: site.iconUrl ?? "",
            iconBgColor: site.iconBgColor ?? "transparent",
            skipOnlineCheck: site.skipOnlineCheck,
            onlineCheckFrequency: site.onlineCheckFrequency ?? "1d",
            onlineCheckTimeout: site.onlineCheckTimeout ?? 3,
            onlineCheckMatchMode: site.onlineCheckMatchMode ?? "status",
            onlineCheckKeyword: site.onlineCheckKeyword ?? "",
            onlineCheckFailThreshold: site.onlineCheckFailThreshold ?? 3,
            isPinned: site.isPinned,
            /** 保存前的原始 tagIds，撤销时直接恢复 */
            originalTagIds: site.tags.map((t) => t.id),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s != null);

      // 对受影响的网站逐个更新 tagIds
      for (const siteId of affectedSiteIds) {
        const site = allSites.find((s) => s.id === siteId);
        if (!site) continue;

        const currentTagIds = site.tags.map((t) => t.id);
        const shouldAdd = toAdd.includes(siteId);
        const shouldRemove = toRemove.includes(siteId);

        let updatedTagIds: string[];
        if (shouldAdd) {
          updatedTagIds = [...currentTagIds, tagId];
        } else if (shouldRemove) {
          updatedTagIds = currentTagIds.filter((id) => id !== tagId);
        } else {
          continue;
        }

        await requestJson("/api/sites", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: siteId,
            name: site.name,
            url: site.url,
            description: site.description ?? "",
            iconUrl: site.iconUrl ?? "",
            iconBgColor: site.iconBgColor ?? "transparent",
            skipOnlineCheck: site.skipOnlineCheck,
            isPinned: site.isPinned,
            tagIds: updatedTagIds,
          }),
        });
      }

      setTagForm(defaultTagForm);
      setEditorPanel(null);
      setTagAdminGroup("create");

      // 构建撤销动作
      // 关键：使用保存前捕获的 affectedSitesSnapshot 来恢复 tagIds，
      // 避免依赖闭包中可能过时的 getAllSites()
      const undoAction: UndoAction = isUpdate
        ? { label: "撤销", undo: async () => {
            // 恢复标签基本信息
            await requestJson("/api/tags", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...tagSnapshot, logoUrl: null, logoBgColor: null }),
            });
            // 利用保存前的快照恢复每个受影响站点的 tagIds
            for (const snap of affectedSitesSnapshot) {
              await requestJson("/api/sites", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: snap.id,
                  name: snap.name,
                  url: snap.url,
                  description: snap.description,
                  iconUrl: snap.iconUrl,
                  iconBgColor: snap.iconBgColor,
                  skipOnlineCheck: snap.skipOnlineCheck,
                  onlineCheckFrequency: snap.onlineCheckFrequency,
                  onlineCheckTimeout: snap.onlineCheckTimeout,
                  onlineCheckMatchMode: snap.onlineCheckMatchMode,
                  onlineCheckKeyword: snap.onlineCheckKeyword,
                  onlineCheckFailThreshold: snap.onlineCheckFailThreshold,
                  isPinned: snap.isPinned,
                  tagIds: snap.originalTagIds,
                }),
              });
            }
            await syncNavigationData();
            await syncAdminBootstrap();
          } }
        : { label: "撤销", undo: async () => {
            // 新建标签撤销：删除标签（site_tags 级联删除）
            await requestJson(`/api/tags?id=${encodeURIComponent(tagId)}`, { method: "DELETE" });
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
      const result = await requestJson<{ ok: boolean; iconAssetId: string | null }>(
        `/api/sites?id=${encodeURIComponent(siteId)}`,
        { method: "DELETE" },
      );

      // 将被删除站点的自定义图标加入待删除集合（延迟删除）
      if (result.iconAssetId) {
        pendingDeleteAssetIds.current.add(result.iconAssetId);
      }

      if (siteForm.id === siteId) {
        setSiteForm(defaultSiteForm);
        setEditorPanel(null);
        setSiteAdminGroup("create");
      }
      if (snapshot) {
        // 撤销时需要从待删除列表移除的 assetId（撤销会重新创建站点，资源又被引用）
        const capturedAssetId = result.iconAssetId;
        setMessage("网站已从导航页移除。", {
          label: "撤销",
          undo: async () => {
            // 撤销时从待删除集合中移除，避免资源被误删
            if (capturedAssetId) {
              pendingDeleteAssetIds.current.delete(capturedAssetId);
            }
            const rawUrl = snapshot.url.trim();
            const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
            const createResult = await requestJson<{ item: { id: string } }>("/api/sites", {
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
            const newId = createResult.item?.id;
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
    // 登出时也要清理待删除的资源
    void flushPendingAssetCleanup();
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
      originalSiteFormRef.current = { ...siteForm, tagIds: [...siteForm.tagIds], relatedSites: siteForm.relatedSites.map((rs) => ({ ...rs })) };
    }
    if (tagForm.id) {
      originalTagFormRef.current = { ...tagForm };
    }
  }

  /** 清理所有待删除的孤立 icon 资源，并清空待删除集合 */
  const flushPendingAssetCleanup = useCallback(async () => {
    const ids = pendingDeleteAssetIds.current;
    if (ids.size === 0) return;
    const assetIds = [...ids];
    ids.clear();
    try {
      await requestJson("/api/assets/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds }),
      });
    } catch {
      /* 静默忽略清理失败，不影响用户体验 */
    }
  }, []);

  /**
   * 页面刷新/关闭时的同步清理（使用 fetch + keepalive）
   * beforeunload 中 async 操作不可靠，需要同步发送请求
   */
  const flushPendingAssetCleanupSync = useCallback(() => {
    const ids = pendingDeleteAssetIds.current;
    if (ids.size === 0) return;
    const assetIds = [...ids];
    ids.clear();
    try {
      // sendBeacon 只支持 POST + string/FormData/Blob，不支持自定义 headers
      // 使用 fetch + keepalive 确保 CORS 和 Content-Type 正确
      fetch("/api/assets/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds }),
        credentials: "include",
        keepalive: true,
      }).catch(() => { /* 静默忽略 */ });
    } catch {
      /* 静默忽略 */
    }
  }, []);

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
    flushPendingAssetCleanup,
    flushPendingAssetCleanupSync,
  };
}
