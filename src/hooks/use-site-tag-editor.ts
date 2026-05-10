/**
 * 站点/标签编辑器 Hook
 * @description 管理站点和标签的 CRUD 操作、编辑模式、编辑器面板状态
 * @description 包含延迟删除机制：删除网站卡片时，自定义上传的图标不会立即删除，
 *   而是等到用户退出编辑模式或页面刷新时才清理，以支持编辑模式下的撤销操作
 */

import { useCallback, useRef, useState } from "react";
import type { Card, Tag } from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm, siteToFormState } from "@/components/admin";
import type { UndoAction } from "@/hooks/use-undo-stack";

export interface UseSiteTagEditorOptions {
  activeTagId: string | null;
  /** 获取当前所有站点数据（用于标签编辑时填充关联站点） */
  getAllSites: () => Card[];
  /** 成功消息回调，可选附带撤销动作 */
  setMessage: (msg: string, undo?: UndoAction) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
  /** 就地更新单个 Card（轻量刷新，避免全量重新请求） */
  updateCardInCache: (updated: Card) => void;
  /** 就地更新单个卡片的在线状态（在线检测完成后使用） */
  updateCardOnlineStatusInCache: (cardId: string, online: boolean) => void;
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
  openSiteEditor: (site: Card) => void;
  openTagEditor: (tag: Tag) => void;
  closeEditorPanel: () => void;
  submitSiteForm: (extraTagIds?: string[]) => Promise<void>;
  submitTagForm: () => Promise<void>;
  deleteCurrentSite: (siteId: string, snapshot?: SiteFormState, sortContext?: CardDeleteSortContext) => Promise<void>;
  deleteCurrentTag: (
    tagId: string,
    snapshot?: TagFormState,
    siteIds?: string[],
    sortCtx?: TagDeleteSortContext,
    batchDeleteOptions?: TagBatchDeleteOptions,
  ) => Promise<void>;
  resetEditor: () => void;
  /** 将当前表单标记为原始快照（用于外部编辑入口的撤销恢复） */
  saveOriginalSnapshot: () => void;
  /** 清理所有待删除的孤立 icon 资源（退出编辑模式时调用） */
  flushPendingAssetCleanup: () => Promise<void>;
  /** 页面刷新/关闭时的同步清理（使用 fetch + keepalive） */
  flushPendingAssetCleanupSync: () => void;
  /** 当前网站表单是否相对打开时有修改（用于关闭弹窗时决定是否显示 Toast） */
  isSiteFormModified: () => boolean;
  /** 当前标签表单是否相对打开时有修改 */
  isTagFormModified: () => boolean;
}

/** 被系统保留的标签名 */
const RESERVED_TAG_NAMES = ["社交卡片"];

/** 删除卡片时的排序上下文，用于撤销后恢复原位 */
export type CardDeleteSortContext = {
  /** 删除前的全局卡片 ID 列表（按 globalSortOrder 升序） */
  globalCardIds: string[];
  /** 删除前的标签内卡片 ID 列表（按标签 ID 分组） */
  tagCardIds: Record<string, string[]>;
};

/** 删除标签时的排序上下文，用于撤销后恢复标签在标签栏中的原位 */
export type TagDeleteSortContext = {
  /** 删除前的标签 ID 列表（按 sortOrder 升序） */
  orderedTagIds: string[];
};

/** 标签批量删除（标签+网站同时删除）时的附加撤销数据 */
export type TagBatchDeleteOptions = {
  /** 被删除网站的表单快照（用于撤销恢复网站） */
  siteSnapshots?: SiteFormState[];
  /** 网站删除前的排序上下文 */
  siteSortCtx?: CardDeleteSortContext;
  /** 被删除网站的图标资源 ID（延迟删除，撤销时从待删列表移除） */
  deletedAssetIds?: (string | null)[];
};

export function useSiteTagEditor(opts: UseSiteTagEditorOptions): UseSiteTagEditorReturn {
  const { activeTagId, getAllSites, setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap, updateCardInCache, updateCardOnlineStatusInCache } = opts;

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

  function openSiteEditor(site: Card) {
    setEditMode(true);
    setEditorPanel("site");
    setSiteAdminGroup("edit");
    const form = siteToFormState(site);
    originalSiteFormRef.current = { ...form, tagIds: [...form.tagIds], relatedCards: form.relatedCards.map((rs) => ({ ...rs })), todos: form.todos.map((t) => ({ ...t })) };
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
      const result = await requestJson<{ item: Card | null }>("/api/site-cards", {
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
            await requestJson(`/api/site-cards?id=${encodeURIComponent(result.item!.id)}`, { method: "DELETE" });
            await syncNavigationData();
            await syncAdminBootstrap();
          } }
        : { label: "撤销", undo: async () => {
            // 用编辑前的原始数据恢复，而非当前表单数据
            const snap = originalSnapshot;
            if (!snap) return;
            const snapUrl = snap.url.trim();
            const snapNormalized = /^https?:\/\//i.test(snapUrl) ? snapUrl : `https://${snapUrl}`;
            await requestJson("/api/site-cards", {
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

      // ── 轻量刷新策略 ──
      if (isNewSite) {
        // 新建站点：必须全量刷新（新增的排序位置、标签关联等需要完整同步）
        await syncNavigationData();
        await syncAdminBootstrap();
      } else if (result.item) {
        // 编辑站点：就地更新单个 Card，避免全量刷新导致所有卡片闪烁
        updateCardInCache(result.item);

        // 检测标签关联是否变化（影响标签的 siteCount）
        const origTagIds = new Set(originalSnapshot?.tagIds ?? []);
        const newTagIds = new Set(siteForm.tagIds);
        const tagsChanged = origTagIds.size !== newTagIds.size ||
          [...origTagIds].some((id) => !newTagIds.has(id));

        // 检测关联网站是否变化（双向关联需要刷新被关联站点的缓存）
        const origRelatedIds = new Set((originalSnapshot?.relatedCards ?? []).map((rs) => rs.cardId));
        const newRelatedIds = new Set(siteForm.relatedCards.map((rs) => rs.cardId));
        const relatedChanged = origRelatedIds.size !== newRelatedIds.size ||
          [...origRelatedIds].some((id) => !newRelatedIds.has(id)) ||
          [...newRelatedIds].some((id) => !origRelatedIds.has(id));

        if (tagsChanged || relatedChanged) {
          await syncNavigationData();
        }
        // 关联网站变化时，被关联站点的反向关联也需要更新，必须刷新管理数据
        if (relatedChanged) {
          await syncAdminBootstrap();
        }
      } else {
        // fallback：全量刷新
        await syncNavigationData();
        await syncAdminBootstrap();
      }

      // 即时在线检测（后台静默执行，不阻塞用户操作）
      // 仅在以下情况触发：新建站点 / 主站 URL 变更 / 在线检查开关从关→开
      // 检测完成后就地更新站点的在线状态，避免全量刷新
      const needsOnlineCheck = !siteForm.skipOnlineCheck && (
        isNewSite
        || normalizedUrl !== (originalSnapshot?.url ? (/^https?:\/\//i.test(originalSnapshot.url) ? originalSnapshot.url : `https://${originalSnapshot.url}`) : normalizedUrl)
        || siteForm.skipOnlineCheck !== originalSnapshot?.skipOnlineCheck
      );
      if (needsOnlineCheck && result.item?.id) {
        const siteId = result.item.id;
        void requestJson<{ id: string; online: boolean }>("/api/site-cards/check-online-single", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId }),
        }).then((checkResult) => {
          // 就地更新在线状态，无需全量刷新
          updateCardOnlineStatusInCache(siteId, checkResult.online);
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
      // 使用 siteToFormState 统一映射，新增 Site 字段时只需更新 siteToFormState 即可自动跟随
      const affectedSiteIds = [...new Set([...toAdd, ...toRemove])];
      const affectedSitesSnapshot = affectedSiteIds
        .map((siteId) => {
          const site = allSites.find((s) => s.id === siteId);
          if (!site) return null;
          return {
            form: siteToFormState(site),
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

        // 使用 siteToFormState 统一映射，新增 Site 字段时只需更新 siteToFormState 即可自动跟随
        const siteSnap = siteToFormState(site);
        await requestJson("/api/site-cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...siteSnap,
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
            // 使用 ...snap.form 展开，新增 Site 字段时自动跟随
            for (const snap of affectedSitesSnapshot) {
              const snapUrl = snap.form.url.trim();
              const snapNormalized = /^https?:\/\//i.test(snapUrl) ? snapUrl : `https://${snapUrl}`;
              await requestJson("/api/site-cards", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...snap.form,
                  url: snapNormalized,
                  iconUrl: snap.form.iconUrl.trim() || null,
                  iconBgColor: snap.form.iconBgColor || null,
                  description: snap.form.description?.trim() || null,
                  tagIds: snap.originalTagIds,
                }),
              });
            }
            await syncNavigationData();
            await syncAdminBootstrap();
          } }
        : { label: "撤销", undo: async () => {
            // 新建标签撤销：删除标签（card_tags 级联删除）
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

  async function deleteCurrentSite(siteId: string, snapshot?: SiteFormState, sortCtx?: CardDeleteSortContext) {
    setErrorMessage("");
    setMessage("");
    try {
      const result = await requestJson<{ ok: boolean; iconAssetId: string | null }>(
        `/api/site-cards?id=${encodeURIComponent(siteId)}`,
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
            const createResult = await requestJson<{ item: { id: string } }>("/api/site-cards", {
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
              const gIdx = sortCtx.globalCardIds.indexOf(siteId);
              if (gIdx >= 0) {
                const restored = sortCtx.globalCardIds.map((id) => id === siteId ? newId : id).filter((id) => id !== siteId);
                // 插入新 ID 到原位
                restored.splice(gIdx, 0, newId);
                await requestJson("/api/site-cards/reorder-global", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: restored }),
                });
              }
              // 恢复各标签内排序位置
              for (const [tagId, ids] of Object.entries(sortCtx.tagCardIds)) {
                const tIdx = ids.indexOf(siteId);
                if (tIdx >= 0) {
                  const restored = ids.map((id) => id === siteId ? newId : id).filter((id) => id !== siteId);
                  restored.splice(tIdx, 0, newId);
                  await requestJson(`/api/tags/${tagId}/cards/reorder`, {
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

  async function deleteCurrentTag(tagId: string, snapshot?: TagFormState, siteIds?: string[], sortCtx?: TagDeleteSortContext, batchOpts?: TagBatchDeleteOptions) {
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
        const capturedCardIds = siteIds ?? [];

        const siteSnaps = batchOpts?.siteSnapshots;
        const siteSortC = batchOpts?.siteSortCtx;
        const delAssetIds = batchOpts?.deletedAssetIds;
        setMessage("标签已删除。", {
          label: "撤销",
          undo: async () => {
            // 撤销顺序：必须先恢复标签，再恢复网站
            // 网站创建时 tagIds 引用标签，FK 约束要求标签先存在
            const oldToNewCardId = new Map<string, string>();

            // ① 恢复标签
            const tagResult = await requestJson<{ item?: { id: string } }>("/api/tags", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...snapshot, logoUrl: null, logoBgColor: null }),
            });
            const newTagId = tagResult.item?.id;

            // ② 恢复被删除的网站（标签已存在，FK 约束不会失败）
            if (siteSnaps && siteSnaps.length > 0) {
              // 撤销时从待删除集合中移除图标资源，避免资源被误删
              for (const aid of (delAssetIds ?? [])) {
                if (aid) pendingDeleteAssetIds.current.delete(aid);
              }
              // 重建所有被删除的网站，将旧标签 ID 映射为新标签 ID
              const oldToNewTagId = (tagId && newTagId) ? new Map([[tagId, newTagId]]) : undefined;
              for (const snap of siteSnaps) {
                const rawUrl = snap.url.trim();
                const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                const updatedTagIds = oldToNewTagId
                  ? snap.tagIds.map(tid => oldToNewTagId.get(tid) ?? tid)
                  : snap.tagIds;
                const createResult = await requestJson<{ item: { id: string } }>("/api/site-cards", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...snap,
                    url: normalizedUrl,
                    iconUrl: snap.iconUrl.trim() || null,
                    iconBgColor: snap.iconBgColor || null,
                    description: snap.description?.trim() || null,
                    tagIds: updatedTagIds,
                  }),
                });
                if (snap.id && createResult.item?.id) {
                  oldToNewCardId.set(snap.id, createResult.item.id);
                }
              }
              // 恢复网站的全局排序和各标签内排序
              if (siteSortC) {
                const restoredGlobal = siteSortC.globalCardIds
                  .map(id => oldToNewCardId.get(id) ?? id);
                await requestJson("/api/site-cards/reorder-global", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ids: restoredGlobal }),
                });
                for (const [tid, ids] of Object.entries(siteSortC.tagCardIds)) {
                  const restored = ids.map(id => oldToNewCardId.get(id) ?? id);
                  await requestJson(`/api/tags/${tid}/cards/reorder`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: restored }),
                  });
                }
              }
            }

            // ③ 恢复标签与站点的关联（补充非批量删除模式下仅删除标签时的关联恢复）
            if (newTagId && capturedCardIds.length > 0 && oldToNewCardId.size === 0) {
              await requestJson(`/api/tags/${encodeURIComponent(newTagId)}/cards/restore`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: capturedCardIds }),
              });
            }
            // ④ 恢复标签在标签栏中的原始位置
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
      originalSiteFormRef.current = { ...siteForm, tagIds: [...siteForm.tagIds], relatedCards: siteForm.relatedCards.map((rs) => ({ ...rs })), todos: siteForm.todos.map((t) => ({ ...t })) };
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

  /** 比较当前网站表单与原始快照是否有差异（覆盖 SiteFormState 全部可编辑字段） */
  function isSiteFormModified(): boolean {
    const orig = originalSiteFormRef.current;
    if (!orig) return true; // 新建模式，视为有修改
    const cur = siteForm;
    return (
      // 基本信息
      cur.name !== orig.name ||
      cur.url !== orig.url ||
      cur.description !== orig.description ||
      cur.iconUrl !== orig.iconUrl ||
      cur.iconBgColor !== orig.iconBgColor ||
      // 在线检测
      cur.skipOnlineCheck !== orig.skipOnlineCheck ||
      cur.offlineNotify !== orig.offlineNotify ||
      // 推荐上下文
      cur.recommendContext !== orig.recommendContext ||
      cur.recommendContextEnabled !== orig.recommendContextEnabled ||
      cur.recommendContextAutoGen !== orig.recommendContextAutoGen ||
      // AI 关联
      cur.aiRelationEnabled !== orig.aiRelationEnabled ||
      // 关联网站
      cur.relatedCardsEnabled !== orig.relatedCardsEnabled ||
      // 备忘便签
      cur.notes !== orig.notes ||
      cur.notesAiEnabled !== orig.notesAiEnabled ||
      // 待办列表
      cur.todosAiEnabled !== orig.todosAiEnabled ||
      // 置顶
      cur.isPinned !== orig.isPinned ||
      // 复杂字段（需 JSON 序列化比较内容）
      JSON.stringify(cur.tagIds) !== JSON.stringify(orig.tagIds) ||
      JSON.stringify(cur.accessRules) !== JSON.stringify(orig.accessRules) ||
      JSON.stringify(cur.relatedCards) !== JSON.stringify(orig.relatedCards) ||
      JSON.stringify(cur.todos) !== JSON.stringify(orig.todos)
    );
  }

  /** 比较当前标签表单与原始快照是否有差异 */
  function isTagFormModified(): boolean {
    const orig = originalTagFormRef.current;
    if (!orig) return true;
    const cur = tagForm;
    return (
      cur.name !== orig.name ||
      cur.description !== orig.description ||
      JSON.stringify(cur.siteIds) !== JSON.stringify(orig.siteIds)
    );
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
    flushPendingAssetCleanup,
    flushPendingAssetCleanupSync,
    isSiteFormModified, isTagFormModified,
  };
}
