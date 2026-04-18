/**
 * 标签行内容组件
 * @description 标签行的内部内容展示，包括名称、站点数量等
 */

"use client";

import { type Tag, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";

export function TagRowContent({
  tag,
  collapsed,
  draggable,
  onSelect,
  dragHandleProps,
}: {
  tag: Tag;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  editable: boolean;
  draggable: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  dragHandleProps?: Record<string, unknown>;
  reserveActionSpace?: boolean;
}) {
  return (
    <>
      {/* 拖拽手柄：顶部细横线 */}
      {draggable ? (
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 cursor-grab rounded-full active:cursor-grabbing"
          style={{ touchAction: "none" }}
          {...dragHandleProps}
        >
          <div className="h-[3px] w-8 rounded-full bg-current opacity-20" />
        </div>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center text-center transition",
          collapsed ? "justify-center" : "justify-center",
        )}
      >
        {!collapsed ? (
          <span className="min-w-0 w-full">
            <span className="block text-base font-medium">{tag.name}</span>
            <span className="block text-sm opacity-65">
              {tag.description || `${tag.siteCount} 个站点`}
            </span>
          </span>
        ) : (
          <span className="text-sm font-medium">{tag.name}</span>
        )}
      </button>
    </>
  );
}
