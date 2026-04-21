/**
 * 导入模式选择对话框
 * @description 选择 SakuraNav 配置文件的导入方式
 */

"use client";

import { LoaderCircle, Trash2, Merge, Replace, X } from "lucide-react";
import type { ThemeMode, ImportMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogSectionClass,
  getDialogSecondaryBtnClass,
} from "@/components/sakura-nav/style-helpers";

type ImportModeOption = {
  mode: ImportMode;
  icon: React.ReactNode;
  title: string;
  description: string;
  danger?: boolean;
};

const options: ImportModeOption[] = [
  {
    mode: "clean",
    icon: <Trash2 className="h-5 w-5" />,
    title: "清除后导入",
    description: "清除当前所有用户数据，以导入的配置文件为主。此操作不可撤销。",
    danger: true,
  },
  {
    mode: "incremental",
    icon: <Merge className="h-5 w-5" />,
    title: "增量导入",
    description: "不清除原有数据，只导入原来没有的网站和标签，不覆盖已有配置。",
  },
  {
    mode: "overwrite",
    icon: <Replace className="h-5 w-5" />,
    title: "覆盖导入",
    description: "不清除原有数据，导入新配置的同时，对已存在的配置以导入文件为主进行覆盖。",
  },
];

export function ImportModeDialog({
  filename,
  busy,
  themeMode,
  onSelect,
  onClose,
}: {
  filename: string;
  busy: boolean;
  themeMode: ThemeMode;
  onSelect: (mode: ImportMode) => void;
  onClose: () => void;
}) {
  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[520px] overflow-hidden rounded-[30px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Import Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">选择导入方式</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-55")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-6">
          <p className={cn("text-sm", getDialogSubtleClass(themeMode))}>
            {filename
              ? `已检测到 SakuraNav 配置文件「${filename}」，请选择导入方式：`
              : "请选择导入方式后再选择文件："}
          </p>

          {options.map((opt) => (
            <button
              key={opt.mode}
              type="button"
              disabled={busy}
              onClick={() => onSelect(opt.mode)}
              className={cn(
                "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
                opt.danger
                  ? themeMode === "light"
                    ? "border-red-200/60 bg-red-50/60 hover:bg-red-100/60"
                    : "border-rose-500/20 bg-rose-500/6 hover:bg-rose-500/10"
                  : getDialogSectionClass(themeMode),
                !opt.danger && (themeMode === "light" ? "hover:bg-slate-100/80" : "hover:bg-white/8"),
              )}
            >
              <span className={cn(
                "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                opt.danger
                  ? themeMode === "light"
                    ? "border-red-200/50 bg-red-100 text-red-500"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-400"
                  : themeMode === "light"
                    ? "border-slate-200/50 bg-slate-100 text-slate-600"
                    : "border-white/10 bg-white/6 text-white/70",
              )}>
                {opt.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", opt.danger && (themeMode === "light" ? "text-red-600" : "text-rose-200"))}>
                  {opt.title}
                </p>
                <p className={cn("mt-1 text-xs leading-5", getDialogSubtleClass(themeMode))}>
                  {opt.description}
                </p>
              </div>
            </button>
          ))}

          {busy ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <LoaderCircle className={cn("h-4 w-4 animate-spin", getDialogSubtleClass(themeMode))} />
              <span className={cn("text-sm", getDialogSubtleClass(themeMode))}>正在导入，请稍候...</span>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className={cn(getDialogSecondaryBtnClass(themeMode), "inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-55")}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
