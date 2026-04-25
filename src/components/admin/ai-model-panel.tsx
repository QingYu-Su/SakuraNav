/**
 * AI 模型配置面板
 * @description 设置面板中的 AI 模型配置区块，包含供应商下拉、模型下拉、API Key 输入及连通性测试
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Bot, Eye, EyeOff, LoaderCircle, CircleAlert, CircleCheckBig, ChevronDown, Check, Globe } from "lucide-react";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import {
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogInputClass,
} from "@/components/sakura-nav/style-helpers";
import type { ThemeMode } from "@/lib/base/types";
import { AI_PROVIDERS, AI_CUSTOM_PROVIDER_KEY } from "@/lib/base/types";

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
  const [aiTestResult, setAiTestResult] = useState<"success" | "error" | ("")>("");
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  /**
   * 用户主动选择的供应商索引或 AI_CUSTOM_PROVIDER_KEY。
   * 初始为 null，由 matchedProvider 推断；用户操作后锁定。
   */
  const [userProvider, setUserProvider] = useState<string | null>(null);
  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  /** 根据 baseUrl 推断匹配的供应商索引 */
  const matchedProvider = useMemo(() => {
    const idx = AI_PROVIDERS.findIndex((p) => p.baseUrl === aiBaseUrl);
    return idx >= 0 ? String(idx) : AI_CUSTOM_PROVIDER_KEY;
  }, [aiBaseUrl]);

  /** 实际生效的供应商 */
  const activeProvider = userProvider ?? matchedProvider;
  const isCustom = activeProvider === AI_CUSTOM_PROVIDER_KEY;

  /** 当前供应商的模型列表 */
  const providerModels = useMemo(() => {
    if (isCustom) return [];
    return AI_PROVIDERS[Number(activeProvider)]?.models ?? [];
  }, [activeProvider, isCustom]);

  /** 供应商显示名称 */
  const providerLabel = useMemo(() => {
    if (isCustom) return "自定义";
    return AI_PROVIDERS[Number(activeProvider)]?.label ?? "自定义";
  }, [activeProvider, isCustom]);

  /** 点击外部关闭下拉框 */
  useEffect(() => {
    if (!providerDropdownOpen && !modelDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (providerDropdownOpen && providerRef.current && !providerRef.current.contains(e.target as Node)) {
        setProviderDropdownOpen(false);
      }
      if (modelDropdownOpen && modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [providerDropdownOpen, modelDropdownOpen]);

  /** 切换供应商 */
  const handleProviderChange = useCallback((value: string) => {
    setUserProvider(value);
    if (value === AI_CUSTOM_PROVIDER_KEY) {
      // 自定义：清空预设值
      onAiDraftChange("aiBaseUrl", "");
      onAiDraftChange("aiModel", "");
    } else {
      const provider = AI_PROVIDERS[Number(value)];
      if (provider) {
        onAiDraftChange("aiBaseUrl", provider.baseUrl);
        // 自动选中该供应商的第一个模型
        if (provider.models.length > 0) {
          onAiDraftChange("aiModel", provider.models[0]);
        }
      }
    }
    if (aiTestResult) setAiTestResult("");
    setProviderDropdownOpen(false);
  }, [onAiDraftChange, aiTestResult]);

  /** 切换具体模型 */
  const handleModelChange = useCallback((model: string) => {
    onAiDraftChange("aiModel", model);
    if (aiTestResult) setAiTestResult("");
    setModelDropdownOpen(false);
  }, [onAiDraftChange, aiTestResult]);

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
        配置 AI 分析功能所需的模型接口。支持 OpenAI、Anthropic、Google 等多种供应商。
      </p>
      <div className="mt-4 space-y-3">
        {/* ① 模型供应商下拉框 */}
        <div ref={providerRef} className="relative">
          <label className={cn("mb-1.5 block text-sm", isDark ? "text-white/75" : "text-slate-600")}>
            模型供应商
          </label>
          <button
            type="button"
            onClick={() => {
              setModelDropdownOpen(false);
              setProviderDropdownOpen((v) => !v);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm outline-none transition",
              getDialogInputClass(themeMode),
              providerDropdownOpen && (isDark ? "ring-1 ring-white/20" : "ring-1 ring-slate-300/80"),
            )}
          >
            <span className="flex items-center gap-2.5">
              <ProviderIcon providerKey={activeProvider} isDark={isDark} />
              <span>{providerLabel}</span>
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isDark ? "text-white/40" : "text-slate-400",
              providerDropdownOpen && "rotate-180",
            )} />
          </button>

          {providerDropdownOpen && (
            <DropdownPanel isDark={isDark}>
              {AI_PROVIDERS.map((provider, index) => {
                const isActive = activeProvider === String(index);
                return (
                  <DropdownItem
                    key={index}
                    isActive={isActive}
                    isDark={isDark}
                    onClick={() => handleProviderChange(String(index))}
                  >
                    <ProviderIcon providerKey={String(index)} isDark={isDark} />
                    <span className="font-medium">{provider.label}</span>
                  </DropdownItem>
                );
              })}
              <DropdownDivider isDark={isDark} />
              <DropdownItem
                isActive={isCustom}
                isDark={isDark}
                onClick={() => handleProviderChange(AI_CUSTOM_PROVIDER_KEY)}
              >
                <span className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                  isDark ? "bg-white/8" : "bg-slate-100",
                )}>
                  <Globe className="h-3 w-3" />
                </span>
                <span className="font-medium">自定义</span>
              </DropdownItem>
            </DropdownPanel>
          )}
        </div>

        {/* ② 具体模型下拉框（仅预设供应商时显示） */}
        {!isCustom && providerModels.length > 0 && (
          <div ref={modelRef} className="relative">
            <label className={cn("mb-1.5 block text-sm", isDark ? "text-white/75" : "text-slate-600")}>
              模型类型
            </label>
            <button
              type="button"
              onClick={() => {
                setProviderDropdownOpen(false);
                setModelDropdownOpen((v) => !v);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm outline-none transition",
                getDialogInputClass(themeMode),
                modelDropdownOpen && (isDark ? "ring-1 ring-white/20" : "ring-1 ring-slate-300/80"),
              )}
            >
              <span className="truncate">{aiModel || "选择模型"}</span>
              <ChevronDown className={cn(
                "ml-2 h-4 w-4 shrink-0 transition-transform duration-200",
                isDark ? "text-white/40" : "text-slate-400",
                modelDropdownOpen && "rotate-180",
              )} />
            </button>

            {modelDropdownOpen && (
              <DropdownPanel isDark={isDark}>
                {providerModels.map((model) => {
                  const isActive = aiModel === model;
                  return (
                    <DropdownItem
                      key={model}
                      isActive={isActive}
                      isDark={isDark}
                      onClick={() => handleModelChange(model)}
                    >
                      <span className={cn("flex-1 truncate", isActive && "font-medium")}>{model}</span>
                    </DropdownItem>
                  );
                })}
              </DropdownPanel>
            )}
          </div>
        )}

        {/* ③ API Key（始终显示） */}
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
          {aiApiKeyMasked && (
            <p className={cn("mt-1.5 text-xs", isDark ? "text-white/40" : "text-slate-400")}>
              当前已配置密钥。如需修改请输入新的完整密钥，留空则保持不变。
            </p>
          )}
        </div>

        {/* ④ 自定义模型：Base URL + 模型名称 */}
        {isCustom && (
          <>
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
                placeholder="例如 my-model-v2"
                className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", getDialogInputClass(themeMode))}
              />
            </div>
          </>
        )}

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
          {aiTestResult === "success" && (
            <span className={cn("flex items-center gap-1.5 text-sm", isDark ? "text-emerald-400" : "text-emerald-600")}>
              <CircleCheckBig className="h-4 w-4" /> 连接成功
            </span>
          )}
          {aiTestResult === "error" && (
            <span className={cn("flex items-center gap-1.5 text-sm", isDark ? "text-rose-400" : "text-rose-600")}>
              <CircleAlert className="h-4 w-4" /> 连接失败，请检查配置
            </span>
          )}
        </div>
      </div>
    </section>
  );
}

/* ========== 通用下拉组件 ========== */

/** 下拉面板容器 */
function DropdownPanel({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      "absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border py-1 shadow-xl outline-none",
      isDark
        ? "border-white/12 bg-[#162032]/98 backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.4)]"
        : "border-slate-200/60 bg-white/98 backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.08)]",
    )}>
      {children}
    </div>
  );
}

/** 下拉选项 */
function DropdownItem({ isActive, isDark, onClick, children }: {
  isActive: boolean; isDark: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
        isActive
          ? isDark ? "bg-white/14 text-white" : "bg-slate-100/90 text-slate-900"
          : isDark ? "text-white/85 hover:bg-white/12" : "text-slate-700 hover:bg-slate-100/80",
      )}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2">{children}</div>
      {isActive && <Check className={cn("h-4 w-4 shrink-0", isDark ? "text-white/60" : "text-slate-500")} />}
    </button>
  );
}

/** 下拉分隔线 */
function DropdownDivider({ isDark }: { isDark: boolean }) {
  return <div className={cn("mx-3 my-1 border-t", isDark ? "border-white/8" : "border-slate-200/60")} />;
}

/* ========== 供应商图标 ========== */

function ProviderIcon({ providerKey, isDark }: { providerKey: string; isDark: boolean }) {
  if (providerKey === AI_CUSTOM_PROVIDER_KEY) {
    return (
      <span className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
        isDark ? "bg-white/8" : "bg-slate-100",
      )}>
        <Globe className="h-3 w-3" />
      </span>
    );
  }

  const provider = AI_PROVIDERS[Number(providerKey)];
  if (!provider) return null;
  const iconColor = isDark ? "text-white/80" : "text-slate-700";

  switch (provider.label) {
    case "DeepSeek":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M23.482 6.702C22.12 4.572 20.168 2.956 17.828 1.918A11.87 11.87 0 0 0 12.676.628a11.78 11.78 0 0 0-5.328.83A11.93 11.93 0 0 0 2.86 4.826 11.83 11.83 0 0 0 .266 9.686a11.78 11.78 0 0 0 .04 5.454 11.85 11.85 0 0 0 2.672 4.764 11.94 11.94 0 0 0 4.576 3.054c.296.108.592.2.888.28.336.092.58-.08.58-.396v-1.528c0-.36-.064-.588-.208-.76-.144-.172-.352-.26-.668-.284a6.4 6.4 0 0 1-2.14-.568 5.6 5.6 0 0 1-1.728-1.312 5.92 5.92 0 0 1-1.08-1.88 6.5 6.5 0 0 1-.384-2.228 6.3 6.3 0 0 1 .872-3.276 6.08 6.08 0 0 1 2.38-2.248A6.5 6.5 0 0 1 8.992 8.3a6.6 6.6 0 0 1 3.148.788 6.06 6.06 0 0 1 2.292 2.18 6.4 6.4 0 0 1 .908 3.14c.02.68-.064 1.348-.248 1.992a6.2 6.2 0 0 1-.78 1.732l-.048.072a.28.28 0 0 1-.392.068l-2.42-1.612a.32.32 0 0 1-.14-.268V12.42a.32.32 0 0 1 .14-.264l2.16-1.452a.28.28 0 0 0 .084-.392 3.6 3.6 0 0 0-.672-.68 3.4 3.4 0 0 0-.96-.548 3.3 3.3 0 0 0-2.252 0 3.4 3.4 0 0 0-1.448.964 3.52 3.52 0 0 0-.792 1.536 3.6 3.6 0 0 0-.02 1.688c.16.548.44 1.04.82 1.444a3.5 3.5 0 0 0 1.392.944 3.3 3.3 0 0 0 1.66.128c.232-.044.4-.06.54.036.14.096.208.268.208.54v2.028c0 .24-.108.42-.312.5a8.4 8.4 0 0 1-2.876.24 8.1 8.1 0 0 1-3.048-.848 8.3 8.3 0 0 1-2.42-1.864 8.5 8.5 0 0 1-1.576-2.672 8.6 8.6 0 0 1-.536-3.076 8.4 8.4 0 0 1 .72-3.44A8.5 8.5 0 0 1 5.2 5.674a8.7 8.7 0 0 1 3.048-1.544 8.8 8.8 0 0 1 3.488-.224 8.6 8.6 0 0 1 3.26 1.272 8.4 8.4 0 0 1 2.368 2.44 8.3 8.3 0 0 1 1.152 3.18 8.2 8.2 0 0 1-.128 3.392 8.3 8.3 0 0 1-1.56 2.976.32.32 0 0 1-.452.032l-1.124-.96a.28.28 0 0 1-.032-.4 5.4 5.4 0 0 0 .96-2.028 5.5 5.5 0 0 0 .084-2.28 5.4 5.4 0 0 0-.78-2.076 5.3 5.3 0 0 0-1.54-1.6 5.2 5.2 0 0 0-2.104-.852 5.3 5.3 0 0 0-2.288.088 5.2 5.2 0 0 0-1.98 1.092 5.3 5.3 0 0 0-1.276 1.876 5.4 5.4 0 0 0-.46 2.316 5.4 5.4 0 0 0 .424 2.128 5.2 5.2 0 0 0 1.196 1.732.28.28 0 0 0 .4-.012l1.272-1.352a.32.32 0 0 0 .012-.412 2.8 2.8 0 0 1-.508-1.636 2.8 2.8 0 0 1 .796-2.04 2.7 2.7 0 0 1 1.952-.82 2.7 2.7 0 0 1 1.96.784l1.636 1.096c.18.12.28.28.28.48v3.028c0 .16-.08.32-.24.44l-2.98 2.004c-.16.108-.36.128-.54.064a9 9 0 0 1-2.292-1.14A9.1 9.1 0 0 1 4.896 18a9.3 9.3 0 0 1-1.488-2.508A9.4 9.4 0 0 1 2.864 12.6a9.3 9.3 0 0 1 .856-3.828A9.2 9.2 0 0 1 6.192 5.64 9.4 9.4 0 0 1 9.96 3.764a9.5 9.5 0 0 1 4.16-.164 9.3 9.3 0 0 1 3.832 1.644A9.1 9.1 0 0 1 20.72 8.42a9 9 0 0 1 1.248 3.668 9 9 0 0 1-.368 3.824 9.1 9.1 0 0 1-1.856 3.268.28.28 0 0 0 .02.396l1.08.916a.32.32 0 0 0 .456-.02 11 11 0 0 0 2.16-3.82 10.8 10.8 0 0 0 .44-4.468 10.7 10.7 0 0 0-1.478-4.472z"/>
          </svg>
        </span>
      );

    case "OpenAI":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
          </svg>
        </span>
      );

    case "GLM (智谱)":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.07-1.38l-2.54-2.54A5.98 5.98 0 0 1 7.26 9.37a5.99 5.99 0 0 1 11.22-1.61h-4.01v2h6.5V5.26h-2v2.72A8 8 0 0 0 12 4a8 8 0 1 0 0 16c2.6 0 4.92-1.25 6.39-3.18l2.54 2.54A11.96 11.96 0 0 1 12 24C5.37 24 0 18.63 0 12S5.37 0 12 0c1.98 0 3.84.48 5.49 1.34l-1.29 1.29A9.94 9.94 0 0 0 12 2z"/>
          </svg>
        </span>
      );

    case "Kimi (月之暗面)":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.82C12.92 3.04 12.46 3 12 3z"/>
          </svg>
        </span>
      );

    case "Qwen (通义千问)":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 2a10 10 0 0 0-7.45 16.66l-1.95 1.95a1 1 0 1 0 1.41 1.42l1.95-1.95A10 10 0 1 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm4.95-3.54a1 1 0 0 1-1.41 0l-1.83-1.83a4.98 4.98 0 1 1 1.41-1.41l1.83 1.83a1 1 0 0 1 0 1.41zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
          </svg>
        </span>
      );

    case "Doubao (豆包)":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm1 14h-2v-1h2v1zm0-2h-2v-1h2v1zm-1-2c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zM9 20h6v1c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-1z"/>
          </svg>
        </span>
      );

    case "Anthropic (Claude)":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M17.304 3.541l-5.758 16.918H14.28l5.758-16.918h-2.734zM6.696 3.541L.938 20.459h2.734L9.43 3.541H6.696z"/>
          </svg>
        </span>
      );

    case "Google (Gemini)":
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", iconColor)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M12 2a1.53 1.53 0 0 0-1.46 1.06L8.58 9.82a.47.47 0 0 1-.3.3l-6.76 1.96A1.53 1.53 0 0 0 .64 13.88a1.53 1.53 0 0 0 .88 1.83l6.76 1.96a.47.47 0 0 1 .3.3l1.96 6.76a1.53 1.53 0 0 0 2.92 0l1.96-6.76a.47.47 0 0 1 .3-.3l6.76-1.96a1.53 1.53 0 0 0 0-2.92l-6.76-1.96a.47.47 0 0 1-.3-.3l-1.96-6.76A1.53 1.53 0 0 0 12 2z"/>
          </svg>
        </span>
      );

    default:
      return (
        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md", isDark ? "bg-white/8" : "bg-slate-100")}>
          <Bot className="h-3 w-3" />
        </span>
      );
  }
}
