/**
 * AI 聊天历史侧边栏
 * @description 左侧边栏，显示历史对话列表，支持切换、删除、新建对话
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { Clock, Loader2, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { AiConversation } from "@/lib/base/types";
import type { ThemeMode } from "@/lib/base/types";

export type AiChatSidebarProps = {
  conversations: AiConversation[];
  currentId: string | null;
  isLight: boolean;
  themeMode: ThemeMode;
  loading: boolean;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onClose?: () => void;
};

/** 格式化时间为简短显示 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "刚刚";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function AiChatSidebar({
  conversations,
  currentId,
  isLight,
  themeMode,
  loading,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
}: AiChatSidebarProps) {
  return (
    <div className="flex h-full w-full flex-col">
      {/* 顶部：新建对话按钮 */}
      <div className={cn("px-2 pt-3 pb-2", isLight ? "border-b border-slate-100" : "border-b border-white/8")}>
        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
            isLight
              ? "bg-[#4f7cff]/10 text-[#4f7cff] hover:bg-[#4f7cff]/20"
              : "bg-[#4f7cff]/15 text-[#4f7cff] hover:bg-[#4f7cff]/25",
          )}
        >
          <PlusCircle className="h-4 w-4" />
          创建会话
        </button>
      </div>

      {/* 标题 */}
      <div className={cn("flex items-center gap-2 px-4 pt-2 pb-1", isLight ? "border-b border-slate-100" : "border-b border-white/8")}>
        <Clock className={cn("h-3.5 w-3.5", isLight ? "text-slate-400" : "text-slate-500")} />
        <span className={cn("text-xs font-semibold", isLight ? "text-slate-500" : "text-slate-400")}>历史记录</span>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={cn("h-5 w-5 animate-spin", isLight ? "text-slate-400" : "text-slate-500")} />
          </div>
        ) : conversations.length === 0 ? (
          <div className={cn("px-3 py-8 text-center text-xs", isLight ? "text-slate-400" : "text-slate-500")}>
            暂无对话记录
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentId}
                isLight={isLight}
                themeMode={themeMode}
                onSelect={onSelect}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  isLight,
  themeMode,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: AiConversation;
  isActive: boolean;
  isLight: boolean;
  themeMode: ThemeMode;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title || "新对话");
  const inputRef = useRef<HTMLInputElement>(null);
  const comittingRef = useRef(false);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(conversation.id);
  }, [conversation.id, onDelete]);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setEditValue(conversation.title || "新对话");
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [conversation.title]);

  const commitEdit = useCallback(() => {
    if (comittingRef.current) return;
    comittingRef.current = true;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      onRename(conversation.id, trimmed);
    }
    setEditing(false);
    setTimeout(() => { comittingRef.current = false; }, 0);
  }, [editValue, conversation.id, conversation.title, onRename]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  }, [commitEdit]);

  const btnBase = cn(
    "shrink-0 flex h-6 w-6 items-center justify-center rounded-md border transition opacity-0 group-hover:opacity-100",
    isLight ? "border-slate-200 text-slate-400" : "border-white/10 text-slate-500",
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!editing) onSelect(conversation.id); }}
      onKeyDown={(e) => { if (!editing && e.key === "Enter") onSelect(conversation.id); }}
      className={cn(
        "group relative flex items-center gap-2 rounded-xl px-3 py-2.5 cursor-pointer transition",
        isActive
          ? (isLight ? "bg-slate-100" : "bg-white/10")
          : (isLight ? "hover:bg-slate-50" : "hover:bg-white/5"),
      )}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full rounded-md border px-2 py-0.5 text-xs outline-none",
              isLight ? "border-slate-300 bg-white text-slate-700" : "border-white/20 bg-white/10 text-slate-200",
            )}
          />
        ) : (
          <div className={cn("truncate text-xs font-medium", isActive ? (isLight ? "text-slate-800" : "text-white") : (isLight ? "text-slate-600" : "text-slate-300"))}>
            {conversation.title || "新对话"}
          </div>
        )}
        <div className={cn("mt-0.5 text-[10px]", isLight ? "text-slate-400" : "text-slate-500")}>
          {formatTime(conversation.updatedAt)}
        </div>
      </div>
      {!editing && (
        <>
          <Tooltip tip="重命名" themeMode={themeMode}>
            <button
              type="button"
              onClick={handleStartEdit}
              className={cn(btnBase, isLight ? "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500" : "hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400")}
            >
              <Pencil className="h-3 w-3" />
            </button>
          </Tooltip>
          <Tooltip tip="删除" themeMode={themeMode}>
            <button
              type="button"
              onClick={handleDelete}
              className={cn(btnBase, isLight ? "hover:bg-red-50 hover:border-red-300 hover:text-red-500" : "hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400")}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Tooltip>
        </>
      )}
    </div>
  );
}
