/**
 * 可排序网站卡片组件
 * @description 支持拖拽排序的网站卡片，根据 site.cardType 自动选择渲染 SiteCardContent 或 SocialCardContent
 */

"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Site, type ThemeMode, isSocialCardSite, siteToSocialCard } from "@/lib/base/types";
import { SiteCardShell } from "./site-card-shell";
import { SiteCardContent } from "./site-card-content";
import { SocialCardContent } from "./social-card-content";

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
  onDelete,
  onTagSelect,
  themeMode,
  wallpaperAware,
  desktopCardFrosted,
  mobileCardFrosted,
  showOnlineIndicator,
  onCardClick,
}: {
  site: Site;
  index: number;
  viewEpoch: number;
  draggable: boolean;
  editable: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  onTagSelect: (tagId: string) => void;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  desktopCardFrosted: boolean;
  mobileCardFrosted: boolean;
  showOnlineIndicator?: boolean;
  onCardClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  const isCard = isSocialCardSite(site);

  return (
    <SiteCardShell
      ref={setNodeRef}
      site={site}
      dragging={isDragging}
      themeMode={themeMode}
      wallpaperAware={wallpaperAware}
      desktopCardFrosted={desktopCardFrosted}
      mobileCardFrosted={mobileCardFrosted}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      data-view-epoch={viewEpoch}
    >
      {isCard ? (
        <SocialCardContent
          card={siteToSocialCard(site)!}
          editable={editable}
          draggable={draggable}
          onEdit={onEdit}
          onDelete={onDelete}
          themeMode={themeMode}
          wallpaperAware={wallpaperAware}
          enterDelay={`${Math.min(index * 45, 220)}ms`}
          dragHandleProps={{
            ...attributes,
            ...listeners,
          }}
          onCardClick={onCardClick}
        />
      ) : (
        <SiteCardContent
          site={site}
          editable={editable}
          draggable={draggable}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagSelect={onTagSelect}
          themeMode={themeMode}
          wallpaperAware={wallpaperAware}
          showOnlineIndicator={showOnlineIndicator}
          enterDelay={`${Math.min(index * 45, 220)}ms`}
          dragHandleProps={{
            ...attributes,
            ...listeners,
          }}
        />
      )}
    </SiteCardShell>
  );
}
