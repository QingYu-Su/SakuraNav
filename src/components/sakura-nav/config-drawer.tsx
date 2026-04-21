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
  siteName: string;
  siteNameBusy: boolean;
  busyAction: "import" | "export" | "reset" | null;
  analyzing: boolean;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onSiteNameChange: (name: string) => void;
  onExport: () => void;
  onImportClick: () => void;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;
  onClose: () => void;
  themeMode: ThemeMode;
};

export function ConfigDrawer({
  open,
  isAuthenticated,
  siteName,
  siteNameBusy,
  busyAction,
  analyzing,
  onlineCheckEnabled,
  onlineCheckTime,
  onlineCheckBusy,
  onlineCheckResult,
  onSiteNameChange,
  onExport,
  onImportClick,
  onReset,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,
  onClose,
  themeMode,
}: ConfigDrawerProps) {
  if (!open || !isAuthenticated) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex justify-end")}>
      <div className={cn(getDrawerPanelClass(themeMode), "animate-drawer-slide flex h-full w-full max-w-[640px] flex-col border-l")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Other</p>
            <h2 className="mt-1 text-2xl font-semibold">其他</h2>
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
            siteName={siteName}
            siteNameBusy={siteNameBusy}
            busyAction={busyAction}
            analyzing={analyzing}
            onlineCheckEnabled={onlineCheckEnabled}
            onlineCheckTime={onlineCheckTime}
            onlineCheckBusy={onlineCheckBusy}
            onlineCheckResult={onlineCheckResult}
            onSiteNameChange={onSiteNameChange}
            onExport={onExport}
            onImportClick={onImportClick}
            onReset={onReset}
            onOnlineCheckToggle={onOnlineCheckToggle}
            onOnlineCheckTimeChange={onOnlineCheckTimeChange}
            onRunOnlineCheck={onRunOnlineCheck}
            themeMode={themeMode}
          />
        </div>
      </div>
    </div>
  );
}
