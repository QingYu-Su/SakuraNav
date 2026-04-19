/**
 * 可排序社交卡片组件
 * @description 支持拖拽排序的社交卡片，结合 dnd-kit 实现拖拽交互
 */

"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SocialCard, ThemeMode } from "@/lib/base/types";
import { SiteCardShell } from "./site-card-shell";
import { SocialCardContent } from "./social-card-content";

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

/** 将社交卡片映射为 SiteCardShell 所需的 Site 形状 */
export function cardToSiteShape(card: SocialCard) {
  return {
    id: card.id,
    name: card.label,
    url: "#",
    description: null,
    iconUrl: card.iconUrl,
    iconBgColor: card.iconBgColor,
    isOnline: null,
    skipOnlineCheck: true,
    isPinned: false,
    globalSortOrder: card.globalSortOrder,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    tags: [],
  };
}

export function SortableSocialCard({
  card,
  index,
  viewEpoch,
  draggable,
  editable,
  onEdit,
  themeMode,
  wallpaperAware,
  desktopCardFrosted,
  mobileCardFrosted,
}: {
  card: SocialCard;
  index: number;
  viewEpoch: number;
  draggable: boolean;
  editable: boolean;
  onEdit: () => void;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  desktopCardFrosted: boolean;
  mobileCardFrosted: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  const siteShape = cardToSiteShape(card);

  return (
    <SiteCardShell
      ref={setNodeRef}
      site={siteShape}
      dragging={isDragging}
      themeMode={themeMode}
      wallpaperAware={wallpaperAware}
      desktopCardFrosted={desktopCardFrosted}
      mobileCardFrosted={mobileCardFrosted}
      showOnlineIndicator={false}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      data-view-epoch={viewEpoch}
    >
      <SocialCardContent
        card={card}
        editable={editable}
        draggable={draggable}
        onEdit={onEdit}
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
