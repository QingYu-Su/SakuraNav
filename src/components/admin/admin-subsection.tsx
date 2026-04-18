/**
 * 管理子区块组件
 * @description 可折叠的管理面板区块，用于组织管理界面的各个功能区域
 */

"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import { getDialogSectionClass, getDialogSubtleClass } from "@/components/sakura-nav/style-helpers";

export function AdminSubsection({
  title,
  description,
  open,
  onToggle,
  children,
  themeMode = "dark",
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  themeMode?: ThemeMode;
}) {
  return (
    <section className={cn("overflow-hidden rounded-[28px] border", getDialogSectionClass(themeMode))}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition",
          themeMode === "light" ? "hover:bg-slate-100/60" : "hover:bg-white/8",
        )}
      >
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition",
            getDialogSectionClass(themeMode),
            open ? "rotate-180" : "",
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open ? <div className={cn("border-t px-5 py-5", themeMode === "light" ? "border-slate-200/50" : "border-white/10")}>{children}</div> : null}
    </section>
  );
}
