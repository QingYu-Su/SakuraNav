/**
 * AI 助手对话框
 * @description 与 AI 进行流式对话，支持操作计划确认和快照撤回
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, Loader2, Lock, PlusCircle, RotateCcw, Send, Undo2, X, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { ThemeMode } from "@/lib/base/types";

type AiAssistantDialogProps = {
  open: boolean;
  themeMode: ThemeMode;
  isAuthenticated: boolean;
  onDataChanged: () => void;
  onClose: () => void;
};

/** 操作计划数据（从 AI tool result 中解析） */
type OperationPlan = {
  planned: boolean;
  summary: string;
  operations: Array<{ type: string; description: string; params: Record<string, unknown> }>;
  totalOperations: number;
  message: string;
};

/** 执行结果 */
type ExecutionResult = {
  snapshotId: string | null;
  results: Array<{ success: boolean; type: string; description: string; data?: unknown; error?: string }>;
  summary: { total: number; success: number; failed: number };
  /** 执行时在前端逐步拼接的进度日志 */
  progressLog?: string;
};

/** 快捷提示：直接附带明确指令，让 AI 一次完成查询+规划+请求确认 */
const QUICK_PROMPTS = [
  { label: "整理标签", prompt: "请分析当前所有标签和网站卡片（注意：只统计 cardType 为 null 的网站卡片，社交卡片和笔记卡片不参与标签分析），重点分析：1) 标签命名是否合理、是否与网站实际用途匹配；2) 是否有可以删除的冗余或无用标签；3) 是否有可以合并的相似或重叠标签（如语义相近、绑定的网站高度重叠）。目标是优化标签数量，减少冗余。分析完成后直接调用 plan_operations 提交整理方案（包括删除、合并、重命名等操作），让用户确认执行。" },
  { label: "删除离线网站", prompt: "请检查所有网站卡片（cardType 为 null 的网站）的在线状态，找出所有离线的网站，列出清单，然后直接调用 plan_operations 提交删除方案，让用户确认执行。" },
];

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

// ── 主组件 ──

export function AiAssistantDialog({ open, themeMode, isAuthenticated, onDataChanged, onClose }: AiAssistantDialogProps) {
  const isLight = themeMode === "light";
  const canChat = isAuthenticated;

  const [chatItems, setChatItems] = useState<Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    toolCalls?: Array<{ name: string; state: "loading" | "done"; result?: unknown }>;
  }>>([]);
  const [input, setInput] = useState("");
  const [pendingPlan, setPendingPlan] = useState<OperationPlan | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);
  const [sending, setSending] = useState(false);
  const [executingSnapshotId, setExecutingSnapshotId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, pendingPlan, executionResult]);

  // 页面刷新/关闭时：执行中的写操作 → 回滚快照；等待 AI 回复 → 仅丢弃
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 如果正在执行写操作，通过 sendBeacon 回滚快照
      if (executingSnapshotId) {
        navigator.sendBeacon("/api/ai/chat/execute/rollback", JSON.stringify({ snapshotId: executingSnapshotId }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [executingSnapshotId]);

  // 确认执行（流式输出每个操作的进度）
  const handleConfirmExecute = useCallback(async () => {
    if (!pendingPlan) return;
    const plan = pendingPlan;
    setPendingPlan(null);
    setExecuting(true);
    const progressMsgId = `msg-${Date.now()}`;
    setChatItems((prev) => [...prev, { id: progressMsgId, role: "system" as const, content: "⏳ 正在创建备份快照..." }]);

    try {
      const res = await fetch("/api/ai/chat/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: plan.operations, stream: true }),
      });

      if (!res.ok || !res.body) {
        setChatItems((prev) => prev.map((item) => item.id === progressMsgId ? { ...item, content: "❌ 执行请求失败，请稍后重试" } : item));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const progressLines: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.substring(6).trim();
          if (data === "[DONE]") break;
          try {
            const chunk = JSON.parse(data);
            if (chunk.type === "snapshot" && chunk.snapshotId) {
              setExecutingSnapshotId(chunk.snapshotId);
              progressLines.push("✅ 备份快照已创建");
              setChatItems((prev) => prev.map((item) =>
                item.id === progressMsgId ? { ...item, content: progressLines.join("\n") } : item,
              ));
            } else if (chunk.type === "progress" && chunk.index != null) {
              const idx = chunk.index as number;
              const desc = chunk.description ?? `操作 ${idx + 1}`;
              if (chunk.success === null) {
                // 正在执行
                if (idx >= progressLines.length) {
                  progressLines.push(`⏳ ${desc}`);
                }
                setChatItems((prev) => prev.map((item) =>
                  item.id === progressMsgId ? { ...item, content: progressLines.join("\n") } : item,
                ));
              } else {
                // 执行完毕
                const status = chunk.success ? "✅" : "❌";
                if (idx < progressLines.length) {
                  progressLines[idx] = `${status} ${desc}`;
                } else {
                  progressLines.push(`${status} ${desc}`);
                }
                setChatItems((prev) => prev.map((item) =>
                  item.id === progressMsgId ? { ...item, content: progressLines.join("\n") } : item,
                ));
              }
            } else if (chunk.type === "result") {
              const execRes = chunk.data as ExecutionResult;
              const summary = execRes.summary;
              progressLines.push(`\n🎉 全部完成：${summary.success} 成功${summary.failed > 0 ? `，${summary.failed} 失败` : ""}`);
              execRes.progressLog = progressLines.join("\n");
              setExecutionResult(execRes);
              setChatItems((prev) => prev.map((item) =>
                item.id === progressMsgId ? { ...item, content: progressLines.join("\n") } : item,
              ));
              onDataChanged();
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      console.error("执行操作失败:", err);
      setChatItems((prev) => prev.map((item) =>
        item.id === progressMsgId ? { ...item, content: "❌ 执行过程中发生错误，请稍后重试" } : item,
      ));
    } finally {
      setExecuting(false);
      setExecutingSnapshotId(null);
    }
  }, [pendingPlan, onDataChanged]);

  // 发送消息（displayText 用于界面显示，text 用于 API 发送）
  const handleSend = useCallback(async (content?: string, displayText?: string) => {
    const text = (content ?? input).trim();
    if (!text || sending || !canChat || executing) return;

    // 检测用户确认执行指令
    if (pendingPlan && /^(确认执行|确认|执行|确定|ok|yes)$/i.test(text)) {
      setInput("");
      const userMsgId = `msg-${Date.now()}`;
      setChatItems((prev) => [...prev, { id: userMsgId, role: "user" as const, content: text }]);
      await handleConfirmExecute();
      return;
    }

    // 非"确认"类的回复 → 清除待执行计划
    if (pendingPlan) {
      setPendingPlan(null);
    }

    setInput("");
    setExecutionResult(null);
    setUndone(false);

    const userMsgId = `msg-${Date.now()}`;
    const assistantMsgId = `msg-${Date.now() + 1}`;
    const shownText = displayText ?? text;

    const userItem = { id: userMsgId, role: "user" as const, content: shownText };
    const assistantItem = { id: assistantMsgId, role: "assistant" as const, content: "", toolCalls: [] as Array<{ name: string; state: "loading" | "done"; result?: unknown }> };
    setChatItems((prev) => [...prev, userItem, assistantItem]);
    setSending(true);

    let timeoutId: ReturnType<typeof setInterval> | undefined;
    const toolCallMap = new Map<string, { name: string; state: "loading" | "done"; result?: unknown }>();
    const toolCallOrder: string[] = [];

    const syncToolCalls = () => {
      const calls = toolCallOrder.map((id) => toolCallMap.get(id)!).filter(Boolean);
      setChatItems((prev) =>
        prev.map((item) =>
          item.id === assistantMsgId ? { ...item, toolCalls: calls } : item,
        ),
      );
    };

    try {
      abortRef.current = new AbortController();
      const messagesPayload = [...chatItems.filter((c) => c.role === "user" || c.role === "assistant").map((c) => ({
        id: c.id,
        role: c.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: c.content }],
      })), { id: `msg-${Date.now()}`, role: "user" as const, parts: [{ type: "text" as const, text }] }];

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesPayload }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setChatItems((prev) =>
          prev.map((item) =>
            item.id === assistantMsgId
              ? { ...item, content: (errData as { error?: string }).error ?? `请求失败 (${res.status})` }
              : item,
          ),
        );
        return;
      }

      // 解析 SSE 格式的 UIMessageStream (AI SDK v6)
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      // 超时检测：如果 60 秒内没有收到新数据，视为失败
      const STREAM_TIMEOUT = 60_000;
      let lastDataTime = Date.now();
      timeoutId = setInterval(() => {
        if (Date.now() - lastDataTime > STREAM_TIMEOUT) {
          setChatItems((prev) =>
            prev.map((item) =>
              item.id === assistantMsgId ? { ...item, content: item.content || "❌ AI 响应超时，请稍后重试" } : item,
            ),
          );
          toolCallMap.forEach((entry) => { entry.state = "done"; });
          syncToolCalls();
          reader.cancel().catch(() => {});
          clearInterval(timeoutId);
        }
      }, 5_000);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.substring(6).trim();
          if (data === "[DONE]") break;
          try {
            const chunk = JSON.parse(data);

            if (chunk.type === "text-delta" && typeof chunk.delta === "string") {
              lastDataTime = Date.now();
              setChatItems((prev) =>
                prev.map((item) =>
                  item.id === assistantMsgId ? { ...item, content: item.content + chunk.delta } : item,
                ),
              );
            } else if (chunk.type === "tool-input-start" && chunk.toolCallId && chunk.toolName) {
              lastDataTime = Date.now();
              toolCallMap.set(chunk.toolCallId, { name: chunk.toolName, state: "loading" });
              toolCallOrder.push(chunk.toolCallId);
              syncToolCalls();
            } else if (chunk.type === "tool-output-available" && chunk.toolCallId) {
              lastDataTime = Date.now();
              const entry = toolCallMap.get(chunk.toolCallId);
              if (entry) {
                entry.state = "done";
                entry.result = chunk.output;
                syncToolCalls();
                if (entry.name === "plan_operations" && (chunk.output as Record<string, unknown>)?.planned) {
                  setPendingPlan(chunk.output as OperationPlan);
                }
              }
            } else if (chunk.type === "error") {
              setChatItems((prev) =>
                prev.map((item) =>
                  item.id === assistantMsgId ? { ...item, content: item.content + `\n❌ 错误: ${chunk.errorText ?? "未知错误"}` } : item,
                ),
              );
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setChatItems((prev) =>
          prev.map((item) =>
            item.id === assistantMsgId ? { ...item, content: "请求失败，请稍后重试" } : item,
          ),
        );
      }
    } finally {
      if (timeoutId) clearInterval(timeoutId);
      // 将所有仍在 loading 的工具标记为 done（流异常结束时）
      let hasUnfinished = false;
      toolCallMap.forEach((entry) => {
        if (entry.state === "loading") {
          entry.state = "done";
          hasUnfinished = true;
        }
      });
      if (hasUnfinished) syncToolCalls();
      setSending(false);
      abortRef.current = null;
    }
  }, [input, sending, canChat, executing, pendingPlan, chatItems, handleConfirmExecute]);

  // 快捷提示
  const handleQuickPrompt = useCallback((prompt: string, label: string) => {
    void handleSend(prompt, label);
  }, [handleSend]);

  // 新建对话
  const handleNewChat = useCallback(() => {
    if (sending || executing) return;
    setChatItems([]);
    setPendingPlan(null);
    setExecutionResult(null);
    setUndone(false);
    setExecuting(false);
    setUndoing(false);
    setInput("");
  }, [sending, executing]);

  // 关闭
  const handleClose = useCallback(() => {
    if (sending || executing) return;
    abortRef.current?.abort();
    const hadChanges = !!executionResult && !undone;
    onClose();
    if (hadChanges) onDataChanged();
  }, [sending, executing, executionResult, undone, onClose, onDataChanged]);

  // 撤回
  const handleUndo = useCallback(async () => {
    if (!executionResult?.snapshotId) return;
    setUndoing(true);
    try {
      await fetch(`/api/snapshots?action=restore&id=${executionResult.snapshotId}`, { method: "POST" });
      setUndone(true);
      setExecutionResult(null);
      onDataChanged();
    } catch (err) {
      console.error("撤回失败:", err);
    } finally {
      setUndoing(false);
    }
  }, [executionResult, onDataChanged]);

  // 键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }, [handleSend]);

  if (!open) return null;

  const busy = sending || executing; // 仅异步操作中禁用交互（待确认计划不算）
  const showEmptyState = chatItems.length === 0 && !executionResult;
  const inputDisabled = !canChat; // 输入框只在未认证时禁用（等待中仍可输入）
  const sendDisabled = !input.trim() || sending || executing || !canChat;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" onClick={busy ? undefined : handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={cn(
          "relative flex w-full max-w-[720px] flex-col overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(0,0,0,0.12)] max-h-[88vh]",
          isLight ? "border-slate-200/50 bg-white/95 backdrop-blur-2xl" : "border-white/10 bg-[#0f172a]/95 backdrop-blur-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className={cn("flex items-center justify-between px-5 py-4", isLight ? "border-b border-slate-100" : "border-b border-white/8")}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4f7cff]/15">
              <Bot className="h-4.5 w-4.5 text-[#4f7cff]" />
            </div>
            <span className={cn("text-sm font-semibold", isLight ? "text-slate-800" : "text-white")}>AI 助手</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip tip={busy ? "请等待当前操作完成" : "新建对话"} themeMode={themeMode}>
              <button type="button" onClick={handleNewChat} disabled={busy} className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition", busy ? "cursor-not-allowed opacity-40" : isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "text-slate-500 hover:bg-white/8 hover:text-slate-300")}>
                <PlusCircle className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip tip={busy ? "请等待当前操作完成" : "关闭"} themeMode={themeMode}>
              <button type="button" onClick={handleClose} disabled={busy} className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition", busy ? "cursor-not-allowed opacity-40" : isLight ? "text-red-400 hover:bg-red-50 hover:text-red-500" : "text-red-400 hover:bg-red-500/10 hover:text-red-400")}>
                {busy ? <Lock className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          {showEmptyState ? (
            <EmptyState isLight={isLight} themeMode={themeMode} onQuickPrompt={handleQuickPrompt} />
          ) : (
            <div className="flex flex-col gap-3">
              {chatItems.map((item) => (
                <ChatItem key={item.id} item={item} isLight={isLight} sending={sending} />
              ))}
              {executionResult && <ExecutionResultPanel result={executionResult} isLight={isLight} undone={undone} undoing={undoing} onUndo={handleUndo} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className={cn("px-5 py-3", isLight ? "border-t border-slate-100" : "border-t border-white/8")}>
          <div className={cn("flex items-center gap-2 rounded-2xl border px-3", isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/5")} style={{ minHeight: "44px" }}>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // 自动调整高度
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={sending || executing ? "请等待当前操作完成..." : pendingPlan ? "回复「确认执行」开始执行，或输入其他内容取消计划..." : "输入消息，让 AI 帮你管理导航站..."}
              rows={1}
              disabled={inputDisabled}
              className={cn("flex-1 resize-none bg-transparent text-sm outline-none", isLight ? "text-slate-700 placeholder:text-slate-400" : "text-slate-200 placeholder:text-slate-500", "disabled:opacity-50")}
              style={{ lineHeight: "24px", maxHeight: "120px" }}
            />
            <Tooltip tip="发送" themeMode={themeMode} disabled={sendDisabled}>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sendDisabled}
                className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition bg-[#4f7cff] text-white hover:bg-[#678cff] disabled:opacity-40 disabled:hover:bg-[#4f7cff]")}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 空状态 ──

function EmptyState({ isLight, themeMode, onQuickPrompt }: { isLight: boolean; themeMode: ThemeMode; onQuickPrompt: (p: string, label: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", isLight ? "bg-slate-100" : "bg-white/8")}>
        <Bot className={cn("h-7 w-7", isLight ? "text-slate-400" : "text-slate-500")} />
      </div>
      <div className="text-center">
        <p className={cn("text-sm font-medium", isLight ? "text-slate-700" : "text-slate-300")}>你好！我是 AI 助手</p>
        <p className={cn("mt-1 text-xs", isLight ? "text-slate-400" : "text-slate-500")}>可以帮你管理标签、网站、卡片等数据</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[280px]">
        {QUICK_PROMPTS.map((item) => (
          <Tooltip key={item.label} tip={item.prompt} themeMode={themeMode}>
            <button
              type="button"
              onClick={() => onQuickPrompt(item.prompt, item.label)}
              className={cn(
                "w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition",
                isLight ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-white/8 text-slate-400 hover:bg-white/12",
              )}
            >
              {item.label}
            </button>
          </Tooltip>
        ))}
      </div>
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

// ── 打字指示器（AI 正在思考时显示的动画点） ──

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

// ── 聊天项 ──

function ChatItem({ item, isLight, sending }: {
  item: { role: string; content: string; toolCalls?: Array<{ name: string; state: string; result?: unknown }> };
  isLight: boolean;
  sending: boolean;
}) {
  if (item.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#4f7cff] px-3.5 py-2.5 text-sm text-white whitespace-pre-wrap">{item.content}</div>
      </div>
    );
  }

  // 系统消息（执行进度等）
  if (item.role === "system") {
    return (
      <div className="flex justify-start">
        <div className={cn(
          "max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isLight ? "bg-blue-50 text-slate-700 border border-blue-100/60" : "bg-[#4f7cff]/10 text-slate-300 border border-[#4f7cff]/10",
        )}>
          {item.content}
        </div>
      </div>
    );
  }

  // assistant 消息
  const hasLoadingTool = item.toolCalls?.some((tc) => tc.state === "loading");
  const isLoadingPlan = item.toolCalls?.some((tc) => tc.name === "plan_operations" && tc.state === "loading");
  const showTyping = sending && !item.content && hasLoadingTool;
  const visibleToolCalls = item.toolCalls?.filter((tc) => tc.name !== "plan_operations") ?? [];

  return (
    <div className="flex flex-col gap-2">
      {/* 工具调用标签 */}
      {visibleToolCalls.map((tc, i) => (
        <ToolCallBadge key={i} toolName={tc.name} state={tc.state} isLight={isLight} />
      ))}
      {/* 打字指示器：AI 正在思考且无文字输出时显示 */}
      {showTyping && <TypingIndicator isLight={isLight} />}
      {/* 文字内容 */}
      {item.content && (
        <div className="flex justify-start">
          <div className={cn("max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed", isLight ? "bg-slate-100 text-slate-700" : "bg-white/8 text-slate-300")}>
            <MarkdownContent content={item.content} isLight={isLight} />
          </div>
        </div>
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

// ── 工具调用标签（带动画） ──

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

// ── 执行结果面板 ──

function ExecutionResultPanel({ result, isLight, undone, undoing, onUndo }: { result: ExecutionResult; isLight: boolean; undone: boolean; undoing: boolean; onUndo: () => void }) {
  if (undone) {
    return (
      <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-3", isLight ? "bg-slate-100" : "bg-white/8")}>
        <RotateCcw className="h-4 w-4 text-slate-400" />
        <span className={cn("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>已撤回至操作前状态</span>
      </div>
    );
  }

  const hasFailed = result.summary.failed > 0;
  const hasResults = result.results && result.results.length > 0;

  return (
    <div className={cn("rounded-2xl border p-4", hasFailed ? (isLight ? "border-amber-200/60 bg-amber-50/50" : "border-amber-500/20 bg-amber-500/5") : (isLight ? "border-emerald-200/60 bg-emerald-50/50" : "border-emerald-500/20 bg-emerald-500/5"))}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check className={cn("h-4 w-4", hasFailed ? "text-amber-500" : "text-emerald-500")} />
          <span className={cn("text-sm font-medium", isLight ? "text-slate-700" : "text-slate-300")}>
            操作完成：{result.summary.success} 成功{hasFailed ? `，${result.summary.failed} 失败` : ""}
          </span>
        </div>
        {result.snapshotId && (
          <button type="button" onClick={onUndo} disabled={undoing} className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/20 disabled:opacity-50">
            {undoing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
            撤回
          </button>
        )}
      </div>
      {/* 详细操作日志 */}
      {hasResults && (
        <div className={cn("mt-3 space-y-1 border-t pt-3", isLight ? "border-emerald-200/40" : "border-emerald-500/10")}>
          {result.results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={r.success ? "text-emerald-500" : "text-red-500"}>
                {r.success ? "✓" : "✗"}
              </span>
              <span className={cn("leading-relaxed", isLight ? "text-slate-600" : "text-slate-400")}>
                {r.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
