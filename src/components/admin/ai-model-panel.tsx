/**
 * AI 模型配置面板
 * @description 设置面板中的 AI 模型配置区块，包含 API Key / Base URL / 模型名称输入及连通性测试
 */

import { useState } from "react";
import { Bot, Eye, EyeOff, LoaderCircle, CircleAlert, CircleCheckBig } from "lucide-react";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import {
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogInputClass,
} from "@/components/sakura-nav/style-helpers";
import type { ThemeMode } from "@/lib/base/types";

type AiModelPanelProps = {
  themeMode: ThemeMode;
  /** 是否已配置 API Key（显示掩码提示） */
  aiApiKeyMasked: boolean;
  /** AI 草稿配置 */
  aiDraftConfig: { aiApiKey: string; aiBaseUrl: string; aiModel: string };
  /** 更新 AI 草稿配置 */
  onAiDraftChange: (field: "aiApiKey" | "aiBaseUrl" | "aiModel", value: string) => void;
};

export function AiModelPanel({
  themeMode,
  aiApiKeyMasked,
  aiDraftConfig,
  onAiDraftChange,
}: AiModelPanelProps) {
  const isDark = themeMode === "dark";
  const { aiApiKey, aiBaseUrl, aiModel } = aiDraftConfig;

  const [showAiApiKey, setShowAiApiKey] = useState(false);
  const [aiTestBusy, setAiTestBusy] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<"success" | "error" | "">("");

  /** 测试 AI 连通性 */
  async function handleAiTest() {
    setAiTestBusy(true);
    setAiTestResult("");
    try {
      await requestJson<{ ok: boolean }>("/api/ai/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _draftAiConfig: { aiApiKey, aiBaseUrl, aiModel } }),
      });
      setAiTestResult("success");
    } catch {
      setAiTestResult("error");
    } finally {
      setAiTestBusy(false);
    }
  }

  return (
    <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5" />
        <h3 className="text-lg font-semibold">AI 模型</h3>
      </div>
      <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
        配置 AI 分析功能所需的模型接口。支持所有 OpenAI 兼容提供商。
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label className={cn("mb-1.5 block text-sm", isDark ? "text-white/75" : "text-slate-600")}>
            API Key
          </label>
          <div className="relative">
            <input
              type={showAiApiKey ? "text" : "password"}
              value={aiApiKey}
              onChange={(e) => {
                onAiDraftChange("aiApiKey", e.target.value);
                if (aiTestResult) setAiTestResult("");
              }}
              placeholder="输入 API Key"
              autoComplete="off"
              className={cn("w-full rounded-2xl border px-4 py-3 pr-11 text-sm outline-none [::-ms-reveal]:hidden [::-ms-clear]:hidden", getDialogInputClass(themeMode))}
            />
            <button
              type="button"
              onClick={() => setShowAiApiKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
              aria-label={showAiApiKey ? "隐藏" : "显示"}
            >
              {showAiApiKey ? <EyeOff className={cn("h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} /> : <Eye className={cn("h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />}
            </button>
          </div>
          {aiApiKeyMasked ? (
            <p className={cn("mt-1.5 text-xs", isDark ? "text-white/40" : "text-slate-400")}>
              当前已配置密钥。如需修改请输入新的完整密钥，留空则保持不变。
            </p>
          ) : null}
        </div>
        <div>
          <label className={cn("mb-1.5 block text-sm", isDark ? "text-white/75" : "text-slate-600")}>
            Base URL
          </label>
          <input
            type="text"
            value={aiBaseUrl}
            onChange={(e) => {
              onAiDraftChange("aiBaseUrl", e.target.value);
              if (aiTestResult) setAiTestResult("");
            }}
            placeholder="https://api.example.com/v1"
            className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))}
          />
        </div>
        <div>
          <label className={cn("mb-1.5 block text-sm", isDark ? "text-white/75" : "text-slate-600")}>
            模型名称
          </label>
          <input
            type="text"
            value={aiModel}
            onChange={(e) => {
              onAiDraftChange("aiModel", e.target.value);
              if (aiTestResult) setAiTestResult("");
            }}
            placeholder="deepseek-chat"
            className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))}
          />
        </div>
        {/* AI 连通性测试 */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => void handleAiTest()}
            disabled={aiTestBusy || (!aiApiKey && !aiBaseUrl && !aiModel)}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
              isDark
                ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                : "border-black/8 bg-black/3 text-slate-700 hover:bg-black/5",
            )}
          >
            {aiTestBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            {aiTestBusy ? "测试中..." : "测试连通性"}
          </button>
          {aiTestResult === "success" ? (
            <span className={cn("flex items-center gap-1.5 text-sm", isDark ? "text-emerald-400" : "text-emerald-600")}>
              <CircleCheckBig className="h-4 w-4" /> 连接成功
            </span>
          ) : null}
          {aiTestResult === "error" ? (
            <span className={cn("flex items-center gap-1.5 text-sm", isDark ? "text-rose-400" : "text-rose-600")}>
              <CircleAlert className="h-4 w-4" /> 连接失败，请检查配置
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
