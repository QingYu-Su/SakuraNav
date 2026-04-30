/**
 * 备忘便签子 Tab 组件
 * @description 网站编辑器中的「备忘便签」Tab，包含：
 *   - 备注输入框
 *   - 待办列表（搜索 + 筛选 + 增删改查）
 */

"use client";

import { type Dispatch, type SetStateAction, useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Plus,
  PencilLine,
  Trash2,
  X,
  Check,
  StickyNote,
  Bot,
} from "lucide-react";
import type { ThemeMode, TodoItem } from "@/lib/base/types";
import type { SiteFormState } from "./types";
import { cn } from "@/lib/utils/utils";
import {
  getDialogInputClass,
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogSecondaryBtnClass,
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogCloseBtnClass,
  getDialogPrimaryBtnClass,
} from "@/components/sakura-nav/style-helpers";
import { Tooltip } from "@/components/ui/tooltip";

// ──────────────────────────────────────
// 类型
// ──────────────────────────────────────

type TodoFilter = "all" | "completed" | "uncompleted";

const TODO_FILTER_OPTIONS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "uncompleted", label: "未完成" },
  { value: "completed", label: "已完成" },
];

type Props = {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  themeMode: ThemeMode;
};

// ──────────────────────────────────────
// 主组件
// ──────────────────────────────────────

export function NotesTab({ siteForm, setSiteForm, themeMode }: Props) {
  const isDark = themeMode === "dark";

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<TodoFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [modalText, setModalText] = useState("");

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
    let list = siteForm.todos;
    if (filterMode === "completed") list = list.filter((t) => t.completed);
    else if (filterMode === "uncompleted") list = list.filter((t) => !t.completed);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) => t.text.toLowerCase().includes(q));
    }
    return list;
  }, [siteForm.todos, filterMode, searchQuery]);

  const currentFilterLabel = TODO_FILTER_OPTIONS.find((o) => o.value === filterMode)?.label ?? "全部";

  // ── 操作 ──

  const toggleTodo = useCallback((id: string) => {
    setSiteForm((cur) => ({
      ...cur,
      todos: cur.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  }, [setSiteForm]);

  const deleteTodo = useCallback((id: string) => {
    setSiteForm((cur) => ({
      ...cur,
      todos: cur.todos.filter((t) => t.id !== id),
    }));
  }, [setSiteForm]);

  function openAddModal() {
    setEditingTodo(null);
    setModalText("");
    setEditModalOpen(true);
  }

  function openEditModal(todo: TodoItem) {
    setEditingTodo(todo);
    setModalText(todo.text);
    setEditModalOpen(true);
  }

  function saveTodo() {
    const trimmed = modalText.trim();
    if (!trimmed) return;
    if (editingTodo) {
      setSiteForm((cur) => ({
        ...cur,
        todos: cur.todos.map((t) => (t.id === editingTodo.id ? { ...t, text: trimmed } : t)),
      }));
    } else {
      const newItem: TodoItem = {
        id: `todo-${crypto.randomUUID()}`,
        text: trimmed,
        completed: false,
      };
      setSiteForm((cur) => ({
        ...cur,
        todos: [...cur.todos, newItem],
      }));
    }
    setEditModalOpen(false);
    setEditingTodo(null);
    setModalText("");
  }

  const handleNotesChange = useCallback((value: string) => {
    setSiteForm((cur) => ({ ...cur, notes: value }));
  }, [setSiteForm]);

  const toggleNotesAiEnabled = useCallback(() => {
    setSiteForm((cur) => ({ ...cur, notesAiEnabled: !cur.notesAiEnabled }));
  }, [setSiteForm]);

  const toggleTodosAiEnabled = useCallback(() => {
    setSiteForm((cur) => ({ ...cur, todosAiEnabled: !cur.todosAiEnabled }));
  }, [setSiteForm]);

  // 开关轨道 + 滑块样式
  const switchTrack = (on: boolean) =>
    cn(
      "relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full transition-colors",
      on
        ? isDark ? "bg-blue-500/60" : "bg-blue-500"
        : isDark ? "bg-white/15" : "bg-slate-300",
    );
  const switchThumb = (on: boolean) =>
    cn(
      "pointer-events-none inline-block h-4 w-4 rounded-full shadow-sm transition-transform",
      on ? "translate-x-[18px] bg-white" : "translate-x-[3px] bg-white/90",
    );

  return (
    <div className="flex flex-col gap-4 pb-5">
      {/* ── 备注 ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>
            <StickyNote className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px" />
            备注
          </label>
          <Tooltip tip={siteForm.notesAiEnabled ? "AI 可读取备注内容" : "AI 不可读取备注内容"} themeMode={themeMode}>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[11px] font-medium select-none", siteForm.notesAiEnabled ? (isDark ? "text-blue-400" : "text-blue-600") : (isDark ? "text-white/35" : "text-slate-400"))}>
                <Bot className="mr-0.5 inline h-3 w-3 -translate-y-px" />
                AI
              </span>
              <button type="button" role="switch" aria-checked={siteForm.notesAiEnabled} onClick={toggleNotesAiEnabled} className={switchTrack(siteForm.notesAiEnabled)}>
                <span className={switchThumb(siteForm.notesAiEnabled)} />
              </button>
            </div>
          </Tooltip>
        </div>
        <textarea
          value={siteForm.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="写点什么备注..."
          rows={4}
          className={cn("w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
        />
      </div>

      {/* ── 待办列表 ── */}
      <div className={cn("rounded-2xl border p-4", getDialogSectionClass(themeMode))}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">待办事项</p>
          <Tooltip tip={siteForm.todosAiEnabled ? "AI 可读取待办内容" : "AI 不可读取待办内容"} themeMode={themeMode}>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[11px] font-medium select-none", siteForm.todosAiEnabled ? (isDark ? "text-blue-400" : "text-blue-600") : (isDark ? "text-white/35" : "text-slate-400"))}>
                <Bot className="mr-0.5 inline h-3 w-3 -translate-y-px" />
                AI
              </span>
              <button type="button" role="switch" aria-checked={siteForm.todosAiEnabled} onClick={toggleTodosAiEnabled} className={switchTrack(siteForm.todosAiEnabled)}>
                <span className={switchThumb(siteForm.todosAiEnabled)} />
              </button>
            </div>
          </Tooltip>
        </div>

        {/* 搜索栏 + 筛选 + 添加 */}
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
          {/* + 添加按钮 */}
          <button
            type="button"
            onClick={openAddModal}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              isDark
                ? "border-blue-400/30 text-blue-400 hover:bg-blue-500/15"
                : "border-blue-400/50 text-blue-600 hover:bg-blue-50",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            添加
          </button>
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
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                    todo.completed
                      ? isDark
                        ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-400"
                        : "border-emerald-400 bg-emerald-100 text-emerald-600"
                      : isDark
                        ? "border-white/20 bg-transparent hover:border-white/40"
                        : "border-slate-300 bg-transparent hover:border-slate-400",
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

                {/* 编辑 + 删除 */}
                <Tooltip tip="编辑" themeMode={themeMode}>
                  <button
                    type="button"
                    onClick={() => openEditModal(todo)}
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                      isDark ? "text-white/40 hover:bg-white/10 hover:text-white/70" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                    )}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
                <Tooltip tip="删除" themeMode={themeMode}>
                  <button
                    type="button"
                    onClick={() => deleteTodo(todo.id)}
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
                      isDark ? "text-white/40 hover:bg-rose-500/15 hover:text-rose-400" : "text-slate-400 hover:bg-rose-50 hover:text-rose-500",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn("py-4 text-center text-sm", getDialogSubtleClass(themeMode))}>
            {siteForm.todos.length === 0 ? "暂无待办事项" : "没有匹配的待办事项"}
          </p>
        )}
      </div>

      {/* ── Todo 编辑弹窗 ── */}
      {editModalOpen && (
        <div className={cn("animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center", getDialogOverlayClass(themeMode))}>
          <div className={cn("animate-panel-rise w-full max-w-[400px] overflow-hidden rounded-[28px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]", getDialogPanelClass(themeMode))}>
            {/* 头部 */}
            <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
              <h3 className="text-lg font-semibold">
                {editingTodo ? "编辑待办" : "新建待办"}
              </h3>
              <button
                type="button"
                onClick={() => { setEditModalOpen(false); setEditingTodo(null); setModalText(""); }}
                className={cn("inline-flex h-9 w-9 items-center justify-center rounded-xl border transition", getDialogCloseBtnClass(themeMode))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-5">
              <input
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                placeholder="待办内容..."
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") saveTodo(); }}
                className={cn("w-full rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
              />
            </div>

            {/* 底部 */}
            <div className={cn("flex items-center gap-2 border-t px-5 py-4", isDark ? "border-white/8" : "border-slate-200/60")}>
              <button
                type="button"
                onClick={() => { setEditModalOpen(false); setEditingTodo(null); setModalText(""); }}
                className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition", getDialogSecondaryBtnClass(themeMode))}
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveTodo}
                disabled={!modalText.trim()}
                className={cn("inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60", getDialogPrimaryBtnClass(themeMode))}
              >
                <Check className="h-4 w-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
