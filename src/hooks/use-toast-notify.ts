/**
 * Toast 通知 Hook
 * @description 管理 success/error 消息 → Toast 通知的转换逻辑
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastState } from "@/components/dialogs/notification-toast";

export function useToastNotify() {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((current) => current.filter((item) => item.id !== toastId));
  }, []);

  useEffect(() => {
    if (!message) return;

    setToasts((current) => {
      const signature = `success::操作成功::${message}`;
      const existing = current.find((toast) => toast.signature === signature);
      if (existing) {
        return [
          {
            ...existing,
            id: ++toastIdRef.current,
            durationMs: 4200,
            count: existing.count + 1,
          },
          ...current.filter((toast) => toast.signature !== signature),
        ];
      }

      return [
        {
          id: ++toastIdRef.current,
          title: "操作成功",
          description: message,
          tone: "success" as const,
          durationMs: 4200,
          count: 1,
          signature,
        },
        ...current,
      ].slice(0, 6);
    });
    setMessage("");
  }, [message]);

  useEffect(() => {
    if (!errorMessage) return;

    setToasts((current) => {
      const signature = `error::出现问题::${errorMessage}`;
      const existing = current.find((toast) => toast.signature === signature);
      if (existing) {
        return [
          {
            ...existing,
            id: ++toastIdRef.current,
            durationMs: 5200,
            count: existing.count + 1,
          },
          ...current.filter((toast) => toast.signature !== signature),
        ];
      }

      return [
        {
          id: ++toastIdRef.current,
          title: "出现问题",
          description: errorMessage,
          tone: "error" as const,
          durationMs: 5200,
          count: 1,
          signature,
        },
        ...current,
      ].slice(0, 6);
    });
    setErrorMessage("");
  }, [errorMessage]);

  return { message, setMessage, errorMessage, setErrorMessage, toasts, dismissToast };
}
