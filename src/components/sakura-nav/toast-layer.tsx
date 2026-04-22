/**
 * Toast 通知层
 */

import { NotificationToast } from "@/components/dialogs/notification-toast";
import type { ToastState } from "@/components/dialogs/notification-toast";
import type { ThemeMode } from "@/lib/base/types";

type ToastLayerProps = {
  themeMode: ThemeMode;
  toasts: ToastState[];
  dismissToast: (id: number) => void;
  onUndo?: (toastId: number) => void;
};

export function ToastLayer({ themeMode, toasts, dismissToast, onUndo }: ToastLayerProps) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-5 top-24 z-50 flex w-[min(400px,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => (
        <NotificationToast key={toast.id} toast={toast} themeMode={themeMode} onClose={dismissToast} onUndo={onUndo} />
      ))}
    </div>
  );
}
