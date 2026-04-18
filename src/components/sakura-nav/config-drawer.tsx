/**
 * 配置抽屉
 */

import { X } from "lucide-react";
import { ConfigAdminPanel } from "@/components/admin";

type ConfigDrawerProps = {
  open: boolean;
  isAuthenticated: boolean;
  siteName: string;
  siteNameBusy: boolean;
  selectedFile: File | null;
  busyAction: "import" | "export" | "reset" | null;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onSiteNameChange: (name: string) => void;
  onFileChange: (file: File | null) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;
  onClose: () => void;
};

export function ConfigDrawer({
  open,
  isAuthenticated,
  siteName,
  siteNameBusy,
  selectedFile,
  busyAction,
  onlineCheckEnabled,
  onlineCheckTime,
  onlineCheckBusy,
  onlineCheckResult,
  onSiteNameChange,
  onFileChange,
  onExport,
  onImport,
  onReset,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,
  onClose,
}: ConfigDrawerProps) {
  if (!open || !isAuthenticated) return null;

  return (
    <div className="animate-drawer-fade fixed inset-0 z-40 flex justify-end bg-slate-950/42 backdrop-blur-sm">
      <div className="animate-drawer-slide flex h-full w-full max-w-[640px] flex-col border-l border-white/12 bg-[#0f172af2] text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Other</p>
            <h2 className="mt-1 text-2xl font-semibold">其他</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 hover:bg-white/12"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <ConfigAdminPanel
            siteName={siteName}
            siteNameBusy={siteNameBusy}
            selectedFile={selectedFile}
            busyAction={busyAction}
            onlineCheckEnabled={onlineCheckEnabled}
            onlineCheckTime={onlineCheckTime}
            onlineCheckBusy={onlineCheckBusy}
            onlineCheckResult={onlineCheckResult}
            onSiteNameChange={onSiteNameChange}
            onFileChange={onFileChange}
            onExport={onExport}
            onImport={onImport}
            onReset={onReset}
            onOnlineCheckToggle={onOnlineCheckToggle}
            onOnlineCheckTimeChange={onOnlineCheckTimeChange}
            onRunOnlineCheck={onRunOnlineCheck}
          />
        </div>
      </div>
    </div>
  );
}
