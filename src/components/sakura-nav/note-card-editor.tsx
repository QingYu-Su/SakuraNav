/**
 * 笔记卡片编辑器
 * @description 编辑笔记卡片的标题和 Markdown 内容
 */

"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { ThemeMode } from "@/lib/base/types";
import type { NoteCardFormState } from "@/hooks/use-note-cards";
import { cn } from "@/lib/utils/utils";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "./style-helpers";

type NoteCardEditorProps = {
  open: boolean;
  themeMode: ThemeMode;
  cardForm: NoteCardFormState;
  setCardForm: React.Dispatch<React.SetStateAction<NoteCardFormState | null>>;
  onSubmit: () => void;
  onDelete?: (() => void) | undefined;
  onClose: () => void;
};

export function NoteCardEditor({
  open,
  themeMode,
  cardForm,
  setCardForm,
  onSubmit,
  onDelete,
  onClose,
}: NoteCardEditorProps) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const isEdit = !!cardForm.id;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit();
    } finally {
      setBusy(false);
    }
  }

  /**
   * Markdown 自动补写：在有序列表、无序列表、复选框行末按回车时自动续行
   * - 有序列表 "1. xxx" → "2. "
   * - 无序列表 "- xxx" / "* xxx" → "- " / "* "
   * - 复选框 "- [ ] xxx" / "- [x] xxx" → "- [ ] "
   * - 空列表项时清空（即仅剩标记符号时按回车，清除该行）
   */
  function handleAutoContinue(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey) return;
    const ta = e.currentTarget;
    const value = ta.value;
    const cursorPos = ta.selectionStart;
    // 当前光标所在行的起始位置
    const lineStart = value.lastIndexOf("\n", cursorPos - 1) + 1;
    const currentLine = value.slice(lineStart, cursorPos);

    // 匹配有序列表：数字 + "." 或 ")" + 空格
    const olMatch = currentLine.match(/^(\s*)(\d+)([.)])\s(.*)/);
    // 匹配无序列表："- " 或 "* " 或 "+ "（可带复选框）
    const ulMatch = currentLine.match(/^(\s*)[-*+]\s(\[[ xX]\]\s)?(.*)/);

    let insertion = "";
    let clearLine = false;

    if (olMatch) {
      const [, indent, numStr, sep, rest] = olMatch;
      if (rest.trim() === "") {
        // 空列表项 → 清除整行标记
        clearLine = true;
      } else {
        const nextNum = parseInt(numStr, 10) + 1;
        insertion = `\n${indent}${nextNum}${sep} `;
      }
    } else if (ulMatch) {
      const [, indent, checkbox] = ulMatch;
      const rest = ulMatch[3];
      if (rest.trim() === "") {
        clearLine = true;
      } else {
        insertion = checkbox
          ? `\n${indent}- [ ] `
          : `\n${indent}- `;
      }
    }

    if (!insertion && !clearLine) return;

    e.preventDefault();

    if (clearLine) {
      // 清空当前行的列表标记
      const before = value.slice(0, lineStart);
      const after = value.slice(cursorPos);
      const newValue = before + "\n" + after;
      setCardForm((prev) => prev ? { ...prev, content: newValue } : prev);
      // 延迟设置光标位置
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = lineStart + 1;
      });
    } else {
      const before = value.slice(0, cursorPos);
      const after = value.slice(cursorPos);
      const newValue = before + insertion + after;
      setCardForm((prev) => prev ? { ...prev, content: newValue } : prev);
      const newPos = cursorPos + insertion.length;
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = newPos;
      });
    }
  }

  const inputClass = cn(
    "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition",
    themeMode === "light"
      ? "border-slate-200 bg-white focus:border-slate-400"
      : "border-white/12 bg-white/6 focus:border-white/30",
  );

  const btnPrimary = cn(
    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition",
    "bg-slate-900 text-white hover:bg-slate-800",
    themeMode === "dark" && "bg-white/16 hover:bg-white/24",
    busy && "opacity-60 pointer-events-none",
  );

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")}>
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[600px] overflow-hidden rounded-[34px] border")}>
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Edit Mode</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {isEdit ? "编辑笔记" : "新建笔记"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto px-6 py-6">
          {/* 标题 */}
          <div className="mb-5">
            <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
              标题（选填）
            </label>
            <input
              type="text"
              value={cardForm.title}
              onChange={(e) => setCardForm((prev) => prev ? { ...prev, title: e.target.value } : prev)}
              placeholder="不填写时将使用内容前几个字作为标题"
              maxLength={100}
              className={inputClass}
            />
          </div>

          {/* Markdown 内容 */}
          <div className="mb-5">
            <label className={cn("mb-2 block text-sm font-medium", themeMode === "light" ? "text-slate-600" : "text-white/70")}>
              笔记内容 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={cardForm.content}
              onChange={(e) => setCardForm((prev) => prev ? { ...prev, content: e.target.value } : prev)}
              onKeyDown={handleAutoContinue}
              placeholder="使用 Markdown 格式编写笔记内容..."
              rows={10}
              className={cn(inputClass, "min-h-[200px] resize-y font-mono text-sm")}
            />
            <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-slate-400" : "text-white/40")}>
              支持 Markdown 语法，点击卡片后将以格式化形式展示
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-2">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => { onDelete(); }}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            ) : <div />}
            <button type="submit" className={btnPrimary}>
              {isEdit ? "保存修改" : "创建笔记"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
