/**
 * 书签导入分析结果对话框
 * @description 显示 AI 分析出的网站列表，支持编辑和删除，确认后批量导入
 * 编辑操作通过回调通知父组件，由父组件打开独立的 EditorModal 处理
 */

"use client";

import { PencilLine, Trash2, LoaderCircle, Download, ExternalLink, X, AlertTriangle, Search } from "lucide-react";
import { useState, useMemo } from "react";
import type { ThemeMode, BookmarkImportItem } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { extractDomain, getFaviconPreviewUrl } from "@/lib/utils/icon-utils";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogDividerClass,
  getDialogSubtleClass,
  getDialogCloseBtnClass,
  getDialogPrimaryBtnClass,
  getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";

type BookmarkImportDialogProps = {
  items: BookmarkImportItem[];
  busy: boolean;
  themeMode: ThemeMode;
  onImportAll: (items: BookmarkImportItem[]) => void;
  onEditItem: (item: BookmarkImportItem) => void;
  onDeleteItem: (uid: string) => void;
  onClose: () => void;
};

export function BookmarkImportDialog({
  items,
  busy,
  themeMode,
  onImportAll,
  onEditItem,
  onDeleteItem,
  onClose,
}: BookmarkImportDialogProps) {
  const [itemSearch, setItemSearch] = useState("");

  // 搜索过滤
  const filteredItems = useMemo(() => {
    const needle = itemSearch.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.name} ${item.url}`.toLowerCase().includes(needle)
    );
  }, [items, itemSearch]);

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[760px] overflow-hidden rounded-[34px] border")}>
        {/* Header */}
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>AI Analysis</p>
            <h2 className="mt-1 text-2xl font-semibold">导入分析结果</h2>
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

        {/* Content */}
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className={cn("flex flex-col items-center justify-center py-12 text-center", getDialogSubtleClass(themeMode))}>
              <p className="text-sm">AI 未分析出有效的网站数据。</p>
            </div>
          ) : (
            <>
              <p className={cn("mb-4 text-sm", getDialogSubtleClass(themeMode))}>
                共分析出 <span className="font-semibold text-current">{items.length}</span> 个网站，您可以逐个编辑修正后点击「导入全部」。
              </p>

              {/* 搜索框 */}
              <label className="relative mb-4 block">
                <Search className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", themeMode === "light" ? "text-slate-400" : "text-white/35")} />
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="搜索网站名或地址"
                  className={cn("w-full rounded-2xl border px-4 py-2.5 pl-10 text-sm outline-none", themeMode === "light" ? "border-slate-200/50 bg-white/80 text-slate-900 placeholder:text-slate-400" : "border-white/12 bg-white/8 text-white placeholder:text-white/35")}
                />
              </label>

              {/* Item list */}
              <div className="space-y-2">
                {filteredItems.length === 0 ? (
                  <p className={cn("py-8 text-center text-sm", getDialogSubtleClass(themeMode))}>
                    未找到匹配的网站
                  </p>
                ) : null}
                {filteredItems.map((item) => (
                  <div
                    key={item.uid}
                    className={cn("flex items-center gap-3 rounded-2xl border px-4 py-3", getDialogListItemClass(themeMode))}
                  >
                    {/* 网站图标 — 使用 favicon.im，失败时回退文字图标 */}
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
                      themeMode === "light"
                        ? "border-slate-200/50 bg-slate-50"
                        : "border-white/10 bg-white/6",
                    )}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.iconUrl || getFaviconPreviewUrl(extractDomain(item.url))}
                        alt=""
                        className="h-5 w-5 object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.style.display = "none";
                          const fallback = img.nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                      <span
                        className="hidden h-full w-full items-center justify-center text-xs font-semibold"
                        style={{ display: "none" }}
                      >
                        {(item.name || extractDomain(item.url)).charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.name || "未命名"}</span>
                        {item.newTags.length > 0 ? (
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", themeMode === "light" ? "bg-violet-100 text-violet-600" : "bg-violet-500/16 text-violet-200")}>
                            +{item.newTags.length} 标签
                          </span>
                        ) : null}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn("mt-0.5 flex items-center gap-1 truncate text-xs", getDialogSubtleClass(themeMode), "hover:underline")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {item.duplicateHint ? (
                        <div className={cn(
                          "mt-1 flex items-center gap-1 text-[11px] leading-4",
                          themeMode === "light" ? "text-amber-600" : "text-amber-300",
                        )}>
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.duplicateHint}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Tooltip tip="编辑" themeMode={themeMode}>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        disabled={busy}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:opacity-40",
                          themeMode === "light"
                            ? "border-slate-200/50 bg-slate-50 hover:bg-slate-100"
                            : "border-white/10 bg-white/6 hover:bg-white/12",
                        )}
                      >
                        <PencilLine className={cn("h-3.5 w-3.5", themeMode === "light" ? "text-slate-400" : "text-white/50")} />
                      </button>
                      </Tooltip>
                      <Tooltip tip="删除" themeMode={themeMode}>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.uid)}
                        disabled={busy}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:opacity-40",
                          themeMode === "light"
                            ? "border-red-200/50 bg-red-50 text-red-400 hover:bg-red-100"
                            : "border-rose-500/20 bg-rose-500/6 text-rose-400 hover:bg-rose-500/12",
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 ? (
          <div className={cn("flex items-center justify-between border-t px-6 py-4", getDialogDividerClass(themeMode))}>
            <span className={cn("text-sm", getDialogSubtleClass(themeMode))}>
              {items.length} 个网站待导入
            </span>
            <button
              type="button"
              onClick={() => onImportAll(items)}
              disabled={busy || items.length === 0}
              className={cn("inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60", getDialogPrimaryBtnClass(themeMode))}
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {busy ? "正在导入..." : "导入全部"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
