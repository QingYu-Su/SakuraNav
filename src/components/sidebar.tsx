/**
 * Sidebar 组件
 * 标签侧边栏，包含标签列表和拖拽排序功能
 */

"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useTheme, useTags, useAuth } from "@/contexts/app-context";
import { SortableTagRow } from "@/components/ui";
import type { Tag } from "@/lib/types";

// ============================================
// Types
// ============================================

type SidebarProps = {
  // 状态
  mobileOpen: boolean;
  activeTagId: string | null;
  
  // 样式相关
  hasActiveWallpaper: boolean;
  
  // 回调函数
  onSelectTag: (tagId: string | null) => void;
  onEditTag: (tag: Tag) => void;
  onTagReorder: (event: DragEndEvent) => void;
};

// ============================================
// Component
// ============================================

export function Sidebar({
  mobileOpen,
  activeTagId,
  hasActiveWallpaper,
  onSelectTag,
  onEditTag,
  onTagReorder,
}: SidebarProps) {
  const { theme } = useTheme();
  const { tags } = useTags();
  const { isAuthenticated } = useAuth();
  
  // 拖拽状态
  const [_activeDragId, setActiveDragId] = useState<string | null>(null);
  // Portal 容器（用于拖拽预览）
  const portalContainer = typeof document !== 'undefined' ? document.body : null;
  
  // 编辑模式（应该从外部传入或通过 Context）
  const editMode = false; // TODO: 从 props 或 Context 获取
  
  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
  );

  // 样式计算
  const sidebarChromeClass =
    theme === "light"
      ? hasActiveWallpaper
        ? "lg:border-r border-slate-950/8 bg-[linear-gradient(180deg,rgba(255,251,247,0.46),rgba(255,255,255,0.3))] shadow-[18px_0_48px_rgba(148,163,184,0.10)] backdrop-blur-[26px]"
        : "lg:border-r border-slate-950/6 bg-[linear-gradient(180deg,rgba(247,240,232,0.92),rgba(238,239,245,0.9),rgba(227,236,244,0.92))] shadow-[18px_0_48px_rgba(148,163,184,0.12)] backdrop-blur-xl"
      : hasActiveWallpaper
        ? "lg:border-r border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.64),rgba(15,23,42,0.46))] shadow-[18px_0_48px_rgba(2,6,23,0.26)] backdrop-blur-[26px]"
        : "lg:border-r border-white/8 bg-[linear-gradient(180deg,rgba(66,64,108,0.82),rgba(58,62,99,0.76),rgba(50,58,88,0.78))] shadow-[18px_0_48px_rgba(10,17,31,0.12)] backdrop-blur-xl";
  
  // 拖拽处理
  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
  }
  
  function handleDragCancel() {
    setActiveDragId(null);
  }
  
  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    onTagReorder(event);
  }
  
  return (
    <aside
      className={cn(
        "shrink-0 p-4 transition-all duration-500",
        sidebarChromeClass,
        "lg:block",
        mobileOpen ? "block" : "hidden lg:block",
        "w-full lg:w-[300px]",
      )}
    >
      {/* 标题栏 */}
      <div className="mb-5 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.26em] opacity-60">
            Labels
          </p>
          <h2 className="mt-1 text-xl font-semibold">分类标签</h2>
        </div>
      </div>
      
      {/* 标签列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tags.map((tag) => tag.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tags.map((tag) => (
              <SortableTagRow
                key={tag.id}
                tag={tag}
                active={tag.id === activeTagId}
                collapsed={false}
                themeMode={theme}
                wallpaperAware={hasActiveWallpaper}
                draggable={isAuthenticated && editMode}
                editable={isAuthenticated && editMode}
                onEdit={() => onEditTag(tag)}
                onSelect={() => onSelectTag(tag.id)}
              />
            ))}
          </div>
        </SortableContext>
        
        {/* 拖拽覆盖层 */}
        {portalContainer &&
          createPortal(
            <div>TODO: DragOverlay</div>,
            portalContainer
          )}
      </DndContext>
    </aside>
  );
}
