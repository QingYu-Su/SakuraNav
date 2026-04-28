/**
 * 配置抽屉
 */

import { X } from "lucide-react";
import { ConfigAdminPanel } from "@/components/admin";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import { getDialogOverlayClass, getDrawerPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "./style-helpers";

type ConfigDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  busyAction: "import" | "export" | "reset" | "clear" | null;
  analyzing: boolean;
  onExport: () => void;
  onImportClick: () => void;
  importError: string;
  onReset: () => void;
  onClear: () => void;
  onClose: () => void;
  themeMode: ThemeMode;
  exportCooldown?: boolean;
  exportCooldownSec?: number;
};

export function ConfigDrawer({
  open,
  isAuthenticated,
  busyAction,
  analyzing,
  onExport,
  onImportClick,
  importError,
  onReset,
  onClear,
  onClose,
  themeMode,
  exportCooldown,
  exportCooldownSec,
}: ConfigDrawerProps) {
  if (!open || !isAuthenticated) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex justify-end")}>
      <div className={cn(getDrawerPanelClass(themeMode), "animate-drawer-slide flex h-full w-full max-w-[640px] flex-col border-l")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Data</p>
            <h2 className="mt-1 text-2xl font-semibold">数据</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ConfigAdminPanel
            busyAction={busyAction}
            analyzing={analyzing}
            onExport={onExport}
            onImportClick={onImportClick}
            importError={importError}
            onReset={onReset}
            onClear={onClear}
            themeMode={themeMode}
            exportCooldown={exportCooldown}
            exportCooldownSec={exportCooldownSec}
          />
        </div>
      </div>
    </div>
  );
}
