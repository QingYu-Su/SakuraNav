/**
 * 会话失效检测与弹窗管理 Hook
 * @description 统一管理三种会话失效场景的检测、弹窗状态和确认处理
 * 1. SSR 检测（cookie 存在但会话无效） → useState 初始值直接打开弹窗
 * 2. API 401 拦截 → requestJson 触发 SESSION_EXPIRED_EVENT → 弹窗
 * 3. 切换用户目标不存在 → 调用 showTargetGone → 弹窗
 */

"use client";

import { useEffect, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/base/api";

type ExpiredMode = "session" | "target";

export function useSessionExpired(
  sessionInvalidated: boolean | undefined,
  onSessionExpiredConfirm: () => void,
) {
  // SSR 检测到会话失效时，初始化即打开弹窗
  const [open, setOpen] = useState(() => Boolean(sessionInvalidated));
  const [mode, setMode] = useState<ExpiredMode>("session");

  /** 监听 API 401 事件 */
  useEffect(() => {
    function handle() {
      setMode("session");
      setOpen(true);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handle);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handle);
  }, []);

  /** 切换目标用户不存在时调用 */
  function showTargetGone() {
    setMode("target");
    setOpen(true);
  }

  /** 确认按钮回调 */
  function handleConfirm() {
    setOpen(false);
    if (mode === "session") {
      onSessionExpiredConfirm();
    }
  }

  return {
    sessionExpiredOpen: open,
    expiredMode: mode,
    showTargetGone,
    handleSessionExpiredConfirm: handleConfirm,
  };
}
