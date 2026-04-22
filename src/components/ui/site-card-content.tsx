/**
 * 网站卡片内容组件
 * @description 网站卡片的内部内容展示，包括图标、名称、描述、标签等
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { type Site, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { SiteCardPopover } from "./site-card-popover";
import { CardHeader } from "./card-header";

/** 图标背景色样式 */
function iconBgStyle(site: Site) {
  return site.iconBgColor && site.iconBgColor !== "transparent"
    ? { backgroundColor: site.iconBgColor }
    : { backgroundColor: "rgba(255,255,255,0.18)", mixBlendMode: "difference" as const };
}

/** 网站卡片类型 Logo（右下角装饰） */
function SiteTypeLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

/** 标签样式映射 — 卡片上展示的标签与悬浮窗中的标签共用 */
function tagClassName(tag: { isHidden: boolean }, themeMode: ThemeMode, wallpaperAware: boolean, interactive = false) {
  return cn(
    "rounded-full border px-3 py-1 text-xs",
    interactive && "transition",
    tag.isHidden
      ? wallpaperAware
        ? themeMode === "light"
          ? "border-amber-500/40 bg-amber-400/20 text-amber-900 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]"
          : "border-amber-400/50 bg-amber-500/24 text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
        : themeMode === "light"
          ? "border-amber-400/50 bg-amber-300/30 text-amber-800"
          : "border-amber-200/28 bg-amber-300/16 text-amber-50"
      : wallpaperAware
        ? themeMode === "light"
          ? cn(
            "border-slate-600/24 bg-slate-500/16 text-slate-800 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]",
            interactive && "hover:bg-slate-500/24",
          )
          : cn(
            "border-white/28 bg-white/14 text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
            interactive && "hover:bg-white/20",
          )
        : themeMode === "light"
          ? cn(
            "border-slate-400/50 bg-slate-300/40 text-slate-700",
            interactive && "hover:bg-slate-300/60",
          )
          : cn(
            "border-white/12 bg-white/10",
            interactive && "hover:bg-white/16",
          ),
  );
}

export function SiteCardContent({
  site,
  editable,
  draggable,
  onEdit,
  onDelete,
  onTagSelect,
  enterDelay,
  dragHandleProps,
  themeMode = "light",
  wallpaperAware = false,
  showOnlineIndicator = false,
}: {
  site: Site;
  editable: boolean;
  draggable: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTagSelect?: (tagId: string) => void;
  enterDelay?: string;
  dragHandleProps?: Record<string, unknown>;
  themeMode?: ThemeMode;
  wallpaperAware?: boolean;
  showOnlineIndicator?: boolean;
}) {
  const textShadowClass = wallpaperAware
    ? themeMode === "light"
      ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
      : "drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
    : "";
  const descStyle = wallpaperAware
    ? themeMode === "light"
      ? "opacity-85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
      : "opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
    : themeMode === "light"
      ? "opacity-85"
      : "opacity-75";
  // 动态图标加载失败时 fallback 到首字母
  const [iconError, setIconError] = useState(false);
  const handleIconError = useCallback(() => setIconError(true), []);

  const showIcon = site.iconUrl && !iconError;

  const fallbackBgStyle =
    site.iconBgColor && site.iconBgColor !== "transparent"
      ? { backgroundColor: site.iconBgColor }
      : { backgroundColor: "rgba(255,255,255,0.18)" };

  // 标签截断：基于隐藏测量行的实际 DOM 宽度动态计算可显示标签数
  const allTags = site.tags;
  const tagRowRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [tagFitResult, setTagFitResult] = useState<{ visible: typeof allTags; hasMore: boolean }>({
    visible: allTags,
    hasMore: false,
  });

  /** 从隐藏测量行读取每个标签的真实宽度，结合容器宽度计算可显示数量 */
  const computeTagFit = useCallback((containerWidth: number) => {
    if (allTags.length === 0 || containerWidth === 0) {
      setTagFitResult({ visible: allTags, hasMore: false });
      return;
    }
    const measureEl = measureRef.current;
    if (!measureEl) return;

    const tagEls = measureEl.querySelectorAll<HTMLElement>("[data-measure-tag]");
    if (tagEls.length === 0) return;

    const gap = 8;
    const ellipsisWidth = 36;
    let used = 0;
    let count = allTags.length;

    for (let i = 0; i < tagEls.length; i++) {
      const w = tagEls[i].offsetWidth;
      used += w + (i > 0 ? gap : 0);
      // 如果后面还有标签，需要额外预留 "..." + gap 的空间
      const withEllipsis = (i < allTags.length - 1) ? used + gap + ellipsisWidth : used;
      if (withEllipsis > containerWidth && i > 0) {
        count = i;
        break;
      }
    }

    setTagFitResult({ visible: allTags.slice(0, count), hasMore: allTags.length > count });
  }, [allTags]);

  // 监测标签行容器的实际宽度，变化时重新计算
  useEffect(() => {
    const el = tagRowRef.current;
    if (!el) return;
    computeTagFit(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        computeTagFit(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [computeTagFit]);

  const hasDescription = !!site.description;

  /**
   * 卡片整体点击跳转
   * 仅在点击目标不是按钮/链接（即标签、编辑按钮等交互元素）时触发
   * 标签按钮、编辑按钮通过 e.stopPropagation() 阻止冒泡到这里
   */
  const handleCardClick = useCallback(() => {
    window.open(site.url, "_blank", "noopener,noreferrer");
  }, [site.url]);

  return (
    <div
      className="animate-card-enter relative flex h-full cursor-pointer flex-col gap-1 pt-0.5"
      style={enterDelay ? { animationDelay: enterDelay } : undefined}
      onClick={handleCardClick}
    >
      {/* 共用卡片头部：编辑按钮 + 拖拽手柄 + 删除按钮 */}
      <CardHeader
        editable={editable}
        draggable={draggable}
        themeMode={themeMode}
        wallpaperAware={wallpaperAware}
        dragHandleProps={draggable ? dragHandleProps : undefined}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="flex items-start gap-4">
        {/* 图标 + 名称 + 描述区域（点击由 handleCardClick 统一处理） */}
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-14 w-14 shrink-0 rounded-[20px] overflow-hidden border border-white/18 shadow-lg"
              style={(showIcon ? iconBgStyle(site) : fallbackBgStyle) as React.CSSProperties}
            >
              {showIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={site.iconUrl!}
                  alt={`${site.name} icon`}
                  className="h-full w-full object-cover"
                  onError={handleIconError}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold"
                  style={fallbackBgStyle}
                >
                  {site.name.charAt(0)}
                </div>
              )}
            </div>
            {/* 在线状态指示器：位于图标正下方 */}
            {showOnlineIndicator && site.isOnline != null ? (
              <span
                className={cn(
                  "h-2 w-2 rounded-full shadow-sm",
                  site.isOnline
                    ? "bg-emerald-400 shadow-emerald-400/40"
                    : "bg-red-400 shadow-red-400/40",
                )}
                title={site.isOnline ? "网站可正常访问" : "网站可能无法访问"}
              />
            ) : null}
          </div>
          {/* 名称+描述区域：min-h-[3.5rem] 保证即使无描述也占据 2 行高度，标签始终贴底 */}
          <div className="min-w-0 flex-1">
            <h3 className={cn("truncate font-semibold tracking-tight", textShadowClass, hasDescription ? "text-xl" : "text-2xl")}>{site.name}</h3>
            {/* 描述：2 行截断 + 悬浮弹窗展示完整内容（文字光标，阻止点击穿透） */}
            {hasDescription ? (
              <SiteCardPopover
                themeMode={themeMode}
                placement="top"
                variant="desc"
                trigger={(hovered) => (
                  <p className={cn("mt-2 text-sm leading-7 desc-clamp-2", descStyle, hovered && "opacity-100")}>
                    {site.description}
                  </p>
                )}
              >
                <p className={cn(
                  "whitespace-pre-wrap text-sm leading-6 select-text cursor-text",
                  themeMode === "light" ? "text-slate-700" : "text-white/88",
                )}>
                  <strong className={cn(
                    "font-semibold",
                    themeMode === "light" ? "text-slate-900" : "text-white",
                  )}>
                    {site.name}：
                  </strong>
                  {site.description}
                </p>
              </SiteCardPopover>
            ) : (
              /* 无描述时占位，保持与有描述时相同高度（2 行 × line-height 1.75rem + margin-top 0.5rem） */
              <div className="mt-2 min-h-[3.5rem]" />
            )}
          </div>
        </div>
      </div>

      {/* 底部区域：标签 + 右下角类型 Logo */}
      <div className="mt-auto flex items-end justify-between gap-2">
        {/* 标签区域：单行展示可点击标签 + 悬浮弹窗展示完整标签列表 */}
        {allTags.length > 0 ? (
          <SiteCardPopover
            themeMode={themeMode}
            placement="bottom"
            wrapperClassName="min-w-0 flex-1"
            trigger={() => (
              <div ref={tagRowRef} className="flex w-full flex-nowrap items-center gap-2 overflow-hidden">
                {tagFitResult.visible.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTagSelect?.(tag.id); }}
                    className={cn(tagClassName(tag, themeMode, wallpaperAware, true), "shrink-0 cursor-pointer transition")}
                  >
                    {tag.name}
                  </button>
                ))}
                {tagFitResult.hasMore && (
                  <span
                    className={cn(
                      "shrink-0 px-1 py-1 text-xs",
                      themeMode === "light" ? "text-slate-500" : "text-white/50",
                    )}
                  >
                    ...
                  </span>
                )}
              </div>
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onTagSelect?.(tag.id)}
                  className={cn(tagClassName(tag, themeMode, wallpaperAware, true), "cursor-pointer")}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </SiteCardPopover>
        ) : (
          <div className="flex-1" />
        )}

        {/* 右下角类型 Logo */}
        <div className={cn(
          "shrink-0 opacity-30",
          themeMode === "light" ? "text-slate-400" : "text-white/40",
        )}>
          <SiteTypeLogo size={18} />
        </div>
      </div>

      {/* 隐藏测量行：始终渲染所有标签，用于获取真实宽度（不影响布局） */}
      {allTags.length > 0 && (
        <div
          ref={measureRef}
          className="invisible absolute left-0 top-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="flex flex-nowrap items-center gap-2">
            {allTags.map((tag) => (
              <span
                key={tag.id}
                data-measure-tag
                className={cn(tagClassName(tag, themeMode, wallpaperAware), "shrink-0")}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
