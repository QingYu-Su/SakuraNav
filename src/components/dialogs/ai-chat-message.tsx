/**
 * AI 聊天消息渲染组件
 * @description 消息气泡、复制按钮、Markdown 渲染、工具调用标签、打字指示器
 */

"use client";

import { useCallback, useState } from "react";
import { Check, Copy, Loader2, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { cn } from "@/lib/utils/utils";

/** 剪贴板写入的 fallback 方案（用于 HTTP 等不安全上下文） */
function fallbackCopy(text: string, onSuccess: () => void) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  onSuccess();
}

/** 工具调用的中文标签映射 */
const TOOL_LABELS: Record<string, string> = {
  list_tags: "查询标签",
  list_sites: "查询网站",
  list_all_sites: "查询全部网站",
  get_site: "查询网站详情",
  search_sites: "搜索网站",
  list_cards: "查询卡片",
  list_notes: "查询笔记",
  plan_operations: "规划操作",
};

export type ChatItemData = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{ name: string; state: "loading" | "done"; result?: unknown }>;
};

// ── 复制按钮 ──

function CopyButton({ text, isLight }: { text: string; isLight: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "mt-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition",
        isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-500" : "text-slate-600 hover:bg-white/8 hover:text-slate-400",
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      <span>{copied ? "已复制" : "复制"}</span>
    </button>
  );
}

// ── 聊天项 ──

export function ChatItem({ item, isLight, sending, faviconUrl }: {
  item: ChatItemData;
  isLight: boolean;
  sending: boolean;
  faviconUrl?: string;
}) {
  // AI 头像（system 和 assistant 共用）
  const avatar = faviconUrl ? (
    <Image src={faviconUrl} alt="AI" width={28} height={28} className="h-7 w-7 shrink-0 rounded-full object-contain" unoptimized />
  ) : (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f7cff]/15">
      <span className="text-[10px] font-bold text-[#4f7cff]">AI</span>
    </div>
  );

  if (item.role === "user") {
    return (
      <div className="flex flex-col items-end">
        <div
          className="max-w-[80%] select-text rounded-2xl rounded-br-sm bg-[#4f7cff] px-3.5 py-2.5 text-sm text-white whitespace-pre-wrap"
          style={{ WebkitUserSelect: "text", userSelect: "text" }}
        >
          <span className="user-msg-text">{item.content}</span>
        </div>
        <CopyButton text={item.content} isLight={isLight} />
      </div>
    );
  }

  // 系统消息（执行进度等）
  if (item.role === "system") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end gap-2">
          {avatar}
          <div className={cn(
            "max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
            isLight ? "bg-blue-50 text-slate-700 border border-blue-100/60" : "bg-[#4f7cff]/10 text-slate-300 border border-[#4f7cff]/10",
          )}>
            {item.content}
          </div>
        </div>
        {item.content && <div style={{ marginLeft: 36 }}><CopyButton text={item.content} isLight={isLight} /></div>}
      </div>
    );
  }

  // assistant 消息
  const hasLoadingTool = item.toolCalls?.some((tc) => tc.state === "loading");
  const isLoadingPlan = item.toolCalls?.some((tc) => tc.name === "plan_operations" && tc.state === "loading");
  const showTyping = sending && !item.content && hasLoadingTool;
  const visibleToolCalls = item.toolCalls?.filter((tc) => tc.name !== "plan_operations") ?? [];
  const showCopy = !sending && item.content.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* 工具调用标签 */}
      {visibleToolCalls.map((tc, i) => (
        <ToolCallBadge key={i} toolName={tc.name} state={tc.state} isLight={isLight} />
      ))}
      {/* 打字指示器 */}
      {showTyping && <TypingIndicator isLight={isLight} />}
      {/* 文字内容 */}
      {item.content && (
        <>
          <div className="flex items-end gap-2">
            {avatar}
            <div className={cn("max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed", isLight ? "bg-slate-100 text-slate-700" : "bg-white/8 text-slate-300")}>
              <MarkdownContent content={item.content} isLight={isLight} />
            </div>
          </div>
          {showCopy && <div style={{ marginLeft: 36 }}><CopyButton text={item.content} isLight={isLight} /></div>}
        </>
      )}
      {/* plan_operations 规划中动画 */}
      {isLoadingPlan && (
        <div className={cn("inline-flex items-center gap-2 self-start rounded-xl px-4 py-2.5 text-sm", isLight ? "bg-blue-50 text-blue-600" : "bg-[#4f7cff]/10 text-[#4f7cff]")}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>正在生成操作计划...</span>
        </div>
      )}
    </div>
  );
}

// ── Markdown 消息内容（AI 回复渲染） ──

function MarkdownContent({ content, isLight }: { content: string; isLight: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className={cn("font-semibold", isLight ? "text-slate-900" : "text-white")}>{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className={cn("block rounded-lg p-3 text-xs leading-relaxed", isLight ? "bg-slate-200/60 text-slate-800" : "bg-white/10 text-slate-200")} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className={cn("rounded px-1.5 py-0.5 text-xs", isLight ? "bg-slate-200/60 text-slate-800" : "bg-white/10 text-slate-200")} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className={cn("mb-2 border-l-2 pl-3 last:mb-0", isLight ? "border-slate-300 text-slate-600" : "border-slate-600 text-slate-400")}>
            {children}
          </blockquote>
        ),
        h1: ({ children }) => <h1 className={cn("mb-2 text-lg font-bold last:mb-0", isLight ? "text-slate-900" : "text-white")}>{children}</h1>,
        h2: ({ children }) => <h2 className={cn("mb-2 text-base font-bold last:mb-0", isLight ? "text-slate-900" : "text-white")}>{children}</h2>,
        h3: ({ children }) => <h3 className={cn("mb-1.5 text-sm font-bold last:mb-0", isLight ? "text-slate-900" : "text-white")}>{children}</h3>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#4f7cff] underline decoration-[#4f7cff]/30 hover:decoration-[#4f7cff] transition">
            {children}
          </a>
        ),
        hr: () => <hr className={cn("my-2 border-0", isLight ? "border-t border-slate-200" : "border-t border-white/10")} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ── 打字指示器 ──

function TypingIndicator({ isLight }: { isLight: boolean }) {
  return (
    <div className="flex justify-start">
      <div className={cn("flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3", isLight ? "bg-slate-100" : "bg-white/8")}>
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn("inline-block h-1.5 w-1.5 rounded-full", isLight ? "bg-slate-400" : "bg-slate-500")}
              style={{ animation: `typing-bounce 1.2s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

// ── 工具调用标签 ──

function ToolCallBadge({ toolName, state, isLight }: { toolName: string; state: string; isLight: boolean }) {
  const label = TOOL_LABELS[toolName] ?? "操作";
  const isLoading = state === "loading";

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1 text-xs transition-all",
      isLoading
        ? (isLight ? "bg-blue-50 text-blue-600" : "bg-[#4f7cff]/10 text-[#4f7cff]")
        : (isLight ? "bg-slate-50 text-slate-500" : "bg-white/5 text-slate-500"),
    )}>
      <Wrench className="h-3 w-3" />
      <span>{isLoading ? `${label}中...` : `${label}完成`}</span>
      {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
    </div>
  );
}
