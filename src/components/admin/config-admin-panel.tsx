/**
 * 数据管理面板组件
 * @description 提供导入导出和恢复默认功能的管理界面
 */

"use client";

import { Download, LoaderCircle, Upload, RotateCcw, Trash2 } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogSectionClass, getDialogSubtleClass, getDialogDangerBtnClass } from "@/components/sakura-nav/style-helpers";

export function ConfigAdminPanel({
  busyAction,
  analyzing,
  onExport,
  onImportClick,
  importError,
  onReset,
  onClear,
  exportCooldown,
  exportCooldownSec,
  themeMode = "dark",
}: {
  busyAction: "import" | "export" | "reset" | "clear" | null;
  analyzing: boolean;
  onExport: () => void;
  onImportClick: () => void;
  importError: string;
  onReset: () => void;
  onClear: () => void;
  exportCooldown?: boolean;
  exportCooldownSec?: number;
  themeMode?: ThemeMode;
}) {
  const btnClass = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55",
    themeMode === "light"
      ? "border-slate-200/60 bg-white text-slate-700 hover:bg-slate-50"
      : "border-white/12 bg-white/8 text-white/84 hover:bg-white/14",
  );

  return (
    <div className="space-y-6">
      {/* 导入和导出 */}
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">导入和导出</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          导出当前数据为备份文件，或从备份文件及其他书签文件导入数据。
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={busyAction === "export" || analyzing || exportCooldown}
            className={cn(btnClass, "flex-1 sm:flex-initial justify-center")}
          >
            {busyAction === "export" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busyAction === "export" ? "导出中..." : (exportCooldown ? `${exportCooldownSec ?? 0}s 后重试` : "导出文件")}
          </button>
          <button
            type="button"
            onClick={onImportClick}
            disabled={busyAction != null}
            className={cn(btnClass, analyzing && "cursor-wait", "flex-1 sm:flex-initial justify-center")}
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

      {/* 清除数据 */}
      <section className={cn(
        "rounded-[28px] border p-5",
        themeMode === "light"
          ? "border-amber-200/60 bg-amber-50/60"
          : "border-amber-500/20 bg-amber-500/6",
      )}>
        <h3 className={cn("text-lg font-semibold", themeMode === "light" ? "text-amber-700" : "text-amber-100")}>清除数据</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          删除所有标签和卡片。外观配置和站点设置不受影响。此操作不可撤销。
        </p>
        <button
          type="button"
          onClick={onClear}
          disabled={busyAction === "clear" || analyzing}
          className={cn("mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55",
            themeMode === "light"
              ? "border-amber-300/60 bg-amber-100 text-amber-700 hover:bg-amber-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
          )}
        >
          {busyAction === "clear" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          清除数据
        </button>
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
          重置您的所有数据为默认状态，包括标签、网站、外观配置和设置。此操作不可撤销。
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
