/**
 * 标签行内容组件
 * @description 标签行的内部内容展示，Logo 固定左侧 + 名称/描述右侧，支持描述悬浮窗
 */

"use client";

import { type Tag, type ThemeMode, SOCIAL_TAG_ID, NOTE_TAG_ID } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { SiteCardPopover } from "./site-card-popover";

/** 社交卡片标签 Logo (Users 图标) */
function SocialTagLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** 网站卡片标签 Logo (Globe 图标) */
function SiteTagLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

/** 笔记卡片标签 Logo (StickyNote 图标) */
function NoteTagLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

export function TagRowContent({
  tag,
  collapsed,
  themeMode,
  wallpaperAware,
  editable,
  draggable,
  showPopover = true,
  onSelect,
  dragHandleProps,
}: {
  tag: Tag;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  editable: boolean;
  draggable: boolean;
  /** 是否显示描述悬浮窗（移动端标签栏可传 false 禁用） */
  showPopover?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  dragHandleProps?: Record<string, unknown>;
  reserveActionSpace?: boolean;
}) {
  const hasDescription = !!tag.description;
  const isSocialTag = tag.id === SOCIAL_TAG_ID;
  const isNoteTag = tag.id === NOTE_TAG_ID;

  /** 描述文本样式 */
  const descStyle = wallpaperAware
    ? themeMode === "light"
      ? "opacity-85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
      : "opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
    : themeMode === "light"
      ? "opacity-85"
      : "opacity-75";

  /** 悬浮窗内容：标签名 + 完整描述 / 站点数量 */
  const popoverContent = (
    <p className={cn(
      "whitespace-pre-wrap text-sm leading-6 select-text cursor-text",
      themeMode === "light" ? "text-slate-700" : "text-white/88",
    )}>
      <strong className={cn(
        "font-semibold",
        themeMode === "light" ? "text-slate-900" : "text-white",
      )}>
        {tag.name}：
      </strong>
      {tag.description || `${tag.siteCount} 个站点`}
    </p>
  );

  /** 标签 Logo 图标 — 固定尺寸，不受文字影响 */
  const tagLogoElement = isSocialTag
    ? <SocialTagLogo size={collapsed ? 16 : 20} />
    : isNoteTag
      ? <NoteTagLogo size={collapsed ? 16 : 20} />
      : <SiteTagLogo size={collapsed ? 16 : 20} />;

  return (
    <>
      {/* 拖拽手柄：编辑模式下统一显示横条，可拖拽时才启用交互 */}
      {editable ? (
        <div
          className={cn(
            "absolute left-1/2 top-0 -translate-x-1/2 rounded-full py-1.5",
            draggable && "group/drag cursor-grab active:cursor-grabbing",
          )}
          style={{ touchAction: "none" }}
          {...(draggable ? dragHandleProps : {})}
        >
          <div className={cn(
            "h-[3px] w-24 lg:w-16 rounded-full bg-current opacity-20",
            draggable && "transition-all duration-200 group-hover/drag:w-28 lg:group-hover/drag:w-20 group-hover/drag:opacity-40",
          )} />
        </div>
      ) : null}

      {!collapsed ? (
        /* 展开状态：左侧固定 Logo + 右侧文字区域 */
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 w-full items-center gap-3 text-left transition"
        >
          {/* Logo：固定宽度，不受文字内容影响 */}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center">
            {tagLogoElement}
          </span>
          {/* 文字区域：名称 + 描述/站点数（仅描述区域支持悬浮窗） */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium">
              {tag.name}
            </p>
            {hasDescription ? (
              showPopover ? (
                <SiteCardPopover
                  themeMode={themeMode}
                  placement="right"
                  variant="desc"
                  wrapperClassName="w-full"
                  trigger={(hovered) => (
                    <p className={cn("truncate text-sm", descStyle, hovered && "opacity-100")}>
                      {tag.description}
                    </p>
                  )}
                >
                  {popoverContent}
                </SiteCardPopover>
              ) : (
                <p className={cn("truncate text-sm", descStyle)}>
                  {tag.description}
                </p>
              )
            ) : (
              showPopover ? (
                <SiteCardPopover
                  themeMode={themeMode}
                  placement="right"
                  variant="desc"
                  wrapperClassName="w-full"
                  trigger={(hovered) => (
                    <p className={cn("text-sm opacity-65", hovered && "opacity-100")}>
                      {tag.siteCount} 个站点
                    </p>
                  )}
                >
                  {popoverContent}
                </SiteCardPopover>
              ) : (
                <p className="text-sm opacity-65">
                  {tag.siteCount} 个站点
                </p>
              )
            )}
          </div>
        </button>
      ) : (
        /* 折叠状态：仅展示 Logo + 标签名，居中对齐 */
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-center transition"
        >
          <span className="shrink-0">
            {tagLogoElement}
          </span>
          <span className="truncate text-sm font-medium">
            {tag.name}
          </span>
        </button>
      )}
    </>
  );
}
