/**
 * 笔记卡片查看弹窗
 * @description 以只读形式展示笔记卡片的 Markdown 渲染内容
 * 支持 Todo 复选框交互：点击 checkbox 可切换完成状态并直接持久化
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NoteCard, ThemeMode } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import { getDialogOverlayClass, getDialogPanelClass, getDialogDividerClass, getDialogSubtleClass, getDialogCloseBtnClass } from "@/components/sakura-nav/style-helpers";

type NoteCardViewDialogProps = {
  open: boolean;
  card: NoteCard | null;
  themeMode: ThemeMode;
  onClose: () => void;
  /** 笔记内容更新回调（checkbox 切换后通知父组件同步 cards 数组） */
  onContentUpdate?: (newContent: string) => void;
};

/** ReactMarkdown 传入的 input 组件额外携带的 node 属性类型 */
type MarkdownInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  node?: unknown;
};

export function NoteCardViewDialog({ open, card, themeMode, onClose, onContentUpdate }: NoteCardViewDialogProps) {
  // 本地内容状态：支持 checkbox 切换时即时更新渲染
  const [localContent, setLocalContent] = useState("");

  // 同步 card.content → localContent
  useEffect(() => {
    if (card) setLocalContent(card.content);
  }, [card]);

  // 内容引用：确保快速连续点击 checkbox 时始终基于最新内容计算
  const contentRef = useRef(card?.content ?? "");
  useEffect(() => {
    contentRef.current = card?.content ?? "";
  }, [card?.content]);

  // checkbox 渲染计数器（每轮 ReactMarkdown 渲染从 0 递增，用于匹配 checkbox 索引）
  const checkboxCounter = useRef(0);
  checkboxCounter.current = 0;

  /** 切换指定索引位置的 checkbox（- [ ] ↔ - [x]）并直接持久化 */
  const handleCheckboxToggle = useCallback((index: number) => {
    if (!card) return;

    const prev = contentRef.current;
    let currentIdx = 0;
    const newContent = prev.replace(
      /^(\s*[-*]) \[([ xX])\]/gm,
      (match, prefix: string, checked: string) => {
        if (currentIdx === index) {
          currentIdx++;
          const newChecked = checked.trim().toLowerCase() === "x" ? " " : "x";
          return `${prefix} [${newChecked}]`;
        }
        currentIdx++;
        return match;
      },
    );

    if (newContent === prev) return;

    // 即时更新 UI
    contentRef.current = newContent;
    setLocalContent(newContent);
    onContentUpdate?.(newContent);

    // 直接持久化到服务端（无需撤回）
    requestJson("/api/cards/note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: card.id, title: card.title, content: newContent }),
    });
  }, [card, onContentUpdate]);

  if (!open || !card) return null;

  return (
    <div className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center")} onClick={onClose}>
      <div
        className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[680px] overflow-hidden rounded-[34px] border")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-6 py-5", getDialogDividerClass(themeMode))}>
          <div className="min-w-0 flex-1 pr-4">
            <p className={cn("text-xs uppercase tracking-[0.28em]", getDialogSubtleClass(themeMode))}>Note</p>
            <h2 className="mt-1 truncate text-2xl font-semibold">{card.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Markdown 渲染内容（支持 checkbox 交互） */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="md-prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                input: ({ node: _node, disabled: _disabled, readOnly: _readOnly, ...rest }: MarkdownInputProps) => {
                  const idx = checkboxCounter.current;
                  checkboxCounter.current++;
                  return (
                    <input
                      {...rest}
                      disabled={false}
                      readOnly={false}
                      onChange={() => handleCheckboxToggle(idx)}
                      style={{ cursor: "pointer" }}
                    />
                  );
                },
              }}
            >
              {localContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
