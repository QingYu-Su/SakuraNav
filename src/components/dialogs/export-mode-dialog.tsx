/**
 * 导出模式选择弹窗
 * @description 选择导出范围：全部卡片或仅网站卡片
 */

"use client";

import { Layers, Globe, X, LoaderCircle } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
} from "@/components/sakura-nav/style-helpers";

export type ExportScope = "full" | "sites-only";

export function ExportModeDialog({
  busy,
  themeMode,
  onSelect,
  onClose,
}: {
  busy: boolean;
  themeMode: ThemeMode;
  onSelect: (scope: ExportScope) => void;
  onClose: () => void;
}) {
  const isDark = themeMode === "dark";

  const options: Array<{
    scope: ExportScope;
    icon: typeof Layers;
    title: string;
    desc: string;
    accent: string;
    accentDark: string;
  }> = [
    {
      scope: "full",
      icon: Layers,
      title: "全部导出",
      desc: "导出所有卡片和标签（网站卡片、社交卡片、笔记卡片）",
      accent: "bg-blue-600 text-white hover:bg-blue-700",
      accentDark: "bg-blue-500/80 text-white hover:bg-blue-400/90",
    },
    {
      scope: "sites-only",
      icon: Globe,
      title: "仅网站卡片",
      desc: "只导出网站卡片及其关联的标签，不包含社交卡片和笔记卡片",
      accent: "bg-violet-600 text-white hover:bg-violet-700",
      accentDark: "bg-violet-500/80 text-white hover:bg-violet-400/90",
    },
  ];

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[480px] overflow-hidden rounded-[30px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Export</p>
            <h2 className="mt-1 text-2xl font-semibold">选择导出范围</h2>
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

        <div className="space-y-4 px-6 py-6">
          {options.map((opt) => (
            <button
              key={opt.scope}
              type="button"
              onClick={() => onSelect(opt.scope)}
              disabled={busy}
              className={cn(
                "flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55",
                isDark
                  ? "border-white/10 bg-white/5 hover:bg-white/10"
                  : "border-black/8 bg-black/2 hover:bg-black/5",
              )}
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isDark ? opt.accentDark : opt.accent,
              )}>
                <opt.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{opt.title}</p>
                <p className={cn("mt-1 text-sm leading-relaxed", getDialogSubtleClass(themeMode))}>
                  {opt.desc}
                </p>
              </div>
            </button>
          ))}

          {busy ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <LoaderCircle className={cn("h-4 w-4 animate-spin", getDialogSubtleClass(themeMode))} />
              <span className={cn("text-sm", getDialogSubtleClass(themeMode))}>正在导出，请稍候...</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
