/**
 * Toast 通知 Hook
 * @description 管理 success/error 消息 → Toast 通知的转换逻辑，支持撤销动作
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToastState } from "@/components/dialogs/notification-toast";
import type { UndoAction } from "@/hooks/use-undo-stack";

export function useToastNotify() {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);

  /** 最近一次成功操作的撤销动作 */
  const [pendingUndo, setPendingUndo] = useState<UndoAction | null>(null);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((current) => current.filter((item) => item.id !== toastId));
  }, []);

  /** 按签名关闭通知（Ctrl+Z 撤销时使用） */
  const dismissBySignature = useCallback((signature: string) => {
    setToasts((current) => current.filter((item) => item.signature !== signature));
  }, []);

  /** 关闭所有带撤销按钮的通知（退出编辑模式时使用） */
  const dismissUndoToasts = useCallback(() => {
    setToasts((current) => current.filter((item) => !item.undoLabel));
  }, []);

  /** 设置成功消息，可附带撤销动作 */
  const notifySuccess = useCallback((msg: string, undo?: UndoAction) => {
    setPendingUndo(undo ?? null);
    setMessage(msg);
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
            durationMs: pendingUndo ? 6000 : 4200,
            count: existing.count + 1,
            undoLabel: pendingUndo?.label,
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
          durationMs: pendingUndo ? 6000 : 4200,
          count: 1,
          signature,
          undoLabel: pendingUndo?.label,
        },
        ...current,
      ].slice(0, 6);
    });
    setMessage("");
    setPendingUndo(null);
  }, [message, pendingUndo]);

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

  return { message, setMessage, errorMessage, setErrorMessage, notifySuccess, toasts, dismissToast, dismissBySignature, dismissUndoToasts };
}
