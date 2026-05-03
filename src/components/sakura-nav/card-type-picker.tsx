/**
 * 卡片类型选择器
 * @description 新建卡片时的统一入口，选择创建"网站卡片"或"社交卡片"
 */

"use client";

import { X, Globe, Users, StickyNote } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "./style-helpers";
import { Tooltip } from "@/components/ui/tooltip";

/** 统一的卡片大类 */
export type CardSuperType = "site" | "social" | "note";

type CardTypePickerProps = {
  open: boolean;
  themeMode: ThemeMode;
  onSelect: (type: CardSuperType) => void;
  onClose: () => void;
};

/** 卡片大类定义 */
const CARD_SUPER_TYPES: Array<{
  type: CardSuperType;
  label: string;
  description: string;
  icon: typeof Globe;
}> = [
  {
    type: "site",
    label: "网站卡片",
    description: "添加一个网站书签",
    icon: Globe,
  },
  {
    type: "social",
    label: "社交卡片",
    description: "添加 QQ、微信等社交方式",
    icon: Users,
  },
  {
    type: "note",
    label: "笔记卡片",
    description: "添加一条 Markdown 笔记",
    icon: StickyNote,
  },
];

export function CardTypePicker({ open, themeMode, onSelect, onClose }: CardTypePickerProps) {
  if (!open) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[34px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">新建卡片</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          <p className={cn("mb-5 text-sm", themeMode === "light" ? "text-slate-500" : "text-white/60")}>
            选择要创建的卡片类型：
          </p>
          <div className="grid grid-cols-3 gap-3">
            {CARD_SUPER_TYPES.map(({ type, label, description, icon: Icon }) => (
              <Tooltip key={type} tip={description} themeMode={themeMode}>
                <button
                  type="button"
                  onClick={() => onSelect(type)}
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-[22px] border p-5 transition hover:-translate-y-0.5 hover:shadow-md",
                    themeMode === "light"
                      ? "border-slate-200 bg-white hover:bg-slate-50"
                      : "border-white/12 bg-white/6 hover:bg-white/10",
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    type === "site"
                      ? themeMode === "light" ? "bg-blue-50 text-blue-500" : "bg-blue-500/15 text-blue-400"
                      : type === "social"
                        ? themeMode === "light" ? "bg-amber-50 text-amber-500" : "bg-amber-500/15 text-amber-400"
                        : themeMode === "light" ? "bg-indigo-50 text-indigo-500" : "bg-indigo-500/15 text-indigo-400",
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold">{label}</p>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
