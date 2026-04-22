/**
 * 配置管理面板组件
 * @description 提供站点名称设置、在线检查、导入导出和恢复默认功能的管理界面
 */

"use client";

import { Download, LoaderCircle, Upload, RotateCcw, Wifi, WifiOff } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogSectionClass, getDialogSubtleClass, getDialogInputClass, getDialogDangerBtnClass } from "@/components/sakura-nav/style-helpers";

export function ConfigAdminPanel({
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
  importError,
  onReset,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,
  themeMode = "dark",
}: {
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
  /** 导入操作的行内错误提示 */
  importError: string;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;
  themeMode?: ThemeMode;
}) {
  const btnClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55",
    themeMode === "light"
      ? "border-slate-200/60 bg-white text-slate-700 hover:bg-slate-50"
      : "border-white/12 bg-white/8 text-white/84 hover:bg-white/14",
  );

  const disabled = busyAction != null || analyzing;

  return (
    <div className="space-y-6">
      {/* 站点名称 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">站点名称</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          设置显示在浏览器标签和导航栏中的网站名称。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            value={siteName}
            onChange={(e) => onSiteNameChange(e.target.value)}
            maxLength={30}
            placeholder="输入站点名称"
            className={cn("flex-1 rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))}
          />
          {siteNameBusy ? (
            <LoaderCircle className={cn("h-5 w-5 shrink-0 animate-spin", getDialogSubtleClass(themeMode))} />
          ) : null}
        </div>
      </section>

      {/* 网站在线检测 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">网站在线检测</h3>
            <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
              定期检测网站是否可正常访问，在卡片左上角显示状态圆点。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={onlineCheckEnabled}
            onClick={() => onOnlineCheckToggle(!onlineCheckEnabled)}
            disabled={disabled}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-55",
              onlineCheckEnabled
                ? themeMode === "light"
                  ? "border-emerald-300/60 bg-emerald-100"
                  : "border-emerald-400/30 bg-emerald-500/30"
                : themeMode === "light"
                  ? "border-slate-200/60 bg-slate-100"
                  : "border-white/12 bg-white/10",
            )}
          >
            <span className={cn(
              "inline-block h-5 w-5 rounded-full transition-transform",
              onlineCheckEnabled
                ? themeMode === "light"
                  ? "translate-x-6 bg-emerald-500"
                  : "translate-x-6 bg-emerald-400"
                : themeMode === "light"
                  ? "translate-x-1 bg-slate-300"
                  : "translate-x-1 bg-white/50",
            )} />
          </button>
        </div>

        {onlineCheckEnabled ? (
          <div className="mt-4 space-y-4">
            <label className="grid gap-1.5 text-sm">
              <span className={cn(themeMode === "light" ? "text-slate-700" : "text-white/78")}>每日检测时间点（时）</span>
              <input
                type="number"
                value={onlineCheckTime}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || raw === "-") return;
                  let v = Number(raw);
                  if (!Number.isFinite(v)) return;
                  if (v < 0) v = 23;
                  else if (v > 23) v = 0;
                  onOnlineCheckTimeChange(v);
                }}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v) || v < 0 || v > 23) onOnlineCheckTimeChange(0);
                }}
                disabled={disabled}
                className={cn("rounded-2xl border px-4 py-3 text-sm outline-none disabled:opacity-55", getDialogInputClass(themeMode))}
              />
            </label>
            <p className={cn("text-xs", getDialogSubtleClass(themeMode))}>
              每天在设定的小时自动检测一次所有网站是否可正常访问。
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onRunOnlineCheck}
                disabled={onlineCheckBusy || disabled}
                className={btnClass}
              >
                {onlineCheckBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                立即检测
              </button>
              {onlineCheckResult ? (
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Wifi className="h-3.5 w-3.5" /> {onlineCheckResult.online} 在线
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <WifiOff className="h-3.5 w-3.5" /> {onlineCheckResult.offline} 离线
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* 导入和导出 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">导入和导出</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          导出当前所有用户数据为备份文件，或从备份文件及其他书签文件导入数据。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={busyAction === "export" || analyzing}
            className={btnClass}
          >
            {busyAction === "export" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            导出文件
          </button>
          <button
            type="button"
            onClick={onImportClick}
            disabled={busyAction != null}
            className={cn(btnClass, analyzing && "cursor-wait")}
          >
            {analyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {analyzing ? "AI 分析中，请稍候..." : "导入文件"}
          </button>
        </div>
        {importError ? (
          <div className={cn(
            "mt-3 rounded-2xl border px-4 py-3 text-sm",
            themeMode === "light"
              ? "border-red-200/60 bg-red-50 text-red-600"
              : "border-rose-300/20 bg-rose-400/10 text-rose-100",
          )}>
            {importError}
          </div>
        ) : null}
      </section>

      {/* 恢复默认 */}
      <section className={cn(
        "rounded-[28px] border p-5",
        themeMode === "light"
          ? "border-red-200/60 bg-red-50/60"
          : "border-rose-500/20 bg-rose-500/6",
      )}>
        <h3 className={cn("text-lg font-semibold", themeMode === "light" ? "text-red-600" : "text-rose-100")}>恢复默认</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          重置用户数据为初始状态（此操作不可撤销）
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={busyAction === "reset" || analyzing}
          className={cn("mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55", getDialogDangerBtnClass(themeMode))}
        >
          {busyAction === "reset" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          恢复默认配置
        </button>
      </section>
    </div>
  );
}
