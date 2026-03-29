/**
 * 可排序标签行组件
 * @description 支持拖拽排序的标签行，结合 dnd-kit 实现拖拽交互
 */

"use client";

import { defaultAnimateLayoutChanges, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Tag, type ThemeMode } from "@/lib/types";
import { TagRowCard } from "./tag-row-card";
import { TagRowContent } from "./tag-row-content";

const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export function SortableTagRow({
  tag,
  active,
  collapsed,
  themeMode,
  wallpaperAware,
  draggable,
  editable,
  onEdit,
  onSelect,
}: {
  tag: Tag;
  active: boolean;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  draggable: boolean;
  editable: boolean;
  onEdit: () => void;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
    disabled: !draggable,
    animateLayoutChanges: defaultAnimateLayoutChanges,
    transition: dragTransition,
  });

  return (
    <TagRowCard
      ref={setNodeRef}
      tag={tag}
      active={active}
      collapsed={collapsed}
      themeMode={themeMode}
      wallpaperAware={wallpaperAware}
      dragging={isDragging}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <TagRowContent
        tag={tag}
        collapsed={collapsed}
        themeMode={themeMode}
        wallpaperAware={wallpaperAware}
        editable={editable}
        draggable={draggable}
        onSelect={onSelect}
        onEdit={onEdit}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </TagRowCard>
  );
}
