/**
 * 快照历史弹窗
 * @description 展示所有快照列表（时间线样式），支持搜索、排序、恢复、删除和重命名操作
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, History, Pencil, RotateCcw, Search, SortDesc, SortAsc, Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { ThemeMode } from "@/lib/base/types";
import type { SnapshotItem } from "@/hooks/use-snapshots";

type SnapshotHistoryDialogProps = {
  open: boolean;
  themeMode: ThemeMode;
  snapshots: SnapshotItem[];
  loading: boolean;
  busy: boolean;
  onLoadSnapshots: () => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRename: (id: string, label: string) => Promise<void>;
  onClose: () => void;
};

/** 格式化 ISO 时间为可读格式 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  });
}

/** 计算距离现在多久 */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return `${Math.floor(days / 30)} 个月前`;
}

// ── 内部确认弹窗 ──

type ConfirmState = {
  type: "restore" | "delete";
  snapshotId: string;
  snapshotLabel: string;
} | null;

function ConfirmDialog({
  state,
  themeMode,
  busy,
  onConfirm,
  onCancel,
}: {
  state: NonNullable<ConfirmState>;
  themeMode: ThemeMode;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isLight = themeMode === "light";
  const isRestore = state.type === "restore";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onCancel} />
      <div className={cn(
        "relative mx-4 max-w-sm w-full rounded-2xl border p-6 shadow-2xl",
        isLight
          ? "border-slate-200/50 bg-white/96 backdrop-blur-2xl"
          : "border-white/14 bg-[#0f172aee] backdrop-blur-xl",
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isRestore
              ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
          )}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className={cn("text-xl font-semibold", isLight ? "text-slate-900" : "text-white")}>
            {isRestore ? "恢复快照" : "删除快照"}
          </h3>
        </div>

        <p className={cn("text-base leading-relaxed mb-6", isLight ? "text-slate-600" : "text-slate-300")}>
          {isRestore ? (
            <>
              确定要将数据恢复到 <span className="font-medium">{state.snapshotLabel}</span> 的状态吗？
              <br />
              <span className="text-amber-600 dark:text-amber-400">此操作将删除该快照之后的所有快照，且无法撤销。</span>
            </>
          ) : (
            <>
              确定要删除快照 <span className="font-medium">{state.snapshotLabel}</span> 吗？
              <br />
              此操作不可撤销，但不会影响其他快照。
            </>
          )}
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className={cn(
              "rounded-xl px-5 py-2.5 text-base font-medium transition",
              isLight
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-white/10 text-slate-300 hover:bg-white/15",
            )}
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              "rounded-xl px-5 py-2.5 text-base font-medium transition flex items-center gap-2",
              isRestore
                ? "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                : "bg-red-500 text-white hover:bg-red-600 disabled:opacity-50",
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRestore ? "确定恢复" : "确定删除"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 重命名输入框 ──

function RenameInput({
  initial,
  isLight,
  onConfirm,
  onCancel,
}: {
  initial: string;
  isLight: boolean;
  onConfirm: (label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) onConfirm(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  }, [value, onConfirm, onCancel]);

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (value.trim() && value.trim() !== initial) onConfirm(value.trim()); else onCancel(); }}
        maxLength={50}
        className={cn(
          "h-8 w-36 rounded-md border px-2 text-base outline-none transition",
          isLight
            ? "border-slate-300 bg-white text-slate-900 focus:border-blue-400"
            : "border-white/20 bg-white/10 text-white focus:border-blue-400",
        )}
      />
      <button
        type="button"
        onClick={() => { if (value.trim()) onConfirm(value.trim()); }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border transition",
          isLight
            ? "border-slate-200 text-green-600 hover:bg-green-50 hover:border-green-300"
            : "border-white/20 text-green-400 hover:bg-green-900/20 hover:border-green-500/40",
        )}
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border transition",
          isLight
            ? "border-slate-200 text-slate-400 hover:bg-slate-50 hover:border-slate-300"
            : "border-white/20 text-slate-500 hover:bg-white/5 hover:border-white/30",
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── 主弹窗 ──

export function SnapshotHistoryDialog({
  open,
  themeMode,
  snapshots,
  loading,
  busy,
  onLoadSnapshots,
  onRestore,
  onDelete,
  onRename,
  onClose,
}: SnapshotHistoryDialogProps) {
  const isLight = themeMode === "light";
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // 搜索 + 排序后的快照列表
  const filteredSnapshots = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? snapshots.filter((s) => {
          const labelMatch = s.label.toLowerCase().includes(q);
          const timeStr = formatTime(s.createdAt).toLowerCase();
          const timeMatch = timeStr.includes(q) || timeAgo(s.createdAt).includes(q);
          return labelMatch || timeMatch;
        })
      : snapshots;
    return [...filtered].sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDesc ? -cmp : cmp;
    });
  }, [snapshots, searchQuery, sortDesc]);

  // 打开时加载数据
  useEffect(() => {
    if (open) {
      void onLoadSnapshots();
    }
  }, [open, onLoadSnapshots]);

  // 关闭时自动重置状态
  const handleClose = useCallback(() => {
    setConfirmState(null);
    setRenamingId(null);
    setSearchQuery("");
    onClose();
  }, [onClose]);

  const handleRename = useCallback((id: string, label: string) => {
    setRenamingId(null);
    void onRename(id, label);
  }, [onRename]);

  if (!open) return null;

  const lineColor = isLight ? "bg-slate-200" : "bg-white/10";
  const dotColor = isLight ? "bg-slate-300" : "bg-white/20";
  const currentDotColor = isLight ? "bg-emerald-400" : "bg-emerald-500";
  const actionBtnBase = "flex h-9 w-9 items-center justify-center rounded-lg border transition";

  return (
    <>
      <div className="fixed inset-0 z-[55] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : handleClose} />
        <div className={cn(
          "relative mx-4 w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col max-h-[80vh]",
          isLight
            ? "border-slate-200/50 bg-white/96 backdrop-blur-2xl"
            : "border-white/14 bg-[#0f172aee] backdrop-blur-xl",
        )}>
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
               style={{ borderColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <History className={cn("h-6 w-6", isLight ? "text-slate-600" : "text-slate-300")} />
              <h2 className={cn("text-xl font-semibold", isLight ? "text-slate-900" : "text-white")}>
                版本历史
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition",
                isLight ? "hover:bg-slate-100 text-slate-400" : "hover:bg-white/10 text-slate-500",
              )}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 搜索栏 + 排序 */}
          <div className="flex items-center gap-2 px-6 pt-3 shrink-0">
            <div className={cn(
              "flex-1 flex items-center gap-2 rounded-xl border px-3 h-10 transition",
              isLight
                ? "border-slate-200 bg-slate-50/80 focus-within:border-slate-300 focus-within:bg-white"
                : "border-white/12 bg-white/5 focus-within:border-white/20 focus-within:bg-white/8",
            )}>
              <Search className={cn("h-5 w-5 shrink-0", isLight ? "text-slate-400" : "text-slate-500")} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索名称或时间..."
                className={cn(
                  "flex-1 bg-transparent text-base outline-none placeholder:text-slate-400",
                  isLight ? "text-slate-900" : "text-white",
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={cn("shrink-0", isLight ? "text-slate-400 hover:text-slate-600" : "text-slate-500 hover:text-slate-300")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Tooltip tip={sortDesc ? "切换为升序（旧 → 新）" : "切换为降序（新 → 旧）"} themeMode={themeMode}>
              <button
                type="button"
                onClick={() => setSortDesc((v) => !v)}
                className={cn(
                  actionBtnBase, "h-10 w-10 shrink-0",
                  isLight
                    ? "border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    : "border-white/15 text-slate-500 hover:text-slate-300 hover:bg-white/10 hover:border-white/30",
                )}
              >
                {sortDesc ? <SortDesc className="h-5 w-5" /> : <SortAsc className="h-5 w-5" />}
              </button>
            </Tooltip>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className={cn("h-8 w-8 animate-spin", isLight ? "text-slate-400" : "text-slate-500")} />
              </div>
            ) : (
              <div className="relative ml-3">
                {/* 时间线主线 */}
                <div className={cn("absolute left-0 top-2 bottom-2 w-px", lineColor)} style={{ transform: "translateX(-50%)", left: "8px" }} />

                {/* 当前版本 - 降序时在顶部 */}
                {sortDesc && (
                  <div className="relative flex items-start gap-3 pb-4">
                    <div className={cn("relative z-[1] mt-1.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-2",
                      isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10",
                    )}>
                      <div className={cn("h-2 w-2 rounded-full", currentDotColor)} />
                    </div>
                    <div className={cn(
                      "flex-1 rounded-xl px-4 py-3.5 border",
                      isLight
                        ? "border-emerald-200/60 bg-emerald-50/50"
                        : "border-emerald-500/20 bg-emerald-500/5",
                    )}>
                      <div className={cn("text-base font-medium", isLight ? "text-emerald-700" : "text-emerald-400")}>
                        当前版本
                      </div>
                      <div className={cn("text-sm mt-0.5", isLight ? "text-emerald-600/70" : "text-emerald-400/60")}>
                        当前正在使用的版本
                      </div>
                    </div>
                  </div>
                )}

                {filteredSnapshots.length === 0 ? (
                  <div className="relative flex items-start gap-3 pt-1">
                    <div className={cn("relative z-[1] mt-1.5 h-[16px] w-[16px] shrink-0 rounded-full border-2", dotColor,
                      isLight ? "border-slate-200" : "border-white/10",
                    )} />
                    <div className={cn("py-3 text-base", isLight ? "text-slate-400" : "text-slate-500")}>
                      {searchQuery ? "未找到匹配的快照。" : "暂无历史快照。退出编辑模式后将自动保存。"}
                    </div>
                  </div>
                ) : (
                  filteredSnapshots.map((snap, idx) => (
                    <div key={snap.id} className={cn("relative flex items-start gap-3", idx < filteredSnapshots.length - 1 ? "pb-4" : "")}>
                      <div className={cn("relative z-[1] mt-1.5 h-[16px] w-[16px] shrink-0 rounded-full border-2", dotColor,
                        isLight ? "border-slate-200" : "border-white/10",
                      )} />

                      <div className={cn(
                        "flex-1 rounded-xl px-4 py-3.5 border transition",
                        isLight
                          ? "border-slate-200/60 bg-slate-50/50 hover:bg-slate-100/80"
                          : "border-white/8 bg-white/3 hover:bg-white/6",
                      )}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            {renamingId === snap.id ? (
                              <RenameInput
                                initial={snap.label}
                                isLight={isLight}
                                onConfirm={(label) => handleRename(snap.id, label)}
                                onCancel={() => setRenamingId(null)}
                              />
                            ) : (
                              <div className={cn("text-base font-medium truncate", isLight ? "text-slate-900" : "text-white")}>
                                {snap.label}
                              </div>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          {renamingId !== snap.id && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Tooltip tip="重命名" themeMode={themeMode} disabled={busy}>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setRenamingId(snap.id)}
                                  className={cn(
                                    actionBtnBase,
                                    isLight
                                      ? "border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                                      : "border-white/15 text-slate-500 hover:text-blue-400 hover:bg-blue-900/20 hover:border-blue-500/30",
                                    busy && "opacity-40 cursor-not-allowed",
                                  )}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              <Tooltip tip="恢复此快照" themeMode={themeMode} disabled={busy}>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setConfirmState({ type: "restore", snapshotId: snap.id, snapshotLabel: snap.label })}
                                  className={cn(
                                    actionBtnBase,
                                    isLight
                                      ? "border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
                                      : "border-white/15 text-slate-500 hover:text-amber-400 hover:bg-amber-900/20 hover:border-amber-500/30",
                                    busy && "opacity-40 cursor-not-allowed",
                                  )}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              </Tooltip>
                              <Tooltip tip="删除此快照" themeMode={themeMode} disabled={busy}>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setConfirmState({ type: "delete", snapshotId: snap.id, snapshotLabel: snap.label })}
                                  className={cn(
                                    actionBtnBase,
                                    isLight
                                      ? "border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                                      : "border-white/15 text-slate-500 hover:text-red-400 hover:bg-red-900/20 hover:border-red-500/30",
                                    busy && "opacity-40 cursor-not-allowed",
                                  )}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                        <div className={cn("text-sm mt-1", isLight ? "text-slate-400" : "text-slate-500")}>
                          {timeAgo(snap.createdAt)} · {formatTime(snap.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* 当前版本 - 升序时在底部 */}
                {!sortDesc && (
                  <div className="relative flex items-start gap-3 pt-4">
                    <div className={cn("relative z-[1] mt-1.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-2",
                      isLight ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10",
                    )}>
                      <div className={cn("h-2 w-2 rounded-full", currentDotColor)} />
                    </div>
                    <div className={cn(
                      "flex-1 rounded-xl px-4 py-3.5 border",
                      isLight
                        ? "border-emerald-200/60 bg-emerald-50/50"
                        : "border-emerald-500/20 bg-emerald-500/5",
                    )}>
                      <div className={cn("text-base font-medium", isLight ? "text-emerald-700" : "text-emerald-400")}>
                        当前版本
                      </div>
                      <div className={cn("text-sm mt-0.5", isLight ? "text-emerald-600/70" : "text-emerald-400/60")}>
                        当前正在使用的版本
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 底部说明 */}
          <div className={cn(
            "px-6 py-3 text-sm border-t shrink-0",
            isLight ? "text-slate-400 border-slate-100" : "text-slate-500 border-white/8",
          )}>
            快照在退出编辑模式时自动保存，保留 30 天
          </div>
        </div>
      </div>

      {/* 确认弹窗 */}
      {confirmState && (
        <ConfirmDialog
          state={confirmState}
          themeMode={themeMode}
          busy={busy}
          onConfirm={() => {
            if (confirmState.type === "restore") {
              void onRestore(confirmState.snapshotId);
            } else {
              void onDelete(confirmState.snapshotId);
            }
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
