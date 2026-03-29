"use client";

import { GripVertical, PencilLine } from "lucide-react";
import { type Tag, type ThemeMode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TagRowContent({
  tag,
  collapsed,
  themeMode,
  wallpaperAware,
  editable,
  draggable,
  onSelect,
  onEdit,
  dragHandleProps,
  reserveActionSpace = false,
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
  const tagMediaClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/34 text-slate-700"
      : "border-white/14 bg-white/10 text-white/92"
    : "border-white/14 bg-white/14";
  const tagActionButtonClass = wallpaperAware
    ? themeMode === "light"
      ? "border-slate-900/8 bg-white/30 hover:bg-white/42"
      : "border-white/14 bg-white/10 hover:bg-white/16"
    : "border-white/12 bg-white/10 hover:bg-white/18";

  return (
    <>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 text-left transition active:scale-[0.985]",
          collapsed ? "justify-center" : "",
        )}
      >
        {tag.logoUrl ? (
          <img
            src={tag.logoUrl}
            alt={`${tag.name} logo`}
            className={cn("h-10 w-10 rounded-2xl object-cover", tagMediaClass)}
          />
        ) : (
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold", tagMediaClass)}>
            {tag.name.charAt(0)}
          </span>
        )}
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{tag.name}</span>
            <span className="block text-xs opacity-65">{tag.siteCount} 个站点</span>
          </span>
        ) : null}
      </button>
      {!collapsed && (editable || draggable || reserveActionSpace) ? (
        <div className="flex items-center gap-2">
          {editable ? (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                tagActionButtonClass,
              )}
            >
              <PencilLine className="h-4 w-4 opacity-80" />
            </button>
          ) : null}
          {draggable ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-10 w-10 cursor-grab items-center justify-center rounded-2xl border transition active:cursor-grabbing",
                tagActionButtonClass,
              )}
              style={{ touchAction: "none" }}
              {...dragHandleProps}
            >
              <GripVertical className="h-4 w-4 opacity-70" />
            </button>
          ) : null}
          {!editable && !draggable && reserveActionSpace ? (
            <>
              <span className="inline-flex h-10 w-10 rounded-2xl opacity-0" aria-hidden="true" />
              <span className="inline-flex h-10 w-10 rounded-2xl opacity-0" aria-hidden="true" />
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
