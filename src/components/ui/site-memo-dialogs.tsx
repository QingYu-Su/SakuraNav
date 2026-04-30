/**
 * 网站备忘便签查看弹窗
 * @description 从右键菜单查看备注和待办，包含：
 *   - NotesViewerDialog: 只读查看备注
 *   - TodoViewerDialog: 可搜索/筛选/勾选的待办查看器
 */

"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Filter, Check, StickyNote, ListChecks, X } from "lucide-react";
import type { ThemeMode, TodoItem } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import {
  getDialogInputClass,
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogCloseBtnClass,
  getDialogSubtleClass,
} from "@/components/sakura-nav/style-helpers";

// ──────────────────────────────────────
// 类型
// ──────────────────────────────────────

type TodoFilter = "all" | "completed" | "uncompleted";

const TODO_FILTER_OPTIONS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "uncompleted", label: "未完成" },
  { value: "completed", label: "已完成" },
];

// ──────────────────────────────────────
// 备注查看弹窗
// ──────────────────────────────────────

export function NotesViewerDialog({
  notes,
  themeMode,
  onClose,
}: {
  notes: string;
  themeMode: ThemeMode;
  onClose: () => void;
}) {
  const isDark = themeMode === "dark";

  return createPortal(
    <div className={cn("animate-drawer-fade fixed inset-0 z-[200] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center", getDialogOverlayClass(themeMode))}>
      <div className={cn("animate-panel-rise w-full max-w-[420px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]", getDialogPanelClass(themeMode))}>
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <StickyNote className="h-4.5 w-4.5" />
            查看备注
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", getDialogCloseBtnClass(themeMode))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {notes.trim() ? (
            <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", isDark ? "text-white/85" : "text-slate-700")}>
              {notes}
            </p>
          ) : (
            <p className={cn("py-6 text-center text-sm", getDialogSubtleClass(themeMode))}>
              暂无备注
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ──────────────────────────────────────
// 待办查看弹窗
// ──────────────────────────────────────

export function TodoViewerDialog({
  siteId,
  todos: initialTodos,
  themeMode,
  onClose,
  onToggle,
}: {
  siteId: string;
  todos: TodoItem[];
  themeMode: ThemeMode;
  onClose: () => void;
  /** 勾选/取消勾选后的回调（用于通知父组件刷新数据） */
  onToggle?: () => void;
}) {
  const isDark = themeMode === "dark";
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<TodoFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭筛选下拉
  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filterOpen]);

  // 筛选后的 todo 列表
  const filteredTodos = useMemo(() => {
    let list = todos;
    if (filterMode === "completed") list = list.filter((t) => t.completed);
    else if (filterMode === "uncompleted") list = list.filter((t) => !t.completed);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) => t.text.toLowerCase().includes(q));
    }
    return list;
  }, [todos, filterMode, searchQuery]);

  const currentFilterLabel = TODO_FILTER_OPTIONS.find((o) => o.value === filterMode)?.label ?? "全部";

  /** 勾选/取消勾选待办，同步到后端 */
  const toggleTodo = useCallback(async (id: string) => {
    setTogglingId(id);
    try {
      const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      await requestJson("/api/sites/memo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: siteId, todos: updated }),
      });
      setTodos(updated);
      onToggle?.();
    } finally {
      setTogglingId(null);
    }
  }, [todos, siteId, onToggle]);

  return createPortal(
    <div className={cn("animate-drawer-fade fixed inset-0 z-[200] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center", getDialogOverlayClass(themeMode))}>
      <div className={cn("animate-panel-rise w-full max-w-[460px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]", getDialogPanelClass(themeMode))}>
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ListChecks className="h-4.5 w-4.5" />
            查看待办
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", getDialogCloseBtnClass(themeMode))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {/* 搜索 + 筛选 */}
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className={cn("pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2", isDark ? "text-white/35" : "text-slate-400")} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索待办..."
                className={cn("w-full rounded-lg border pl-8 pr-3 py-1.5 text-sm outline-none", getDialogInputClass(themeMode))}
              />
            </div>
            <div ref={filterRef} className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition",
                  isDark
                    ? "border-white/12 bg-white/6 text-white/70 hover:bg-white/12"
                    : "border-slate-200/50 bg-slate-50 text-slate-600 hover:bg-slate-100",
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                {currentFilterLabel}
              </button>
              {filterOpen && (
                <div className={cn(
                  "absolute right-0 top-full z-10 mt-1 min-w-[100px] overflow-hidden rounded-xl border shadow-lg",
                  isDark ? "border-white/12 bg-[#1e1e2e]" : "border-slate-200 bg-white",
                )}>
                  {TODO_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setFilterMode(opt.value); setFilterOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-sm transition",
                        opt.value === filterMode
                          ? isDark ? "bg-white/12 text-white" : "bg-slate-100 text-slate-900"
                          : isDark ? "text-white/70 hover:bg-white/6" : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {opt.value === filterMode && <Check className="h-3.5 w-3.5" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Todo 列表（可滚动） */}
          {filteredTodos.length > 0 ? (
            <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
              {filteredTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2",
                    isDark
                      ? todo.completed
                        ? "border-white/6 bg-white/3"
                        : "border-white/10 bg-white/6"
                      : todo.completed
                        ? "border-slate-100 bg-slate-50/50"
                        : "border-slate-200/50 bg-white/80",
                  )}
                >
                  {/* 勾选框 */}
                  <button
                    type="button"
                    onClick={() => void toggleTodo(todo.id)}
                    disabled={togglingId !== null}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                      todo.completed
                        ? isDark
                          ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-400"
                          : "border-emerald-400 bg-emerald-100 text-emerald-600"
                        : isDark
                          ? "border-white/20 bg-transparent hover:border-white/40"
                          : "border-slate-300 bg-transparent hover:border-slate-400",
                      togglingId === todo.id && "opacity-50",
                    )}
                  >
                    {todo.completed && <Check className="h-3 w-3" strokeWidth={3} />}
                  </button>

                  {/* 文本 */}
                  <span className={cn(
                    "min-w-0 flex-1 text-sm",
                    todo.completed && "line-through",
                    todo.completed
                      ? isDark ? "text-white/35" : "text-slate-400"
                      : isDark ? "text-white/90" : "text-slate-700",
                  )}>
                    {todo.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={cn("py-4 text-center text-sm", getDialogSubtleClass(themeMode))}>
              {todos.length === 0 ? "暂无待办事项" : "没有匹配的待办事项"}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
