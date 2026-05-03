/**
 * 轻量级 Tooltip 组件
 * @description 替代浏览器原生 title 属性，提供主题感知的美观悬浮提示
 * 使用方式：包裹需要提示的元素，传入 tip 字符串即可
 *
 * 行为：
 * - 跟踪光标位置，tooltip 显示在光标处
 * - 鼠标静止一段时间（350ms）后才显示
 * - 鼠标移动即取消/隐藏，避免快速划过时闪烁
 *
 * 注意：使用 display:contents 保持布局零侵入
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ThemeMode } from "@/lib/base/types";

/** 鼠标静止多久后显示 tooltip */
const SHOW_DELAY_MS = 350;

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
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** 取消待执行的显示定时器 */
  const cancelTimer = useCallback(() => {
    if (showTimerRef.current !== undefined) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    // 鼠标移动 → 取消上一次的显示计划 + 隐藏已显示的 tooltip
    cancelTimer();
    setOpen(false);

    const x = e.clientX;
    const y = e.clientY;

    // 鼠标在当前位置静止后才显示
    showTimerRef.current = setTimeout(() => {
      setPos({ x, y });
      setOpen(true);
    }, SHOW_DELAY_MS);
  }, [disabled, cancelTimer]);

  const handleMouseLeave = useCallback(() => {
    cancelTimer();
    setOpen(false);
  }, [cancelTimer]);

  // 卸载时清理
  useEffect(() => cancelTimer, [cancelTimer]);

  if (!tip) return <>{children}</>;

  return (
    <div
      className="contents"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {open && createPortal(
        <div
          className="fixed z-[99999] pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y + 16,
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
