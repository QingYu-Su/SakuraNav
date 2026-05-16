/**
 * 网站卡片右键/长按菜单
 * @description 三级结构：
 *   1. 跳转到主站（无备选 URL 时）或「跳转到该网站」（有备选 URL 时）
 *   2. 备选 URL 子菜单（hover 展开二级菜单，仅开启备选 URL 时显示）
 *   3. 关联网站子菜单（hover 展开二级菜单，仅有关联网站时显示）
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ExternalLink, StickyNote, ListChecks, Info, Link2, Network } from "lucide-react";
import { type Card, type RelatedSiteItem, type ThemeMode, type AccessRules } from "@/lib/base/types";
import { cn, withProtocol } from "@/lib/utils/utils";
import { NotesViewerDialog, TodoViewerDialog } from "./site-memo-dialogs";
import { SiteDetailDialog } from "./site-detail-dialog";

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  site: Card | null;
};

/** 全局右键菜单状态管理 */
let menuState: ContextMenuState = { visible: false, x: 0, y: 0, site: null };
let setMenuStateFn: ((s: ContextMenuState) => void) | null = null;
let tooltipResetFn: (() => void) | null = null;

export function showSiteContextMenu(site: Card, x: number, y: number) {
  const state = { visible: true, x, y, site };
  menuState = state;
  setMenuStateFn?.(state);
}

export function hideSiteContextMenu() {
  menuState = { ...menuState, visible: false };
  setMenuStateFn?.(menuState);
  tooltipResetFn?.();
}

/** 右键菜单是否可见（供 SiteCardPopover 等组件判断是否禁止触发） */
export function isContextMenuVisible(): boolean {
  return menuState.visible;
}

// ──────────────────────────────────────
// 工具函数
// ──────────────────────────────────────


type AlternateUrlItem = { id: string; url: string; label: string };

/** 提取备选 URL 列表 */
function getAlternateUrls(rules: AccessRules | null): AlternateUrlItem[] {
  if (!rules || !rules.urls) return [];
  return rules.urls.map((alt) => ({ id: alt.id, url: alt.url, label: alt.label || "备用" }));
}

/** 提取已启用的关联网站 */
function getRelatedSites(site: Card): RelatedSiteItem[] {
  return site.siteRelatedSites
    .filter((rs) => rs.enabled)
    .map((rs) => ({ cardId: rs.cardId, cardName: rs.cardName, cardIconUrl: rs.cardIconUrl, cardUrl: rs.cardUrl, enabled: rs.enabled, sortOrder: rs.sortOrder }));
}

/** 菜单定位：确保不超出视口 */
function getMenuPosition(x: number, y: number): React.CSSProperties {
  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const maxW = 260;
  const maxH = 360;
  const left = x + maxW > vw ? Math.max(8, vw - maxW - 8) : x;
  const top = y + maxH > vh ? Math.max(8, vh - maxH - 8) : y;
  return { left, top };
}

// ──────────────────────────────────────
// 子菜单定位（基于一级菜单项 DOM 元素计算位置，顶部对齐）
// ──────────────────────────────────────

function getSubmenuPosition(triggerEl: HTMLElement | null): { left: number; top: number } | null {
  if (!triggerEl) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const triggerRect = triggerEl.getBoundingClientRect();

  // 子菜单左边 = 一级菜单项右边 + 间距
  let left = triggerRect.right + 4;
  // 子菜单顶部 = 一级菜单项顶部（对齐）
  let top = triggerRect.top;
  const estimatedWidth = 200;
  const estimatedMaxH = 240;

  if (left + estimatedWidth > vw - 8) {
    // 右侧空间不足时，放到一级菜单项左侧
    left = triggerRect.left - estimatedWidth - 4;
  }
  if (left < 8) left = 8;
  if (top + estimatedMaxH > vh - 8) {
    top = Math.max(8, vh - 8 - estimatedMaxH);
  }

  return { left, top };
}

// ──────────────────────────────────────
// 子菜单组件
// ──────────────────────────────────────

function SubMenu({
  items,
  themeMode,
  triggerElement,
  onItemClick,
  onCancelClose,
}: {
  items: Array<{ id: string; url: string; label: string; iconUrl?: string | null }>;
  themeMode: ThemeMode;
  /** 一级菜单项的 DOM 元素（用于子菜单顶部对齐） */
  triggerElement: HTMLElement;
  onItemClick: (url: string) => void;
  /** 取消关闭定时器（光标进入子菜单时调用，防止子菜单被关闭） */
  onCancelClose?: () => void;
}) {
  const isDark = themeMode === "dark";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // 从一级菜单项 DOM 元素计算子菜单位置（顶部与一级菜单项对齐）
  const pos = getSubmenuPosition(triggerElement);
  if (!pos) return null;

  const tooltip = hoveredId && tooltipPos ? (
    <div
      className={cn(
        "fixed z-[99999] max-w-[320px] whitespace-normal break-all rounded-xl px-3 py-2 text-xs shadow-lg pointer-events-none",
        isDark ? "bg-slate-800/95 text-white/90 border border-white/10" : "bg-slate-800/92 text-white border border-slate-700/30",
      )}
      style={{ left: tooltipPos.x, top: tooltipPos.y, transform: "translateY(-50%)" }}
    >
      {items.find((i) => i.id === hoveredId)?.url}
    </div>
  ) : null;

  return createPortal(
    <div
      ref={submenuRef}
      style={{ left: pos.left, top: pos.top }}
      className={cn(
        "fixed z-[110] min-w-[180px] max-w-[260px] rounded-2xl border p-1.5 shadow-xl",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        isDark
          ? "border-white/15 bg-slate-900/96 backdrop-blur-xl"
          : "border-slate-200 bg-white/96 backdrop-blur-xl",
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => onCancelClose?.()}
    >
      <div className="max-h-[240px] overflow-y-auto py-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item.url)}
            onMouseEnter={(e) => {
              setHoveredId(item.id);
              const rect = e.currentTarget.getBoundingClientRect();
              const subRect = submenuRef.current?.getBoundingClientRect();
              const subRight = subRect ? subRect.right : rect.right;
              setTooltipPos({ x: subRight + 8, y: rect.top + rect.height / 2 });
            }}
            onMouseLeave={() => { setHoveredId(null); setTooltipPos(null); }}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
              isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
            )}
          >
            {item.iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.iconUrl} alt="" className="h-5 w-5 rounded-md shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
              {item.label}
            </span>
            <ExternalLink className={cn("h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70", isDark ? "text-white/50" : "text-slate-500")} />
          </button>
        ))}
      </div>
      {tooltip}
    </div>,
    document.body,
  );
}

// ──────────────────────────────────────
// 主菜单组件
// ──────────────────────────────────────

export function SiteContextMenu({ themeMode, onMemoChange, onLocateNote }: { themeMode: ThemeMode; onMemoChange?: () => void; onLocateNote?: (noteId: string) => void }) {
  const [state, setState] = useState<ContextMenuState>(menuState);
  const ref = useRef<HTMLDivElement>(null);
  const isDark = themeMode === "dark";

  // 子菜单展开状态
  const [activeSubmenu, setActiveSubmenu] = useState<"alts" | "related" | null>(null);
  // 触发子菜单的一级菜单项 DOM 引用（用于子菜单对齐）
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const submenuTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 备忘便签弹窗状态（独立于菜单可见性，确保弹窗即时渲染）
  const [memoDialog, setMemoDialog] = useState<"notes" | "todos" | null>(null);
  const [memoSite, setMemoSite] = useState<Card | null>(null);

  // 详细信息弹窗状态
  const [detailSite, setDetailSite] = useState<Card | null>(null);

  // ref callback：同步更新 ref，避免渲染时读取 ref.current
  const refCallback = useCallback((el: HTMLDivElement | null) => {
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, []);

  // 主菜单 URL tooltip
  const [hoveredPrimary, setHoveredPrimary] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { setMenuStateFn = setState; return () => { setMenuStateFn = null; }; }, []);
  useEffect(() => {
    tooltipResetFn = () => {
      setActiveSubmenu(null);
      setHoveredPrimary(false);
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

  // 备忘便签弹窗（基于独立 memoSite，在菜单关闭后仍可立即渲染）
  const closeMemoDialog = useCallback(() => {
    setMemoDialog(null);
    setMemoSite(null);
  }, []);

  const closeDetailDialog = useCallback(() => {
    setDetailSite(null);
  }, []);

  // 弹窗渲染（独立于菜单可见性，确保菜单关闭后弹窗仍能即时渲染）
  const dialogs = (
    <>
      {detailSite && (
        <SiteDetailDialog
          site={detailSite}
          themeMode={themeMode}
          onClose={closeDetailDialog}
        />
      )}
      {memoDialog === "notes" && memoSite && (
        <NotesViewerDialog
          notes={memoSite.siteNotes}
          themeMode={themeMode}
          onClose={closeMemoDialog}
        />
      )}
      {memoDialog === "todos" && memoSite && (
        <TodoViewerDialog
          siteId={memoSite.id}
          todos={memoSite.siteTodos}
          themeMode={themeMode}
          onClose={closeMemoDialog}
          onToggle={onMemoChange}
          onLocateNote={(noteId) => { closeMemoDialog(); onLocateNote?.(noteId); }}
        />
      )}
    </>
  );

  if (!state.visible || !state.site) return dialogs;

  const site = state.site;
  const altUrls = getAlternateUrls(site.siteAccessRules);
  const relatedSites = getRelatedSites(site);
  const hasAlts = altUrls.length > 0;
  const hasRelated = relatedSites.length > 0;
  const menuStyle = getMenuPosition(state.x, state.y);

  function openUrl(url: string) {
    window.open(withProtocol(url), "_blank", "noopener,noreferrer");
    hideSiteContextMenu();
  }

  /** 延迟打开子菜单（避免鼠标快速划过时闪烁） */
  function scheduleSubmenu(key: "alts" | "related", el: HTMLButtonElement) {
    clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => {
      setTriggerElement(el);
      setActiveSubmenu(key);
    }, 80);
  }

  function cancelSubmenu() {
    clearTimeout(submenuTimerRef.current);
    submenuTimerRef.current = setTimeout(() => setActiveSubmenu(null), 120);
  }

  /** 取消子菜单关闭定时器（供子菜单 onMouseEnter 调用） */
  function cancelSubmenuClose() {
    clearTimeout(submenuTimerRef.current);
  }

  // 主站 tooltip
  const primaryTooltip = hoveredPrimary && tooltipPos ? (
    <div
      className={cn(
        "fixed z-[99999] max-w-[320px] whitespace-normal break-all rounded-xl px-3 py-2 text-xs shadow-lg pointer-events-none",
        isDark ? "bg-slate-800/95 text-white/90 border border-white/10" : "bg-slate-800/92 text-white border border-slate-700/30",
      )}
      style={{ left: tooltipPos.x, top: tooltipPos.y, transform: "translateY(-50%)" }}
    >
      {site.siteUrl}
    </div>
  ) : null;

  return (
    <div
      ref={refCallback}
      style={menuStyle}
      className={cn(
        "fixed z-[100] min-w-[200px] max-w-[260px] rounded-2xl border p-1.5 shadow-xl origin-top-left",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        isDark
          ? "border-white/15 bg-slate-900/96 backdrop-blur-xl"
          : "border-slate-200 bg-white/96 backdrop-blur-xl",
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => { cancelSubmenu(); setHoveredPrimary(false); }}
    >
      {/* 网站名称 */}
      <div className={cn("px-3 py-2 text-sm font-semibold", isDark ? "text-white/70" : "text-slate-500")}>
        {site.name}
      </div>
      <div className={cn("mx-2 border-t", isDark ? "border-white/10" : "border-slate-100")} />

      {/* 1. 查看详细信息 */}
      <button
        type="button"
        onClick={() => { setDetailSite(site); hideSiteContextMenu(); }}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
          isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
        )}
      >
        <Info className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/50" : "text-slate-400")} />
        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
          查看详细信息
        </span>
      </button>

      {/* 2. 跳转到主站 */}
      <button
        type="button"
        onClick={() => openUrl(site.siteUrl)}
        onMouseEnter={(e) => {
          setActiveSubmenu(null);
          if (!hasAlts) return; // 没有备选 URL 时不显示 tooltip
          setHoveredPrimary(true);
          const rect = e.currentTarget.getBoundingClientRect();
          const menuRect = ref.current?.getBoundingClientRect();
          const menuRight = menuRect ? menuRect.right : rect.right;
          setTooltipPos({ x: menuRight + 8, y: rect.top + rect.height / 2 });
        }}
        onMouseLeave={() => { setHoveredPrimary(false); setTooltipPos(null); }}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
          isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
        )}
      >
        <ExternalLink className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/50" : "text-slate-400")} />
        <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
          {hasAlts ? "跳转到主站" : "跳转到该网站"}
        </span>
      </button>

      {/* 3. 备选 URL（有备选时显示，hover 展开子菜单） */}
      {hasAlts && (
        <button
          type="button"
          onClick={(e) => { setTriggerElement(e.currentTarget); setActiveSubmenu(activeSubmenu === "alts" ? null : "alts"); }}
          onMouseEnter={(e) => scheduleSubmenu("alts", e.currentTarget)}
          onMouseLeave={cancelSubmenu}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
            activeSubmenu === "alts"
              ? isDark ? "bg-white/12" : "bg-slate-100"
              : isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
          )}
        >
          <Link2 className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/50" : "text-slate-400")} />
          <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
            备选 URL
          </span>
          <span className={cn("text-xs tabular-nums", isDark ? "text-white/40" : "text-slate-400")}>
            {altUrls.length}
          </span>
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/40" : "text-slate-400")} />
        </button>
      )}

      {/* 4. 关联网站（有关联时显示，hover 展开子菜单） */}
      {hasRelated && (
        <button
          type="button"
          onClick={(e) => { setTriggerElement(e.currentTarget); setActiveSubmenu(activeSubmenu === "related" ? null : "related"); }}
          onMouseEnter={(e) => scheduleSubmenu("related", e.currentTarget)}
          onMouseLeave={cancelSubmenu}
          className={cn(
            "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
            activeSubmenu === "related"
              ? isDark ? "bg-white/12" : "bg-slate-100"
              : isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
          )}
        >
          <Network className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/50" : "text-slate-400")} />
          <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
            关联网站
          </span>
          <span className={cn("text-xs tabular-nums", isDark ? "text-white/40" : "text-slate-400")}>
            {relatedSites.length}
          </span>
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/40" : "text-slate-400")} />
        </button>
      )}

      {/* 备忘便签 — 查看备注 / 查看待办 */}
      {(site.siteNotes.trim() || site.siteTodos.length > 0) && (
        <>
          <div className={cn("mx-2 border-t", isDark ? "border-white/10" : "border-slate-100")} />
          {site.siteNotes.trim() && (
            <button
              type="button"
              onClick={() => { setMemoSite(site); hideSiteContextMenu(); setMemoDialog("notes"); }}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
                isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
              )}
            >
              <StickyNote className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/50" : "text-slate-400")} />
              <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
                查看备注
              </span>
            </button>
          )}
          {site.siteTodos.length > 0 && (
            <button
              type="button"
              onClick={() => { setMemoSite(site); hideSiteContextMenu(); setMemoDialog("todos"); }}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition",
                isDark ? "hover:bg-white/8" : "hover:bg-slate-100/80",
              )}
            >
              <ListChecks className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/50" : "text-slate-400")} />
              <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", isDark ? "text-white/85" : "text-slate-700")}>
                查看待办
              </span>
              <span className={cn("text-xs tabular-nums", isDark ? "text-white/40" : "text-slate-400")}>
                {site.siteTodos.filter((t) => !t.completed).length}/{site.siteTodos.length}
              </span>
            </button>
          )}
        </>
      )}

      {/* 主站 URL Tooltip */}
      {hoveredPrimary && tooltipPos && createPortal(primaryTooltip, document.body)}

      {/* 备选 URL 子菜单 */}
      {activeSubmenu === "alts" && hasAlts && triggerElement && (
        <SubMenu
          items={altUrls.map((u) => ({ id: u.id, url: u.url, label: u.label }))}
          themeMode={themeMode}
          triggerElement={triggerElement}
          onItemClick={openUrl}
          onCancelClose={cancelSubmenuClose}
        />
      )}

      {/* 关联网站子菜单 */}
      {activeSubmenu === "related" && hasRelated && triggerElement && (
        <SubMenu
          items={relatedSites.map((rs) => ({
            id: rs.cardId,
            url: rs.cardUrl,
            label: rs.cardName,
            iconUrl: rs.cardIconUrl,
          }))}
          themeMode={themeMode}
          triggerElement={triggerElement}
          onItemClick={openUrl}
          onCancelClose={cancelSubmenuClose}
        />
      )}

    </div>
  );
}
