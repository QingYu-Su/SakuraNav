/**
 * 拖拽排序 Hook
 * @description 管理标签和站点的拖拽排序逻辑
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { AdminBootstrap, Site, Tag } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import type { UndoAction } from "@/hooks/use-undo-stack";

type DragKind = "tag" | "site";

export const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export interface UseDragSortOptions {
  tags: Tag[];
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  adminData: AdminBootstrap | null;
  setAdminData: React.Dispatch<React.SetStateAction<AdminBootstrap | null>>;
  siteList: { items: Site[]; nextCursor: string | null; total: number };
  setSiteList: React.Dispatch<React.SetStateAction<{ items: Site[]; nextCursor: string | null; total: number }>>;
  activeTagId: string | null;
  debouncedQuery: string;
  isAuthenticated: boolean;
  editMode: boolean;
  /** 成功消息回调，可选附带撤销动作 */
  setMessage: (msg: string, undo?: UndoAction) => void;
  setErrorMessage: (msg: string) => void;
  /** 排序失败时调用，用于恢复本地数据 */
  onSortError: () => Promise<void>;
}

export interface UseDragSortReturn {
  sensors: ReturnType<typeof useSensors>;
  portalContainer: HTMLElement | null;
  snapToCursorModifier: Modifier;
  activeDraggedTag: Tag | null;
  activeDraggedSite: Site | null;
  activeDrag: { id: string; kind: DragKind } | null;
  activeDragSize: { width: number; height: number } | null;
  handleDragStart: (kind: DragKind) => (event: DragStartEvent) => void;
  handleDragCancel: () => void;
  handleTagSort: (event: DragEndEvent) => Promise<void>;
  handleSiteSort: (event: DragEndEvent) => Promise<void>;
}

export function useDragSort(opts: UseDragSortOptions): UseDragSortReturn {
  const {
    tags,
    setTags,
    adminData,
    setAdminData,
    siteList,
    setSiteList,
    activeTagId,
    debouncedQuery,
    isAuthenticated,
    editMode,
    setMessage,
    setErrorMessage,
    onSortError,
  } = opts;

  const [activeDrag, setActiveDrag] = useState<{ id: string; kind: DragKind } | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(null);
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);
  // portalContainer 在 SSR 时为 null，客户端为 document.body，永远不会变
  const portalContainer = useMemo(() => (typeof document !== "undefined" ? document.body : null), []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 90, tolerance: 6 } }),
  );

  const snapToCursorModifier = useCallback<Modifier>(
    ({ transform, activeNodeRect }) => {
      if (!activeDragOffset || !activeNodeRect) return transform;
      return {
        ...transform,
        x: transform.x + activeDragOffset.x - activeNodeRect.width / 2,
        y: transform.y + activeDragOffset.y - activeNodeRect.height / 2,
      };
    },
    [activeDragOffset],
  );

  /* ---- 拖拽开始/取消 ---- */

  function handleDragStart(kind: DragKind) {
    return (event: DragStartEvent) => {
      setActiveDrag({ id: String(event.active.id), kind });
      const rect = event.active.rect.current.initial;
      setActiveDragSize(
        rect?.width && rect?.height ? { width: rect.width, height: rect.height } : null,
      );
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

  /* ---- 标签排序 ---- */

  async function handleTagSort(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode) return;

    const oi = tags.findIndex((t) => t.id === event.active.id);
    const ni = tags.findIndex((t) => t.id === event.over?.id);
    if (oi < 0 || ni < 0) return;

    // 保存所有标签 ID 顺序（含虚拟标签，用于撤销）
    const prevTagIds = tags.map((t: Tag) => t.id);

    const next = arrayMove(tags, oi, ni).map((t: Tag, i: number) => ({ ...t, sortOrder: i }));
    setTags(next);
    setAdminData((c) => (c ? { ...c, tags: next } : c));

    // 发送所有标签 ID（含虚拟标签，API 会分别处理虚拟标签位置持久化和真实标签排序）
    const allTagIds = next.map((t: Tag) => t.id);

    try {
      await requestJson("/api/tags/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: allTagIds }),
      });
      setMessage("标签顺序已更新。", {
        label: "撤销",
        undo: async () => {
          await requestJson("/api/tags/reorder", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: prevTagIds }),
          });
          await onSortError();
        },
      });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存标签顺序失败");
      await onSortError();
    }
  }

  /* ---- 站点排序 ---- */

  async function handleSiteSort(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !isAuthenticated || !editMode || !adminData || debouncedQuery)
      return;

    const fullIds = activeTagId
      ? adminData.sites
          .filter((s) => s.tags.some((t) => t.id === activeTagId))
          .sort(
            (l, r) =>
              (l.tags.find((t) => t.id === activeTagId)?.sortOrder ?? 0) -
              (r.tags.find((t) => t.id === activeTagId)?.sortOrder ?? 0),
          )
          .map((s) => s.id)
      : [...adminData.sites]
          .sort((l, r) => l.globalSortOrder - r.globalSortOrder)
          .map((s) => s.id);

    const oi = fullIds.indexOf(String(event.active.id));
    const ni = fullIds.indexOf(String(event.over.id));
    if (oi < 0 || ni < 0) return;

    // 保存原始站点 ID 顺序（用于撤销）
    const prevSiteIds = [...fullIds];

    const reordered = arrayMove(fullIds, oi, ni);
    const siteMap = new Map(siteList.items.map((s) => [s.id, s]));
    setSiteList((c) => ({
      ...c,
      items: reordered.filter((id: string) => siteMap.has(id)).map((id: string) => siteMap.get(id) as Site),
    }));

    setAdminData((c) => {
      if (!c) return c;
      const om = new Map(reordered.map((id: string, i: number) => [id, i]));
      return {
        ...c,
        sites: c.sites.map((s) => {
          if (!om.has(s.id)) return s;
          const order = om.get(s.id) ?? 0;
          return activeTagId
            ? { ...s, tags: s.tags.map((t) => (t.id === activeTagId ? { ...t, sortOrder: order } : t)) }
            : { ...s, globalSortOrder: order };
        }),
      };
    });

    try {
      if (activeTagId) {
        await requestJson(`/api/tags/${activeTagId}/sites/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reordered }),
        });
      } else {
        await requestJson("/api/sites/reorder-global", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: reordered }),
        });
      }
      const msg = activeTagId ? "标签内网站顺序已更新。" : "网站顺序已更新。";
      setMessage(msg, {
        label: "撤销",
        undo: async () => {
          if (activeTagId) {
            await requestJson(`/api/tags/${activeTagId}/sites/reorder`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: prevSiteIds }),
            });
          } else {
            await requestJson("/api/sites/reorder-global", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: prevSiteIds }),
            });
          }
          await onSortError();
        },
      });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "保存网站顺序失败");
      await onSortError();
    }
  }

  /* ---- 派生状态 ---- */
  const activeDraggedTag = activeDrag?.kind === "tag" ? tags.find((t) => t.id === activeDrag.id) ?? null : null;
  const activeDraggedSite =
    activeDrag?.kind === "site"
      ? siteList.items.find((s) => s.id === activeDrag.id) ?? adminData?.sites.find((s) => s.id === activeDrag.id) ?? null
      : null;

  return {
    sensors,
    portalContainer,
    snapToCursorModifier,
    activeDraggedTag,
    activeDraggedSite,
    activeDrag,
    activeDragSize,
    handleDragStart,
    handleDragCancel,
    handleTagSort,
    handleSiteSort,
  };
}
