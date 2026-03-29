/**
 * 管理子区块组件
 * @description 可折叠的管理面板区块，用于组织管理界面的各个功能区域
 */

"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminSubsection({
  title,
  description,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/8"
      >
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-white/65">{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 transition",
            open ? "rotate-180" : "",
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      {open ? <div className="border-t border-white/10 px-5 py-5">{children}</div> : null}
    </section>
  );
}
