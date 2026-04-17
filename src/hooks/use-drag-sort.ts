/**
 * 拖拽排序 Hook
 * @description 封装标签和站点的拖拽排序逻辑
 */

import { useCallback, useState } from "react";
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
import type { Site, Tag } from "@/lib/types";
import type { AdminBootstrap } from "@/lib/types";
import { requestJson } from "@/lib/api";

type DragKind = "tag" | "site";

export function useDragSort(options: {
  tags: Tag[];
  setTags: (tags: Tag[]) => void;
  siteList: { items: Site[] };
  setSiteList: (updater: (prev: { items: Site[]; nextCursor: string | null; total: number }) => { items: Site[]; nextCursor: string | null; total: number }) => void;
  adminData: AdminBootstrap | null;
  setAdminData: (updater: (prev: AdminBootstrap | null) => AdminBootstrap | null) => void;
  isAuthenticated: boolean;
  editMode: boolean;
  activeTagId: string | null;
  debouncedQuery: string;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
}) {
  const [activeDrag, setActiveDrag] = useState<{ id: string; kind: DragKind } | null>(null);
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(null);
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 90, tolerance: 6 } }),
  );

  const snapToCursorModifier = useCallback(
    ({ transform, activeNodeRect }: Parameters<Modifier>[0]) => {
      if (!activeDragOffset || !activeNodeRect) return transform;
      return { ...transform, x: transform.x + activeDragOffset.x - activeNodeRect.width / 2, y: transform.y + activeDragOffset.y - activeNodeRect.height / 2 };
    },
    [activeDragOffset],
  );

  function handleDragStart(kind: DragKind) {
    return (event: DragStartEvent) => {
      setActiveDrag({ id: String(event.active.id), kind });
      const rect = event.active.rect.current.initial;
      setActiveDragSize(rect?.width && rect?.height ? { width: rect.width, height: rect.height } : null);
      if (rect && event.activatorEvent instanceof MouseEvent)
        setActiveDragOffset({ x: event.activatorEvent.clientX - rect.left, y: event.activatorEvent.clientY - rect.top });
      else setActiveDragOffset(null);
    };
  }

  function handleDragCancel() {
    setActiveDrag(null);
    setActiveDragSize(null);
    setActiveDragOffset(null);
  }

  async function handleTagSort(event: DragEndEvent) {
    setActiveDrag(null); setActiveDragSize(null); setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !options.isAuthenticated || !options.editMode) return;
    const oi = options.tags.findIndex((t) => t.id === event.active.id);
    const ni = options.tags.findIndex((t) => t.id === event.over?.id);
    if (oi < 0 || ni < 0) return;
    const next = arrayMove(options.tags, oi, ni).map((t: Tag, i: number) => ({ ...t, sortOrder: i }));
    options.setTags(next);
    options.setAdminData((c) => c ? { ...c, tags: next } : c);
    try {
      await requestJson("/api/tags/reorder", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next.map((t: Tag) => t.id) }) });
      options.setMessage("标签顺序已更新。");
    } catch (e) {
      options.setErrorMessage(e instanceof Error ? e.message : "保存标签顺序失败");
      await Promise.all([options.syncNavigationData(), options.syncAdminBootstrap()]);
    }
  }

  async function handleSiteSort(event: DragEndEvent) {
    setActiveDrag(null); setActiveDragSize(null); setActiveDragOffset(null);
    if (!event.over || event.active.id === event.over.id || !options.isAuthenticated || !options.editMode || !options.adminData || options.debouncedQuery) return;
    const fullIds = options.activeTagId
      ? options.adminData.sites.filter((s) => s.tags.some((t) => t.id === options.activeTagId)).sort((l, r) => (l.tags.find((t) => t.id === options.activeTagId)?.sortOrder ?? 0) - (r.tags.find((t) => t.id === options.activeTagId)?.sortOrder ?? 0)).map((s) => s.id)
      : [...options.adminData.sites].sort((l, r) => l.globalSortOrder - r.globalSortOrder).map((s) => s.id);
    const oi = fullIds.indexOf(String(event.active.id));
    const ni = fullIds.indexOf(String(event.over.id));
    if (oi < 0 || ni < 0) return;
    const reordered = arrayMove(fullIds, oi, ni);
    const siteMap = new Map(options.siteList.items.map((s) => [s.id, s]));
    options.setSiteList((c) => ({ ...c, items: reordered.filter((id: string) => siteMap.has(id)).map((id: string) => siteMap.get(id) as Site) }));
    options.setAdminData((c) => {
      if (!c) return c;
      const om = new Map(reordered.map((id: string, i: number) => [id, i]));
      return { ...c, sites: c.sites.map((s) => { if (!om.has(s.id)) return s; const order = om.get(s.id) ?? 0; return options.activeTagId ? { ...s, tags: s.tags.map((t) => t.id === options.activeTagId ? { ...t, sortOrder: order } : t) } : { ...s, globalSortOrder: order }; }) };
    });
    try {
      if (options.activeTagId) {
        await requestJson(`/api/tags/${options.activeTagId}/sites/reorder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: reordered }) });
      } else {
        await requestJson("/api/sites/reorder-global", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: reordered }) });
      }
      options.setMessage(options.activeTagId ? "标签内网站顺序已更新。" : "网站顺序已更新。");
    } catch (e) {
      options.setErrorMessage(e instanceof Error ? e.message : "保存网站顺序失败");
      await Promise.all([options.syncNavigationData(), options.syncAdminBootstrap()]);
    }
  }

  const activeDraggedTag = activeDrag?.kind === "tag" ? options.tags.find((t) => t.id === activeDrag.id) ?? null : null;
  const activeDraggedSite = activeDrag?.kind === "site" ? options.siteList.items.find((s) => s.id === activeDrag.id) ?? options.adminData?.sites.find((s) => s.id === activeDrag.id) ?? null : null;

  return {
    sensors,
    snapToCursorModifier,
    activeDrag,
    activeDragSize,
    activeDraggedTag,
    activeDraggedSite,
    handleDragStart,
    handleDragCancel,
    handleTagSort,
    handleSiteSort,
  };
}
