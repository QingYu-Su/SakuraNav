/**
 * AI 工作流助手对话框
 * @description 用户输入需求后，AI 基于所有网站卡片信息（含推荐上下文、关联网站）
 *   规划出有序的工作流，按步骤串联完成用户目标所需的网站。
 */

"use client";

import {
  CircleAlert,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type Card, type ThemeMode } from "@/lib/base/types";
import { showSiteContextMenu } from "@/components/ui/site-context-menu";
import { cn } from "@/lib/utils/utils";
import { postJson, requestJson } from "@/lib/base/api";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogCloseBtnClass,
} from "../sakura-nav/style-helpers";
import { getAiDraftConfig } from "@/lib/utils/ai-draft-ref";

type WorkflowStep = {
  site: Card;
  action: string;
  reason: string;
};

export function AiWorkflowDialog({
  open,
  onClose,
  themeMode,
}: {
  open: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState("");
  /** 标记是否已提交过请求，避免输入阶段就显示空结果提示 */
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  // 打开时自动聚焦；关闭时重置状态（setTimeout 避免级联渲染）
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // 使用 setTimeout 将 setState 移出 effect 同步执行路径，避免 cascading render
      setTimeout(() => {
        setQuery("");
        setSteps([]);
        setReasoning("");
        setError("");
        setBusy(false);
        setHasSearched(false);
      }, 0);
    }
  }, [open]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || busy) return;

    const requestId = ++requestIdRef.current;
    setSteps([]);
    setReasoning("");
    setError("");
    setHasSearched(true);
    setBusy(true);

    void requestJson<{
      steps: WorkflowStep[];
      reasoning: string;
    }>("/api/ai/workflow", postJson({ query: trimmed, _draftAiConfig: getAiDraftConfig() }))
      .then((data) => {
        if (requestId !== requestIdRef.current) return;
        setSteps(data.steps);
        setReasoning(data.reasoning);
      })
      .catch((err: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setSteps([]);
        setReasoning("");
        const msg = err instanceof Error ? err.message : "";
        setError(msg.includes("未配置") ? "AI 功能未配置" : "AI 服务不可用，请稍后重试");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setBusy(false);
      });
  }

  if (!open) return null;

  return (
    <div
      className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[55] flex items-center justify-center p-4")}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[680px] rounded-[34px] border p-5 backdrop-blur-2xl sm:p-6")}>
        {/* 标题 */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", themeMode === "light" ? "text-slate-400" : "text-white/50")}>
              AI Workflow
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <Sparkles className={cn("h-5 w-5", themeMode === "light" ? "text-purple-500" : "text-purple-400")} />
              AI 工作流助手
            </h2>
            <p className={cn("mt-2 text-sm", themeMode === "light" ? "text-slate-500" : "text-white/68")}>
              描述你想完成的目标，AI 会帮你规划工作流并串联所需网站。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 输入框 */}
        <form onSubmit={handleSubmit}>
          <div className={cn(
            "flex items-center gap-3 rounded-[30px] border p-3",
            themeMode === "light" ? "border-slate-200/50 bg-white/80" : "border-white/20 bg-white/10",
          )}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="描述你想完成的目标，例如「开发一个 APP」"
              className={cn("min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:opacity-60", themeMode === "light" ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-white")}
            />
            <button
              type="submit"
              disabled={!query.trim() || busy}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-4 text-xs font-semibold transition",
                themeMode === "light"
                  ? "border-purple-300/40 bg-purple-500/12 text-purple-700 hover:bg-purple-500/22"
                  : "border-purple-400/40 bg-purple-500/16 text-purple-200 hover:bg-purple-500/26",
                (!query.trim() || busy) && "cursor-default opacity-40",
              )}
            >
              {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              规划工作流
            </button>
          </div>
        </form>

        {/* 结果区域 */}
        {busy && !steps.length ? (
          <div className={cn(
            "mt-5 flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-5 text-sm",
            themeMode === "light" ? "border-purple-300/30 bg-purple-50/60 text-purple-500/70" : "border-purple-400/20 bg-purple-500/6 text-purple-300/70",
          )}>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            AI 正在分析所有网站，为你规划最佳工作流...
          </div>
        ) : null}

        {error ? (
          <div className={cn(
            "mt-5 flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-3 text-sm",
            themeMode === "light" ? "border-amber-300/30 bg-amber-50/60 text-amber-600" : "border-amber-400/20 bg-amber-500/8 text-amber-300",
          )}>
            <CircleAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {steps.length > 0 ? (
          <div className="mt-5">
            {/* 推理说明 */}
            {reasoning ? (
              <p className={cn("mb-4 text-sm", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/80")}>{reasoning}</p>
            ) : null}

            {/* 工作流步骤 */}
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.site.id} className="flex items-stretch gap-0">
                  {/* 左侧连线 + 步骤号 */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      themeMode === "light"
                        ? "bg-purple-500/12 text-purple-600 ring-2 ring-purple-200/50"
                        : "bg-purple-500/20 text-purple-300 ring-2 ring-purple-400/30",
                    )}>
                      {index + 1}
                    </div>
                    {index < steps.length - 1 ? (
                      <div className={cn("w-0.5 flex-1 min-h-4", themeMode === "light" ? "bg-purple-200/50" : "bg-purple-400/30")} />
                    ) : null}
                  </div>

                  {/* 步骤内容 */}
                  <a
                    href={step.site.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group mb-2 ml-3 flex-1 rounded-[20px] border p-3.5 transition hover:-translate-y-0.5",
                      themeMode === "light"
                        ? "border-purple-200/40 bg-purple-50/40 hover:bg-purple-100/60"
                        : "border-purple-400/16 bg-purple-500/8 hover:bg-purple-500/14",
                    )}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showSiteContextMenu(step.site, e.clientX, e.clientY); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        {step.site.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={step.site.iconUrl}
                            alt={`${step.site.name} icon`}
                            className={cn("h-10 w-10 rounded-xl border object-cover", themeMode === "light" ? "border-purple-200/40 bg-purple-100/40" : "border-purple-400/14 bg-purple-400/14")}
                          />
                        ) : (
                          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold", themeMode === "light" ? "border-purple-200/40 bg-purple-100/40" : "border-purple-400/14 bg-purple-400/14")}>
                            {step.site.name.charAt(0)}
                          </span>
                        )}
                        {step.site.siteTodos.filter((t) => !t.completed).length > 0 && (
                          <span className="absolute -top-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-black bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white">
                            {step.site.siteTodos.filter((t) => !t.completed).length > 99 ? "99+" : step.site.siteTodos.filter((t) => !t.completed).length}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="truncate text-sm font-semibold">{step.site.name}</h5>
                          <span className={cn(
                            "inline-flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold",
                            themeMode === "light"
                              ? "bg-purple-500/10 text-purple-600"
                              : "bg-purple-500/16 text-purple-300",
                          )}>
                            {step.action}
                          </span>
                        </div>
                        {step.reason ? (
                          <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/90")}>{step.reason}</p>
                        ) : null}
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ) : hasSearched && !busy && !error && steps.length === 0 ? (
          <div className={cn(
            "mt-5 flex items-center justify-center rounded-[22px] border border-dashed px-4 py-5 text-sm",
            themeMode === "light" ? "border-slate-200/50 bg-slate-50/40 text-slate-400" : "border-white/12 bg-white/4 text-white/58",
          )}>
            AI 未找到能帮助完成该目标的网站，请换个描述试试。
          </div>
        ) : null}
      </div>
    </div>
  );
}
