/**
 * 标签删除 Hook
 * @description 管理标签删除的确认对话框状态和删除逻辑，
 *   区分普通标签（三选项对话框）和社交卡片标签（专用对话框）
 */

"use client";

import { useState } from "react";
import type { Tag, Site } from "@/lib/base/types";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import type { TagDeleteSortContext, SiteDeleteSortContext } from "./use-site-tag-editor";
import { siteToFormState } from "@/components/admin";
import type { SiteFormState } from "@/components/admin";
import { requestJson } from "@/lib/base/api";
import type { DeleteTagMode } from "@/components/dialogs/delete-tag-dialog";
import type { UseSiteTagEditorReturn } from "./use-site-tag-editor";

interface AdminDataLike {
  sites: Site[];
  tags: { id: string; sortOrder: number }[];
}

export function useTagDelete({
  adminData,
  editor,
  onDeleteSocialTag,
}: {
  adminData: AdminDataLike | null;
  editor: Pick<UseSiteTagEditorReturn, "deleteCurrentTag">;
  onDeleteSocialTag: () => void;
}) {
  /* ---------- 社交卡片标签删除 ---------- */
  const [deleteSocialTagDialogOpen, setDeleteSocialTagDialogOpen] = useState(false);

  function confirmDeleteSocialTag() {
    setDeleteSocialTagDialogOpen(false);
    onDeleteSocialTag();
  }

  /* ---------- 普通标签删除 ---------- */
  const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
  const [deleteTagTarget, setDeleteTagTarget] = useState<Tag | null>(null);

  /** 标签卡片删除按钮点击：根据标签类型弹出不同对话框 */
  function handleDeleteTag(tag: Tag) {
    if (tag.id === SOCIAL_TAG_ID) {
      setDeleteSocialTagDialogOpen(true);
    } else {
      setDeleteTagTarget(tag);
      setDeleteTagDialogOpen(true);
    }
  }

  /** 确认删除普通标签，mode: "all" 同时删除关联网站，"tag-only" 仅删除标签 */
  function confirmDeleteTag(mode: DeleteTagMode) {
    setDeleteTagDialogOpen(false);
    const tag = deleteTagTarget;
    if (!tag) return;
    setDeleteTagTarget(null);

    const tagSnap = {
      id: tag.id,
      name: tag.name,
      description: tag.description ?? "",
      siteIds: (adminData?.sites ?? [])
        .filter((s) => s.tags.some((t) => t.id === tag.id))
        .map((s) => s.id),
    };
    const siteIds = adminData?.sites
      .filter((s) => s.tags.some((t) => t.id === tag.id))
      .map((s) => s.id) ?? [];
    const tagSortCtx: TagDeleteSortContext | undefined = adminData
      ? { orderedTagIds: [...adminData.tags].sort((a, b) => a.sortOrder - b.sortOrder).map((t) => t.id) }
      : undefined;

    if (mode === "all" && siteIds.length > 0) {
      // 删除标签 + 删除所有关联网站卡片
      void (async () => {
        // 保存网站快照和排序上下文（用于撤销恢复）
        const siteSnaps: SiteFormState[] = adminData
          ? siteIds
              .map(siteId => {
                const site = adminData.sites.find(s => s.id === siteId);
                return site ? siteToFormState(site) : null;
              })
              .filter((s): s is SiteFormState => s != null)
          : [];
        const siteSortCtx: SiteDeleteSortContext | undefined = adminData
          ? {
              globalSiteIds: [...adminData.sites]
                .sort((a, b) => a.globalSortOrder - b.globalSortOrder)
                .map(s => s.id),
              tagSiteIds: Object.fromEntries(
                adminData.tags
                  .map(t => {
                    const ids = [...adminData.sites]
                      .filter(s => s.tags.some(st => st.id === t.id))
                      .sort((a, b) => {
                        const aSort = a.tags.find(st => st.id === t.id)?.sortOrder ?? 0;
                        const bSort = b.tags.find(st => st.id === t.id)?.sortOrder ?? 0;
                        return aSort - bSort;
                      })
                      .map(s => s.id);
                    return [t.id, ids] as const;
                  }),
              ),
            }
          : undefined;
        // 逐个删除网站，收集图标资源 ID（延迟删除，撤销时移除）
        const assetIds: (string | null)[] = [];
        for (const siteId of siteIds) {
          const result = await requestJson<{ ok: boolean; iconAssetId: string | null }>(
            `/api/sites?id=${encodeURIComponent(siteId)}`,
            { method: "DELETE" },
          );
          assetIds.push(result.iconAssetId);
        }
        await editor.deleteCurrentTag(tag.id, tagSnap, siteIds, tagSortCtx, {
          siteSnapshots: siteSnaps,
          siteSortCtx,
          deletedAssetIds: assetIds,
        });
      })();
    } else {
      // 仅删除标签
      void editor.deleteCurrentTag(tag.id, tagSnap, siteIds, tagSortCtx);
    }
  }

  function closeDeleteTagDialog() {
    setDeleteTagDialogOpen(false);
    setDeleteTagTarget(null);
  }

  return {
    /** 删除社交卡片标签对话框是否打开 */
    deleteSocialTagDialogOpen,
    /** 确认删除社交卡片标签 */
    confirmDeleteSocialTag,
    /** 关闭社交卡片标签删除对话框 */
    closeSocialTagDialog: () => setDeleteSocialTagDialogOpen(false),
    /** 打开社交卡片标签删除确认对话框（供 AdminDrawer 等外部入口使用） */
    openSocialTagDialog: () => setDeleteSocialTagDialogOpen(true),
    /** 普通标签删除对话框是否打开 */
    deleteTagDialogOpen,
    /** 当前待删除标签 */
    deleteTagTarget,
    /** 标签删除按钮点击处理 */
    handleDeleteTag,
    /** 确认删除普通标签 */
    confirmDeleteTag,
    /** 关闭普通标签删除对话框 */
    closeDeleteTagDialog,
  };
}
