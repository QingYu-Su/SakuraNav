/**
 * 可排序网站卡片组件
 * @description 支持拖拽排序的网站卡片，结合 dnd-kit 实现拖拽交互
 */

"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Site, type ThemeMode } from "@/lib/types";
import { SiteCardShell } from "./site-card-shell";
import { SiteCardContent } from "./site-card-content";

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export function SortableSiteCard({
  site,
  index,
  viewEpoch,
  draggable,
  editable,
  onEdit,
  onTagSelect,
  themeMode,
  wallpaperAware,
  desktopCardFrosted,
  mobileCardFrosted,
  showOnlineIndicator,
}: {
  site: Site;
  index: number;
  viewEpoch: number;
  draggable: boolean;
  editable: boolean;
  onEdit: () => void;
  onTagSelect: (tagId: string) => void;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  desktopCardFrosted: boolean;
  mobileCardFrosted: boolean;
  showOnlineIndicator?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  return (
    <SiteCardShell
      ref={setNodeRef}
      site={site}
      dragging={isDragging}
      themeMode={themeMode}
      wallpaperAware={wallpaperAware}
      desktopCardFrosted={desktopCardFrosted}
      mobileCardFrosted={mobileCardFrosted}
      showOnlineIndicator={showOnlineIndicator}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      data-view-epoch={viewEpoch}
    >
      <SiteCardContent
        site={site}
        editable={editable}
        draggable={draggable}
        onEdit={onEdit}
        onTagSelect={onTagSelect}
        themeMode={themeMode}
        wallpaperAware={wallpaperAware}
        enterDelay={`${Math.min(index * 45, 220)}ms`}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </SiteCardShell>
  );
}
