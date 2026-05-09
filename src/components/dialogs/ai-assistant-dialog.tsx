/**
 * AI 助手对话框
 * @description 与 AI 进行流式对话，支持操作计划确认、快照撤回、聊天历史
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, Loader2, Menu, Send, Undo2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import type { ThemeMode, AiConversation } from "@/lib/base/types";
import { AiChatSidebar } from "./ai-chat-sidebar";
import { ChatItem, type ChatItemData } from "./ai-chat-message";
import Image from "next/image";

type AiAssistantDialogProps = {
  open: boolean;
  themeMode: ThemeMode;
  isAuthenticated: boolean;
  faviconUrl?: string;
  aiModel?: string;
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
  progressLog?: string;
};

/** 快捷提示 */
const QUICK_PROMPTS = [
  { label: "整理标签", description: "分析和优化标签结构", prompt: "请分析当前所有标签和网站卡片（注意：只统计 cardType 为 null 的网站卡片，社交卡片和笔记卡片不参与标签分析），重点分析：1) 标签命名是否合理、是否与网站实际用途匹配；2) 是否有可以删除的冗余或无用标签；3) 是否有可以合并的相似或重叠标签（如语义相近、绑定的网站高度重叠）。目标是优化标签数量，减少冗余。分析完成后直接调用 plan_operations 提交整理方案（包括删除、合并、重命名等操作），让用户确认执行。" },
  { label: "删除离线网站", description: "检查并清理离线网站", prompt: "请检查所有网站卡片（cardType 为 null 的网站）的在线状态，找出所有离线的网站，列出清单，然后直接调用 plan_operations 提交删除方案，让用户确认执行。" },
];

// ── 主组件 ──

export function AiAssistantDialog({ open, themeMode, isAuthenticated, faviconUrl, aiModel, onDataChanged, onClose }: AiAssistantDialogProps) {
  const isLight = themeMode === "light";
  const canChat = isAuthenticated;

  const [chatItems, setChatItems] = useState<ChatItemData[]>([]);
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

  // 聊天历史
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // 删除确认弹窗
  const [pendingDeleteConv, setPendingDeleteConv] = useState<{ id: string; title: string } | null>(null);

  // 用 ref 追踪最新 currentConvId 和 chatItems，避免闭包过期
  const currentConvIdRef = useRef<string | null>(null);
  const chatItemsRef = useRef<ChatItemData[]>([]);
  const msgIdCounter = useRef(0);
  const nextMsgId = useCallback(() => `msg-${Date.now()}-${++msgIdCounter.current}`, []);
  const setCurrentConvIdSync = useCallback((id: string | null) => {
    currentConvIdRef.current = id;
    setCurrentConvId(id);
  }, []);


  // 同步 chatItems 到 ref（在每次 setState 时同步更新，不依赖 useEffect）
  const _setChatItemsWithRef = useCallback((update: ChatItemData[] | ((prev: ChatItemData[]) => ChatItemData[])) => {
    setChatItems((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      chatItemsRef.current = next;
      return next;
    });
  }, []);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatItems, pendingPlan, executionResult]);

  const loadConversations = useCallback(async () => {
    setSidebarLoading(true);
    try {
      const res = await fetch("/api/ai/chat/history");
      if (res.ok) {
        const data = await res.json() as AiConversation[];
        setConversations(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ } finally {
      setSidebarLoading(false);
    }
  }, []);

  // 打开时加载历史
  useEffect(() => {
    if (open && canChat) {
      void loadConversations();
    }
  }, [open, canChat, loadConversations]);

  // 页面刷新/关闭时回滚
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (executingSnapshotId) {
        navigator.sendBeacon("/api/ai/chat/execute/rollback", JSON.stringify({ snapshotId: executingSnapshotId }));
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [executingSnapshotId]);

  // 保存当前对话到后端（只保存有内容的消息，替换而非追加）
  const saveCurrentConversation = useCallback(async (items: ChatItemData[], convId: string | null) => {
    const filtered = items.filter((item) => item.content.trim().length > 0);
    console.log("[AI Chat] saveCurrentConversation called", {
      totalItems: items.length,
      filteredItems: filtered.length,
      convId,
      firstItem: filtered[0]?.role,
    });
    if (!filtered.length) {
      console.log("[AI Chat] 跳过保存：无有效消息");
      return convId;
    }
    try {
      const msgs = filtered.map((item) => ({
        role: item.role as "user" | "assistant" | "system",
        content: item.content,
        toolCalls: item.toolCalls ? JSON.stringify(item.toolCalls) : undefined,
      }));

      let effectiveConvId = convId;

      if (!effectiveConvId) {
        const title = filtered.find((i) => i.role === "user")?.content.slice(0, 30) || "新对话";
        const createRes = await fetch("/api/ai/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!createRes.ok) {
          console.error("[AI Chat] 创建对话失败:", createRes.status);
          return convId;
        }
        const conv = await createRes.json() as AiConversation;
        effectiveConvId = conv.id;
      }

      const putRes = await fetch(`/api/ai/chat/history/${effectiveConvId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, replace: true }),
      });
      if (!putRes.ok) {
        console.error("[AI Chat] 保存消息失败:", putRes.status);
      }

      return effectiveConvId;
    } catch (err) {
      console.error("[AI Chat] 保存对话异常:", err);
      return convId;
    }
  }, []);

  // 加载指定对话的消息
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/ai/chat/history/${convId}`);
      if (res.ok) {
        const data = await res.json() as Array<{ id: string; role: string; content: string; toolCalls: string | null }>;
        const items: ChatItemData[] = (data ?? []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
        }));
        setChatItems(items);
        chatItemsRef.current = items;
        setCurrentConvIdSync(convId);
        setPendingPlan(null);
        setExecutionResult(null);
        setUndone(false);
        return;
      }
    } catch { /* ignore */ }
    // fallback: 清空
    setChatItems([]);
    chatItemsRef.current = [];
    setCurrentConvIdSync(convId);
  }, [setCurrentConvIdSync]);

  // 确认执行
  const handleConfirmExecute = useCallback(async () => {
    if (!pendingPlan) return;
    const plan = pendingPlan;
    setPendingPlan(null);
    setExecuting(true);
    const progressMsgId = nextMsgId();
    setChatItems((prev) => [...prev, { id: progressMsgId, role: "system", content: "⏳ 正在创建备份快照..." }]);

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
                if (idx >= progressLines.length) progressLines.push(`⏳ ${desc}`);
              } else {
                const status = chunk.success ? "✅" : "❌";
                if (idx < progressLines.length) progressLines[idx] = `${status} ${desc}`;
                else progressLines.push(`${status} ${desc}`);
              }
              setChatItems((prev) => prev.map((item) =>
                item.id === progressMsgId ? { ...item, content: progressLines.join("\n") } : item,
              ));
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
    // 保存对话（在 finally 之后）
    setTimeout(() => {
      let executed = false;
      setChatItems((currentItems) => {
        if (!executed) {
          executed = true;
          chatItemsRef.current = currentItems;
          const convIdForSave = currentConvIdRef.current;
          void saveCurrentConversation(currentItems, convIdForSave).then((newId) => {
            if (newId && newId !== currentConvIdRef.current) {
              setCurrentConvIdSync(newId);
            }
            void loadConversations();
          });
        }
        return currentItems;
      });
    }, 100);
  }, [pendingPlan, onDataChanged, saveCurrentConversation, loadConversations, nextMsgId, setCurrentConvIdSync]);

  // 发送消息
  const handleSend = useCallback(async (content?: string, displayText?: string) => {
    const text = (content ?? input).trim();
    if (!text || !canChat || executing) return;

    // 检测确认执行
    if (pendingPlan && /^(确认执行|确认|执行|确定|ok|yes)$/i.test(text)) {
      setInput("");
      const userMsgId = nextMsgId();
      setChatItems((prev) => [...prev, { id: userMsgId, role: "user", content: text }]);
      await handleConfirmExecute();
      return;
    }

    if (pendingPlan) setPendingPlan(null);

    setInput("");
    setExecutionResult(null);
    setUndone(false);

    const userMsgId = nextMsgId();
    const assistantMsgId = nextMsgId();
    const shownText = displayText ?? text;

    const userItem: ChatItemData = { id: userMsgId, role: "user", content: shownText };
    const assistantItem: ChatItemData = { id: assistantMsgId, role: "assistant", content: "", toolCalls: [] };

    // 使用函数式更新来避免 stale closure
    let latestItems: ChatItemData[] = [];
    setChatItems((prev) => {
      const next = [...prev, userItem, assistantItem];
      latestItems = next;
      return next;
    });
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
      // 构建上下文：将 system 消息转为 assistant 消息，以便 AI 记住操作结果
      const contextItems = latestItems.slice(0, -1).filter((c) => c.role === "user" || c.role === "assistant" || c.role === "system");
      const messagesPayload = [...contextItems.map((c) => ({
        id: c.id,
        role: (c.role === "system" ? "assistant" : c.role) as "user" | "assistant",
        parts: [{ type: "text" as const, text: c.content }],
      })), { id: nextMsgId(), role: "user" as const, parts: [{ type: "text" as const, text }] }];

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

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

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
          } catch { /* ignore */ }
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

    // 保存对话 —— 在 try/catch/finally 之后执行
    setTimeout(() => {
      let executed = false;
      setChatItems((currentItems) => {
        if (!executed) {
          executed = true;
          chatItemsRef.current = currentItems;
          const convIdForSave = currentConvIdRef.current;
          void saveCurrentConversation(currentItems, convIdForSave).then((newId) => {
            if (newId && newId !== currentConvIdRef.current) {
              setCurrentConvIdSync(newId);
            }
            void loadConversations();
          });
        }
        return currentItems;
      });
    }, 100);
  }, [input, canChat, executing, pendingPlan, handleConfirmExecute, saveCurrentConversation, loadConversations, nextMsgId, setCurrentConvIdSync]);

  // 快捷提示
  const handleQuickPrompt = useCallback((prompt: string, label: string) => {
    void handleSend(prompt, label);
  }, [handleSend]);

  // 新建对话
  const handleNewChat = useCallback(() => {
    if (executing) return;
    setChatItems([]);
    chatItemsRef.current = [];
    setPendingPlan(null);
    setExecutionResult(null);
    setUndone(false);
    setExecuting(false);
    setUndoing(false);
    setInput("");
    setCurrentConvIdSync(null);
  }, [executing, setCurrentConvIdSync]);

  // 选择对话
  const handleSelectConversation = useCallback((id: string) => {
    if (sending || executing) return;
    void loadConversation(id);
    setShowSidebar(false);
  }, [sending, executing, loadConversation]);

  // 请求删除对话（弹出确认）
  const handleRequestDelete = useCallback((id: string) => {
    const conv = conversations.find((c) => c.id === id);
    setPendingDeleteConv({ id, title: conv?.title || "新对话" });
  }, [conversations]);

  // 确认删除对话
  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteConv) return;
    const id = pendingDeleteConv.id;
    setPendingDeleteConv(null);
    try {
      const res = await fetch(`/api/ai/chat/history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (id === currentConvId) {
          handleNewChat();
        }
      }
    } catch { /* ignore */ }
  }, [pendingDeleteConv, currentConvId, handleNewChat]);

  // 重命名对话
  const handleRenameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/ai/chat/history/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title: newTitle } : c));
      }
    } catch { /* ignore */ }
  }, []);

  // 关闭
  const handleClose = useCallback(() => {
    if (executing) return; // 执行中不可关闭（sending 时允许关闭）
    abortRef.current?.abort();
    const hadChanges = !!executionResult && !undone;
    onClose();
    if (hadChanges) onDataChanged();
  }, [executing, executionResult, undone, onClose, onDataChanged]);

  // 强制停止
  const handleForceStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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
      if (sending) {
        handleForceStop();
      } else {
        void handleSend();
      }
    }
  }, [handleSend, sending, handleForceStop]);

  if (!open) return null;

  const showEmptyState = chatItems.length === 0 && !executionResult;
  const inputDisabled = !canChat;
  const sendDisabled = !input.trim() || executing || !canChat;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" onClick={executing ? undefined : handleClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={cn(
          "relative flex w-full max-w-[860px] h-[85vh] overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(0,0,0,0.12)]",
          isLight ? "border-slate-200/50 bg-white/95 backdrop-blur-2xl" : "border-white/10 bg-[#0f172a]/95 backdrop-blur-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧边栏（桌面端） */}
        <div className={cn("hidden sm:block w-[240px] shrink-0", isLight ? "border-r-2 border-slate-200/80" : "border-r-2 border-white/12")}>
          <AiChatSidebar
            conversations={conversations}
            currentId={currentConvId}
            isLight={isLight}
            themeMode={themeMode}
            loading={sidebarLoading}
            onNewChat={handleNewChat}
            onSelect={handleSelectConversation}
            onDelete={handleRequestDelete}
            onRename={handleRenameConversation}
          />
        </div>

        {/* 移动端侧边栏覆盖层 */}
        {showSidebar && (
          <div className="absolute inset-0 z-10 sm:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowSidebar(false)} />
            <div className={cn("relative w-[260px] h-full", isLight ? "bg-white/95" : "bg-[#0f172a]/95")}>
              <AiChatSidebar
                conversations={conversations}
                currentId={currentConvId}
                isLight={isLight}
                themeMode={themeMode}
                loading={sidebarLoading}
                onNewChat={handleNewChat}
                onSelect={handleSelectConversation}
                onDelete={handleRequestDelete}
                onRename={handleRenameConversation}
              />
            </div>
          </div>
        )}

        {/* 右侧主区域 */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* 标题栏 */}
          <div className={cn("flex items-center justify-between px-5 py-4", isLight ? "border-b border-slate-100" : "border-b border-white/8")}>
            <div className="flex items-center gap-2.5">
              {/* 移动端菜单按钮 */}
              <button
                type="button"
                onClick={() => setShowSidebar((v) => !v)}
                className={cn("sm:hidden flex h-8 w-8 items-center justify-center rounded-xl transition", isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "text-slate-500 hover:bg-white/8 hover:text-slate-300")}
              >
                <Menu className="h-4 w-4" />
              </button>
              {faviconUrl ? (
                <Image src={faviconUrl} alt="AI" width={28} height={28} className="h-7 w-7 rounded-full object-contain" unoptimized />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4f7cff]/15">
                  <Bot className="h-4 w-4 text-[#4f7cff]" />
                </div>
              )}
              <span className={cn("text-sm font-semibold", isLight ? "text-slate-800" : "text-white")}>AI 助手</span>
              {aiModel && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", isLight ? "bg-slate-100 text-slate-400" : "bg-white/8 text-slate-500")}>
                  {aiModel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Tooltip tip={executing ? "请等待当前操作完成" : "关闭"} themeMode={themeMode}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={executing}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl border transition",
                    executing
                      ? "cursor-not-allowed opacity-40"
                      : isLight
                        ? "border-slate-200 text-red-400 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
                        : "border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400",
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* 消息区域 */}
          <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
            {showEmptyState ? (
              <EmptyState isLight={isLight} themeMode={themeMode} faviconUrl={faviconUrl} onQuickPrompt={handleQuickPrompt} />
            ) : (
              <div className="flex flex-col gap-3">
                {chatItems.map((item) => (
                  <ChatItem key={item.id} item={item} isLight={isLight} sending={sending} faviconUrl={faviconUrl} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 撤回提示条 */}
          {executionResult && !undone && (
            <div className={cn(
              "relative mx-5 mb-2 flex items-center justify-between rounded-xl px-4 py-2.5",
              executionResult.summary.failed > 0
                ? (isLight ? "bg-amber-50 border border-amber-200/60" : "bg-amber-500/5 border border-amber-500/20")
                : (isLight ? "bg-emerald-50 border border-emerald-200/60" : "bg-emerald-500/5 border border-emerald-500/20"),
            )}>
              <Tooltip tip="关闭提示">
                <button
                  type="button"
                  onClick={() => setExecutionResult(null)}
                  className={cn(
                    "absolute -top-2.5 -left-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                    isLight
                      ? "border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-100 hover:text-slate-600"
                      : "border-white/10 bg-white/10 text-slate-500 hover:bg-white/20 hover:text-slate-300",
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              </Tooltip>
              <div className="flex items-center gap-2">
                <Check className={cn("h-4 w-4", executionResult.summary.failed > 0 ? "text-amber-500" : "text-emerald-500")} />
                <span className={cn("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>
                  操作已完成：{executionResult.summary.success} 成功{executionResult.summary.failed > 0 ? `，${executionResult.summary.failed} 失败` : ""}，不满意可撤回
                </span>
              </div>
              {executionResult.snapshotId && (
                <button
                  type="button"
                  onClick={() => void handleUndo()}
                  disabled={undoing}
                  className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {undoing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                  撤回
                </button>
              )}
            </div>
          )}
          {undone && (
            <div className={cn("relative mx-5 mb-2 flex items-center gap-2 rounded-xl px-4 py-2.5", isLight ? "bg-slate-50" : "bg-white/5")}>
              <Tooltip tip="关闭提示">
                <button
                  onClick={() => setUndone(false)}
                  className={cn(
                    "absolute -top-2.5 -left-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-all",
                    isLight
                      ? "border-slate-200 bg-white text-slate-400 shadow-sm hover:bg-slate-100 hover:text-slate-600"
                      : "border-white/10 bg-white/10 text-slate-500 hover:bg-white/20 hover:text-slate-300",
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              </Tooltip>
              <Undo2 className="h-4 w-4 shrink-0 text-slate-400" />
              <span className={cn("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>已撤回至操作前状态</span>
            </div>
          )}

          {/* 输入区域 */}
          <div className={cn("px-5 py-3", isLight ? "border-t border-slate-100" : "border-t border-white/8")}>
            <div className={cn("flex items-center gap-2 rounded-2xl border px-3", isLight ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/5")} style={{ minHeight: "44px" }}>
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder={sending ? "AI 正在回复，点击停止按钮中断..." : executing ? "请等待当前操作完成..." : pendingPlan ? "回复「确认执行」开始执行，或输入其他内容取消计划..." : "输入消息，让 AI 帮你管理导航站..."}
                rows={1}
                disabled={inputDisabled}
                className={cn("flex-1 resize-none bg-transparent text-sm outline-none", isLight ? "text-slate-700 placeholder:text-slate-400" : "text-slate-200 placeholder:text-slate-500", "disabled:opacity-50")}
                style={{ lineHeight: "24px", maxHeight: "120px" }}
              />
              {sending ? (
                <Tooltip tip="停止生成" themeMode={themeMode}>
                  <button
                    type="button"
                    onClick={handleForceStop}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition bg-red-500 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Tooltip>
              ) : (
                <Tooltip tip="发送" themeMode={themeMode} disabled={sendDisabled}>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sendDisabled}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition bg-[#4f7cff] text-white hover:bg-[#678cff] disabled:opacity-40 disabled:hover:bg-[#4f7cff]"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {pendingDeleteConv && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center animate-drawer-fade" onClick={() => setPendingDeleteConv(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className={cn(
              "relative w-full max-w-[400px] overflow-hidden rounded-[28px] border shadow-[0_24px_80px_rgba(0,0,0,0.12)] animate-panel-rise",
              isLight ? "border-slate-200/50 bg-white/95 backdrop-blur-2xl" : "border-white/10 bg-[#0f172a]/95 backdrop-blur-2xl",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={cn("flex items-center justify-between border-b px-6 py-5", isLight ? "border-slate-100" : "border-white/8")}>
              <div>
                <p className={cn("text-xs uppercase tracking-[0.28em]", isLight ? "text-slate-400" : "text-slate-500")}>Confirm</p>
                <h2 className={cn("mt-1 text-xl font-semibold", isLight ? "text-slate-800" : "text-white")}>删除对话</h2>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeleteConv(null)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                  isLight ? "border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600" : "border-white/10 text-slate-500 hover:bg-white/10 hover:text-slate-300",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm leading-relaxed",
                isLight ? "border-amber-200/60 bg-amber-50 text-amber-700" : "border-amber-300/20 bg-amber-400/10 text-amber-100",
              )}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>确定要删除对话「{pendingDeleteConv.title}」吗？此操作不可撤销。</span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDeleteConv(null)}
                  className={cn(
                    "inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
                    isLight ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10",
                  )}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDelete()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white transition bg-red-500 hover:bg-red-600"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 空状态 ──

function EmptyState({ isLight, themeMode, faviconUrl, onQuickPrompt }: { isLight: boolean; themeMode: ThemeMode; faviconUrl?: string; onQuickPrompt: (p: string, label: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      {faviconUrl ? (
        <Image src={faviconUrl} alt="AI" width={56} height={56} className="h-14 w-14 rounded-full object-contain" unoptimized />
      ) : (
        <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", isLight ? "bg-slate-100" : "bg-white/8")}>
          <Bot className={cn("h-7 w-7", isLight ? "text-slate-400" : "text-slate-500")} />
        </div>
      )}
      <div className="text-center">
        <p className={cn("text-sm font-medium", isLight ? "text-slate-700" : "text-slate-300")}>Hi~ 我是你的 AI 小管家 🌸</p>
        <p className={cn("mt-1 text-xs", isLight ? "text-slate-400" : "text-slate-500")}>整理标签、清理站点、管理卡片... 都交给我吧 ✨</p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[280px]">
        {QUICK_PROMPTS.map((item) => (
          <Tooltip key={item.label} tip={item.description} themeMode={themeMode}>
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
