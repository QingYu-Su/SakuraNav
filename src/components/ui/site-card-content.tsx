/**
 * 网站卡片内容组件
 * @description 网站卡片的内部内容展示，包括图标、名称、描述、标签等
 */

"use client";

import { useState, useCallback } from "react";
import { PencilLine } from "lucide-react";
import { type Site, type ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";

/** 图标背景色样式 */
function iconBgStyle(site: Site) {
  return site.iconBgColor && site.iconBgColor !== "transparent"
    ? { backgroundColor: site.iconBgColor }
    : { backgroundColor: "rgba(255,255,255,0.18)", mixBlendMode: "difference" as const };
}

export function SiteCardContent({
  site,
  editable,
  draggable,
  onEdit,
  onTagSelect,
  enterDelay,
  reserveActionSpace = false,
  dragHandleProps,
  themeMode = "light",
  wallpaperAware = false,
}: {
  site: Site;
  editable: boolean;
  draggable: boolean;
  onEdit?: () => void;
  onTagSelect?: (tagId: string) => void;
  enterDelay?: string;
  reserveActionSpace?: boolean;
  dragHandleProps?: Record<string, unknown>;
  themeMode?: ThemeMode;
  wallpaperAware?: boolean;
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

  // 判断是否需要显示图标（有 iconUrl 且未加载失败）
  const showIcon = site.iconUrl && !iconError;

  // 图标背景色（fallback 和正常状态共用）
  const fallbackBgStyle =
    site.iconBgColor && site.iconBgColor !== "transparent"
      ? { backgroundColor: site.iconBgColor }
      : { backgroundColor: "rgba(255,255,255,0.18)" };

  return (
    <div
      className="animate-card-enter relative flex h-full flex-col gap-5"
      style={enterDelay ? { animationDelay: enterDelay } : undefined}
    >
      {/* 拖拽手柄：顶部细横线 */}
      <div
        className={cn("flex justify-center rounded-full", draggable && "cursor-grab active:cursor-grabbing")}
        style={{ touchAction: "none" }}
        {...(draggable ? dragHandleProps : {})}
      >
        {draggable ? (
          <div className="h-[3px] w-20 rounded-full bg-current opacity-20" />
        ) : (
          <div className="h-[3px] w-20" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-start justify-between gap-4">
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 items-start gap-4"
        >
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
            {editable ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit?.(); }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-slate-900/8 bg-white/30 transition hover:bg-white/42 text-slate-700"
              >
                <PencilLine className="h-5 w-5 opacity-80" />
              </button>
            ) : null}
          </div>
          <div className="min-w-0">
            <h3 className={cn("truncate font-semibold tracking-tight", site.description ? "text-xl" : "text-2xl", textShadowClass)}>{site.name}</h3>
            {site.description ? (
              <p className={cn("mt-2 text-sm leading-7", descStyle)}>{site.description}</p>
            ) : null}
          </div>
        </a>
        {reserveActionSpace && !editable ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex h-11 w-11 rounded-2xl opacity-0" aria-hidden="true" />
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {site.tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onTagSelect?.(tag.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition hover:-translate-y-0.5",
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
                    ? "border-slate-600/24 bg-slate-500/16 text-slate-800 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)] hover:bg-slate-500/24"
                    : "border-white/28 bg-white/14 text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] hover:bg-white/20"
                  : themeMode === "light"
                    ? "border-slate-400/50 bg-slate-300/40 text-slate-700 hover:bg-slate-300/60"
                    : "border-white/12 bg-white/10 hover:bg-white/16",
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
