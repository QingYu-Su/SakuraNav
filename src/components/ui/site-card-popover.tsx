/**
 * 网站卡片悬浮弹出组件
 * @description 用于描述和标签的交互式悬浮弹窗，支持鼠标悬停保持、内容复制和标签跳转
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";

/**
 * 关闭延迟 (ms) — 用户从触发元素移到弹窗时需要穿越间隙
 */
const CLOSE_DELAY = 300;

// ── 全局互斥：同一时刻只允许一个 SiteCardPopover 打开 ──
let activeId: number | null = null;
let activeDismissFn: (() => void) | null = null;
let nextId = 0;

/**
 * 悬浮弹出窗容器
 * 使用 fixed 定位 + Portal 渲染到 body，避免被卡片 overflow-hidden 裁切
 */
export function SiteCardPopover({
  trigger,
  children,
  themeMode,
  placement = "top",
  variant = "default",
}: {
  trigger: (hovered: boolean) => React.ReactNode;
  children: React.ReactNode;
  themeMode: ThemeMode;
  /** 弹出位置：top = 触发元素上方，bottom = 触发元素下方 */
  placement?: "top" | "bottom";
  /** 弹出窗变体：desc = 描述弹窗（文字光标、阻止点击穿透） */
  variant?: "default" | "desc";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0, w: 320 });
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const anchorRef = useRef<HTMLDivElement>(null);

  // 每个弹窗实例的唯一标识，用于全局互斥注册
  const [instanceId] = useState(() => nextId++);

  /** 关闭弹窗：清除定时器 + 关闭状态 + 从全局互斥中移除 */
  const dismiss = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(false);
    if (activeId === instanceId) { activeId = null; activeDismissFn = null; }
  }, [instanceId]);

  /** 计算弹窗位置 */
  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: rect.left,
      y: placement === "top" ? rect.top : rect.bottom,
      w: Math.min(320, rect.width),
    });
  }, [placement]);

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      if (activeId === instanceId) { activeId = null; activeDismissFn = null; }
    }, CLOSE_DELAY);
  }, [instanceId]);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  // 打开时计算位置 + 监听滚动/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onMove = () => updatePosition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, updatePosition]);

  // 清理：卸载时从全局注册中移除
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (activeId === instanceId) { activeId = null; activeDismissFn = null; }
    };
  }, [instanceId]);

  const handleMouseEnter = useCallback(() => {
    cancelClose();
    // 全局互斥：立即关闭上一个弹窗，不延迟
    if (activeId != null && activeId !== instanceId && activeDismissFn) {
      activeDismissFn();
    }
    activeId = instanceId;
    activeDismissFn = dismiss;
    setOpen(true);
    requestAnimationFrame(() => updatePosition());
  }, [cancelClose, updatePosition, dismiss, instanceId]);

  /**
   * 事件委托：弹窗内任何按钮点击后自动关闭弹窗
   * 用于标签悬浮窗 — 点击标签跳转后弹窗立即消失
   */
  const handlePopoverClick = useCallback((e: React.MouseEvent) => {
    // 阻止点击穿透到下层
    e.stopPropagation();
    if (variant === "desc") {
      e.preventDefault();
    }
    // 检测点击目标是否为按钮，若是则关闭弹窗
    if ((e.target as HTMLElement).closest("button")) {
      dismiss();
    }
  }, [variant, dismiss]);

  return (
    <div
      ref={anchorRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={scheduleClose}
    >
      {trigger(open)}
      {open && createPortal(
        <div
          className={cn(
            "site-card-popover",
            variant === "desc" && "site-card-popover--desc",
            themeMode === "light"
              ? "border-slate-200/50 bg-white/96 text-slate-900 shadow-[0_22px_80px_rgba(0,0,0,0.10)] backdrop-blur-2xl"
              : "border-white/14 bg-[#0f172aee] text-white shadow-[0_22px_80px_rgba(15,23,42,0.48)] backdrop-blur-xl",
          )}
          style={{
            left: pos.x,
            maxWidth: pos.w,
            ...(placement === "top"
              ? { bottom: window.innerHeight - pos.y, paddingBottom: 8, paddingTop: 8 }
              : { top: pos.y, paddingTop: 8, paddingBottom: 8 }),
          }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={handlePopoverClick}
        >
          <div className={cn(
            "rounded-[14px]",
            themeMode === "light" ? "bg-white/96" : "bg-[#0f172aee]",
          )}>
            {children}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
