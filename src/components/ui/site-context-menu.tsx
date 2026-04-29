/**
 * 网站卡片右键/长按菜单
 * @description 显示网站卡片所有 URL（主站 + 备选），用户可选择跳转
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import { type Site, type ThemeMode, type AccessRules } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  site: Site | null;
};

/** 全局右键菜单状态管理 */
let menuState: ContextMenuState = { visible: false, x: 0, y: 0, site: null };
let setMenuStateFn: ((s: ContextMenuState) => void) | null = null;
let tooltipResetFn: (() => void) | null = null;

export function showSiteContextMenu(site: Site, x: number, y: number) {
  const state = { visible: true, x, y, site };
  menuState = state;
  setMenuStateFn?.(state);
}

export function hideSiteContextMenu() {
  menuState = { ...menuState, visible: false };
  setMenuStateFn?.(menuState);
  // 同步重置 Tooltip 状态
  tooltipResetFn?.();
}

export function SiteContextMenu({ themeMode }: { themeMode: ThemeMode }) {
  const [state, setState] = useState<ContextMenuState>(menuState);
  const ref = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const isDark = themeMode === "dark";

  useEffect(() => {
    setMenuStateFn = setState;
    return () => { setMenuStateFn = null; };
  }, []);

  useEffect(() => {
    tooltipResetFn = () => {
      setHoveredId(null);
      setTooltipPos(null);
    };
    return () => { tooltipResetFn = null; };
  }, []);

  // 点击外部关闭
  useEffect(() => {
    if (!state.visible) return;
    const handler = () => hideSiteContextMenu();
    document.addEventListener("click", handler);
    document.addEventListener("contextmenu", handler);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("contextmenu", handler);
    };
  }, [state.visible]);

  if (!state.visible || !state.site) return null;

  const site = state.site;
  const rules = site.accessRules;
  const allUrls = buildUrlList(site, rules);

  // 定位：确保不超出视口
  const menuStyle = getMenuPosition(state.x, state.y);

  /** URL Tooltip 内容（hover 条目时显示） */
  const hoveredItem = hoveredId ? allUrls.find((u) => u.id === hoveredId) : null;
  const urlTooltip = hoveredItem && tooltipPos ? (
    <div
      className={cn(
        "fixed z-[99999] max-w-[320px] whitespace-normal break-all rounded-xl px-3 py-2 text-xs shadow-lg pointer-events-none",
        isDark ? "bg-slate-800/95 text-white/90 border border-white/10" : "bg-slate-800/92 text-white border border-slate-700/30",
      )}
      style={{
        left: tooltipPos.x,
        top: tooltipPos.y,
        transform: "translateY(-50%)",
      }}
    >
      {hoveredItem.url}
    </div>
  ) : null;

  return (
    <div
      ref={ref}
      style={menuStyle}
      className={cn(
        "fixed z-[100] min-w-[180px] max-w-[280px] rounded-2xl border p-1.5 shadow-xl",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        isDark
          ? "border-white/15 bg-slate-900/96 backdrop-blur-xl"
          : "border-slate-200 bg-white/96 backdrop-blur-xl",
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 网站名称 */}
      <div className={cn("px-3 py-2 text-sm font-semibold", isDark ? "text-white/70" : "text-slate-500")}>
        {site.name}
      </div>
      <div className={cn("mx-2 border-t", isDark ? "border-white/10" : "border-slate-100")} />

      {/* URL 列表 */}
      <div className="max-h-[280px] overflow-y-auto py-1">
        {allUrls.map((item) => {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                window.open(item.url, "_blank", "noopener,noreferrer");
                hideSiteContextMenu();
              }}
              onMouseEnter={(e) => {
                setHoveredId(item.id);
                const rect = e.currentTarget.getBoundingClientRect();
                const menuRect = ref.current?.getBoundingClientRect();
                const menuRight = menuRect ? menuRect.right : rect.right;
                setTooltipPos({ x: menuRight + 8, y: rect.top + rect.height / 2 });
              }}
              onMouseLeave={() => {
                setHoveredId(null);
                setTooltipPos(null);
              }}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
                isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
              )}
            >
              {/* 标签名 */}
              <span className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium",
                isDark ? "text-white/85" : "text-slate-700",
              )}>
                {item.label}
              </span>

              {/* hover 时显示跳转图标 */}
              <ExternalLink className={cn(
                "h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70",
                isDark ? "text-white/50" : "text-slate-500",
              )} />
            </button>
          );
        })}
      </div>

      {/* URL Tooltip — hover 某个条目时在右侧显示完整 URL */}
      {hoveredId && tooltipPos && createPortal(urlTooltip, document.body)}
    </div>
  );
}

// ──────────────────────────────────────
// 工具函数
// ──────────────────────────────────────

type UrlMenuItem = {
  id: string;
  url: string;
  label: string;
  isPrimary: boolean;
};

function buildUrlList(site: Site, rules: AccessRules | null): UrlMenuItem[] {
  const items: UrlMenuItem[] = [];

  // 主 URL 始终在最前面
  items.push({
    id: "__primary__",
    url: site.url,
    label: "主站",
    isPrimary: true,
  });

  // 备选 URL
  if (rules?.urls) {
    for (const alt of rules.urls) {
      if (!alt.enabled) continue;
      items.push({
        id: alt.id,
        url: alt.url,
        label: alt.label || "备用",
        isPrimary: false,
      });
    }
  }

  return items;
}

function getMenuPosition(x: number, y: number): React.CSSProperties {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;

  const maxW = 280;
  const maxH = 360;
  const left = x + maxW > vw ? Math.max(8, vw - maxW - 8) : x;
  const top = y + maxH > vh ? Math.max(8, vh - maxH - 8) : y;

  return { left, top };
}
