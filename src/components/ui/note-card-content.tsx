/**
 * 笔记卡片内容组件
 * @description 笔记卡片的内部内容展示，中间显示标题，右下角显示笔记图标装饰
 */

"use client";

import { cn } from "@/lib/utils/utils";
import type { NoteCard, ThemeMode } from "@/lib/base/types";
import { CardHeader } from "./card-header";
import { Tooltip } from "./tooltip";
import { StickyNote } from "lucide-react";

export function NoteCardContent({
  card,
  editable,
  draggable,
  onEdit,
  onDelete,
  enterDelay,
  dragHandleProps,
  themeMode,
  wallpaperAware,
  onCardClick,
}: {
  card: NoteCard;
  editable: boolean;
  draggable: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  enterDelay?: string;
  dragHandleProps?: Record<string, unknown>;
  themeMode?: ThemeMode;
  wallpaperAware?: boolean;
  onCardClick?: () => void;
}) {
  const isDark = themeMode === "dark";

  const textShadowClass = wallpaperAware
    ? themeMode === "light"
      ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
      : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
    : "";

  return (
    <div
      className="animate-card-enter relative flex h-full cursor-pointer flex-col items-center justify-center gap-3 pt-0.5"
      style={enterDelay ? { animationDelay: enterDelay } : undefined}
      onClick={onCardClick}
    >
      {/* 共用卡片头部：编辑按钮 + 拖拽手柄 + 删除按钮 */}
      <CardHeader
        editable={editable}
        draggable={draggable}
        themeMode={themeMode ?? "light"}
        wallpaperAware={wallpaperAware ?? false}
        dragHandleProps={draggable ? dragHandleProps : undefined}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* 笔记图标 */}
      <div className={cn(
        "flex h-16 w-16 items-center justify-center rounded-2xl",
        isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-500",
      )}>
        <StickyNote className="h-8 w-8" />
      </div>

      {/* 标题：居中，超长截断，hover 显示完整标题 */}
      <Tooltip tip={card.title} themeMode={themeMode ?? "light"} disabled={!card.title}>
        <h3 className={cn(
          "mt-2 max-w-[80%] truncate px-3 text-center font-semibold tracking-tight text-xl",
          textShadowClass,
        )}>
          {card.title}
        </h3>
      </Tooltip>

      {/* 右下角笔记图标装饰 */}
      <div className="mt-auto flex w-full justify-end">
        <div className={cn(
          "shrink-0 opacity-30",
          isDark ? "text-white/40" : "text-slate-400",
        )}>
          <StickyNote size={16} />
        </div>
      </div>
    </div>
  );
}
