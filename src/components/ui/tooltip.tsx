/**
 * 轻量级 Tooltip 组件
 * @description 替代浏览器原生 title 属性，提供主题感知的美观悬浮提示
 * 使用方式：包裹需要提示的元素，传入 tip 字符串即可
 *
 * 注意：使用 display:contents 保持布局零侵入，通过 firstElementChild 定位
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ThemeMode } from "@/lib/base/types";

export function Tooltip({
  tip,
  children,
  themeMode = "dark",
  disabled = false,
}: {
  tip: string;
  children: React.ReactNode;
  themeMode?: ThemeMode;
  /** 禁用提示（如按钮已 disabled 时） */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updatePos = useCallback(() => {
    const wrapper = anchorRef.current;
    if (!wrapper) return;
    // display:contents 元素自身无盒模型，取第一个子元素来定位
    const el = wrapper.firstElementChild ?? wrapper;
    const rect = el.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const handleEnter = useCallback(() => {
    if (disabled) return;
    // 短延迟显示，避免鼠标快速划过时闪烁
    showTimerRef.current = setTimeout(() => {
      updatePos();
      setOpen(true);
    }, 350);
  }, [disabled, updatePos]);

  const handleLeave = useCallback(() => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    setOpen(false);
  }, []);

  // 卸载时清理
  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  // 滚动/resize 时更新位置或关闭
  useEffect(() => {
    if (!open) return;
    const hide = () => setOpen(false);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  if (!tip) return <>{children}</>;

  return (
    <div
      ref={anchorRef}
      className="contents"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {open && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{
            left: pos.x,
            bottom: window.innerHeight - pos.y + 8,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium shadow-lg ${
              themeMode === "light"
                ? "bg-slate-800/90 text-white"
                : "bg-white/90 text-slate-900"
            }`}
          >
            {tip}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
