/**
 * OAuth 第三方登录配置面板
 * @description 管理各 OAuth 供应商的启用/配置
 * - 字段变更即时保存（掩码密钥自动保留原值）
 * - 保存和测试相互独立
 * - 启用供应商仅需已保存数据完整，无需强制测试通过
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Shield, LoaderCircle, Eye, EyeOff, Link, Check, AlertTriangle, Save } from "lucide-react";
import { requestJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import {
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogInputClass,
} from "@/components/sakura-nav/style-helpers";
import type { ThemeMode } from "@/lib/base/types";
import { OAUTH_PROVIDERS } from "@/lib/base/types";
import { OAuthProviderIcon } from "@/components/auth/oauth-provider-icon";

type ProviderConfig = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  appId?: string;
  appSecret?: string;
  corpId?: string;
  agentId?: string;
  appKey?: string;
  secret?: string;
};

type TestStatus = "idle" | "testing" | "success" | "error";

type OAuthConfigPanelProps = {
  themeMode: ThemeMode;
};

/** 各供应商的配置字段定义 */
const PROVIDER_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; secret?: boolean; required?: boolean }>> = {
  github: [
    { key: "clientId", label: "Client ID", placeholder: "GitHub OAuth App 的 Client ID", required: true },
    { key: "clientSecret", label: "Client Secret", placeholder: "GitHub OAuth App 的 Client Secret", secret: true, required: true },
  ],
  wechat: [
    { key: "appId", label: "AppID", placeholder: "微信开放平台的应用 AppID", required: true },
    { key: "appSecret", label: "AppSecret", placeholder: "微信开放平台的应用 AppSecret", secret: true, required: true },
  ],
  wecom: [
    { key: "corpId", label: "Corp ID (企业 ID)", placeholder: "企业微信管理后台的企业 ID", required: true },
    { key: "agentId", label: "Agent ID", placeholder: "自建应用的 AgentId", required: true },
    { key: "secret", label: "Secret", placeholder: "自建应用的 Secret", secret: true, required: true },
  ],
  feishu: [
    { key: "appId", label: "App ID", placeholder: "飞书开放平台的应用 App ID", required: true },
    { key: "appSecret", label: "App Secret", placeholder: "飞书开放平台的应用 App Secret", secret: true, required: true },
  ],
  dingtalk: [
    { key: "appKey", label: "App Key (Client ID)", placeholder: "钉钉开放平台的应用 AppKey", required: true },
    { key: "appSecret", label: "App Secret (Client Secret)", placeholder: "钉钉开放平台的应用 AppSecret", secret: true, required: true },
  ],
};

const DEFAULTS: ProviderConfig = {
  enabled: false, clientId: "", clientSecret: "",
  appId: "", appSecret: "", corpId: "", agentId: "", appKey: "", secret: "",
};

/** 标准化 URL：自动补全 https:// 前缀，去除尾部斜杠 */
function normalizeBaseUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";
  url = url.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

/** 检查必填字段是否都已填写 */
function isRequiredFieldsFilled(providerKey: string, config: ProviderConfig): boolean {
  const fields = PROVIDER_FIELDS[providerKey] ?? [];
  return fields.filter((f) => f.required).every((f) => !!((config as unknown as Record<string, string>)[f.key]?.trim()));
}

/** 判断值是否为掩码 */
function isMasked(value: string | undefined): boolean {
  return !!value && value.startsWith("****");
}

export function OAuthConfigPanel({ themeMode }: OAuthConfigPanelProps) {
  const isDark = themeMode === "dark";
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  // 基础 URL
  const [savedBaseUrl, setSavedBaseUrl] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");

  // 保存反馈（按供应商 key 记录）
  const [savedProvider, setSavedProvider] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 复制按钮反馈
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 测试弹窗
  const [testProvider, setTestProvider] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");

  // 保存中标记（防重入）
  const savingRef = useRef(false);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // 初始化加载配置
  const loadedRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (loadedRef.current == null) {
      loadedRef.current = (async () => {
        try {
          const data = await requestJson<{
            configs: Record<string, ProviderConfig>;
            baseUrl?: string;
          }>("/api/admin/oauth");
          const filled: Record<string, ProviderConfig> = {};
          for (const p of OAUTH_PROVIDERS) {
            const saved = data.configs[p.key] as Partial<ProviderConfig> | undefined;
            filled[p.key] = { ...DEFAULTS, ...saved };
          }
          setConfigs(filled);
          const url = data.baseUrl ?? "";
          if (url) { setSavedBaseUrl(url); setBaseUrlInput(url); }
        } catch { /* ignore */ }
        setLoading(false);
      })();
    }
  }, []);

  /** 即时保存所有配置到服务端 */
  const saveToServer = useCallback(async (newConfigs: Record<string, ProviderConfig>, newBaseUrl?: string): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    try {
      const body: Record<string, unknown> = { configs: newConfigs };
      if (newBaseUrl !== undefined) body.baseUrl = newBaseUrl;
      const res = await requestJson<{ ok?: boolean }>("/api/admin/oauth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok !== false;
    } catch {
      return false;
    } finally {
      savingRef.current = false;
    }
  }, []);

  /** 更新配置字段并即时保存 */
  function updateConfig(provider: string, field: string, value: string | boolean) {
    setConfigs((prev) => {
      const updated = { ...prev, [provider]: { ...prev[provider], [field]: value } };
      void saveToServer(updated, savedBaseUrl || undefined);
      return updated;
    });
  }

  /** 手动保存按钮 — 保存后短暂显示反馈 */
  async function handleSave(providerKey: string) {
    const ok = await saveToServer({ [providerKey]: configs[providerKey] } as Record<string, ProviderConfig>, savedBaseUrl || undefined);
    if (ok) {
      setSavedProvider(providerKey);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedProvider(null), 2000);
    }
  }

  /** 基础 URL 失焦时自动保存 */
  function handleBaseUrlBlur() {
    const normalized = normalizeBaseUrl(baseUrlInput);
    if (normalized !== savedBaseUrl) {
      if (normalized) {
        setSavedBaseUrl(normalized);
        setBaseUrlInput(normalized);
        void saveToServer(configs, normalized);
      } else if (!baseUrlInput.trim()) {
        setSavedBaseUrl("");
        void saveToServer(configs, "");
      }
    }
  }

  /** 复制回调地址并显示反馈 */
  function handleCopyCallback(providerKey: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedProvider(providerKey);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedProvider(null), 2000);
  }

  /** 尝试切换供应商启用状态 — 基于已保存数据判断 */
  function handleToggleProvider(providerKey: string, currentEnabled: boolean) {
    const config = configs[providerKey];
    if (!currentEnabled) {
      // 要开启：必须有基础 URL + 必填字段
      if (!savedBaseUrl) { setExpandedProvider(providerKey); return; }
      if (!isRequiredFieldsFilled(providerKey, config)) {
        setExpandedProvider(providerKey);
        return;
      }
      // 数据完整即可开启
      setConfigs((prev) => {
        const updated = { ...prev, [providerKey]: { ...prev[providerKey], enabled: true } };
        void saveToServer(updated);
        return updated;
      });
    } else {
      // 关闭
      setConfigs((prev) => {
        const updated = { ...prev, [providerKey]: { ...prev[providerKey], enabled: false } };
        void saveToServer(updated);
        return updated;
      });
    }
  }

  /** 测试连通性 — 只传 provider，服务端从数据库读取真实配置 */
  async function handleTestProvider(providerKey: string) {
    setTestProvider(providerKey);
    setTestStatus("testing");
    setTestMessage("正在测试连通性...");
    try {
      const res = await requestJson<{ ok: boolean; message?: string }>("/api/admin/oauth/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerKey }),
      });
      if (res.ok) {
        setTestStatus("success");
        setTestMessage(res.message ?? "测试通过！该第三方登录可正常使用。");
      } else {
        setTestStatus("error");
        setTestMessage(res.message ?? "测试失败，请检查配置信息是否正确。");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(`测试失败：${err instanceof Error ? err.message : "网络错误，请重试"}`);
    }
  }

  function closeTestDialog() {
    setTestProvider(null);
    setTestStatus("idle");
    setTestMessage("");
  }

  function toggleSecretVisibility(key: string) {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className={cn("h-6 w-6 animate-spin", isDark ? "text-white/40" : "text-slate-400")} />
      </div>
    );
  }

  const callbackBasePath = "/api/auth/oauth";
  const liveBaseUrl = normalizeBaseUrl(baseUrlInput);

  return (
    <div className="space-y-6">
      {/* 全局提示 */}
      <div className={cn(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        isDark ? "border-teal-500/25 bg-teal-500/8 text-teal-200/90" : "border-teal-300/50 bg-teal-50 text-teal-700",
      )}>
        <Shield className="mt-0.5 h-4 w-4 shrink-0" />
        <span>配置第三方登录后，用户可以在登录页使用对应平台快速登录。各供应商需在第三方平台注册应用并配置回调地址。</span>
      </div>

      {/* 供应商列表 */}
      {OAUTH_PROVIDERS.map((provider) => {
        const config = configs[provider.key] ?? { ...DEFAULTS };
        const fields = PROVIDER_FIELDS[provider.key] ?? [];
        const isExpanded = expandedProvider === provider.key;
        const callbackUrl = liveBaseUrl ? `${liveBaseUrl}${callbackBasePath}/${provider.key}/callback` : "";
        const fieldsFilled = isRequiredFieldsFilled(provider.key, config);
        const canEnable = !!savedBaseUrl && fieldsFilled;
        // 判断是否有掩码密钥（说明已保存过真实值）
        const hasMaskedSecret = fields.some(
          (f) => f.secret && isMasked((config as unknown as Record<string, string>)[f.key]),
        );
        const canTest = hasMaskedSecret || fieldsFilled;

        return (
          <section key={provider.key} className={cn("rounded-[28px] border transition-opacity", getDialogSectionClass(themeMode))}>
            {/* 供应商头部 */}
            <button
              type="button"
              onClick={() => setExpandedProvider(isExpanded ? null : provider.key)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl">
                  <OAuthProviderIcon providerKey={provider.key} size={22} />
                </span>
                <div>
                  <h3 className={cn("text-base font-semibold", isDark ? "text-white/90" : "text-slate-800")}>{provider.label}</h3>
                  <p className={cn("text-xs mt-0.5", getDialogSubtleClass(themeMode))}>
                    {config.enabled ? "已启用" : canEnable ? "已配置，可开启" : "未配置"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleToggleProvider(provider.key, config.enabled); }}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors",
                    config.enabled ? "bg-teal-600" : canEnable ? (isDark ? "bg-white/30" : "bg-slate-300") : (isDark ? "bg-white/10" : "bg-slate-200"),
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    config.enabled ? "left-[22px]" : "left-0.5",
                  )} />
                </button>
                <svg
                  className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180", isDark ? "text-white/40" : "text-slate-400")}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </button>

            {/* 展开配置 */}
            {isExpanded ? (
              <div className={cn("border-t px-5 py-5 space-y-3", isDark ? "border-white/10" : "border-black/8")}>
                {/* 基础 URL 输入 */}
                <div>
                  <label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-white/75" : "text-slate-600")}>
                    导航站基础 URL
                  </label>
                  <div className="relative">
                    <Link className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />
                    <input
                      type="url"
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      onBlur={handleBaseUrlBlur}
                      placeholder="例如：https://nav.example.com"
                      autoComplete="off"
                      className={cn("w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition", getDialogInputClass(themeMode))}
                    />
                  </div>
                  <p className={cn("mt-1.5 text-xs", getDialogSubtleClass(themeMode))}>
                    输入导航站的完整访问地址，自动补全 https://，失焦后自动保存。所有供应商共享此地址。
                  </p>
                </div>

                {/* 回调 URL */}
                {callbackUrl ? (
                  <div>
                    <label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-white/75" : "text-slate-600")}>
                      回调地址 (Callback URL)
                    </label>
                    <div className={cn("flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm", getDialogInputClass(themeMode))}>
                      <code className="flex-1 text-xs break-all opacity-70">{callbackUrl}</code>
                      <button
                        type="button"
                        onClick={() => handleCopyCallback(provider.key, callbackUrl)}
                        className={cn(
                          "shrink-0 text-xs px-2 py-1 rounded-lg transition inline-flex items-center gap-1",
                          copiedProvider === provider.key
                            ? isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                            : isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/8",
                        )}
                      >
                        {copiedProvider === provider.key && <Check className="h-3 w-3" />}
                        {copiedProvider === provider.key ? "已复制" : "复制"}
                      </button>
                    </div>
                    <p className={cn("mt-1.5 text-xs", getDialogSubtleClass(themeMode))}>
                      请将此地址填写到 {provider.label} 开放平台的授权回调页中
                    </p>
                  </div>
                ) : (
                  <div className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
                    isDark ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200",
                  )}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    请先在上方输入导航站基础 URL，回调地址将自动生成。
                  </div>
                )}

                {/* 未填写必填字段提示 */}
                {!fieldsFilled && !hasMaskedSecret && (
                  <div className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
                    isDark ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200",
                  )}>
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    请填写下方所有必填信息并保存后，再开启第三方登录。
                  </div>
                )}

                {/* 供应商特有字段 */}
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-white/75" : "text-slate-600")}>
                      {field.label}{field.required ? <span className="text-red-400 ml-0.5">*</span> : null}
                    </label>
                    <div className="relative">
                      <input
                        type={field.secret && !visibleSecrets.has(`${provider.key}-${field.key}`) ? "password" : "text"}
                        value={(config as unknown as Record<string, string>)[field.key] ?? ""}
                        onChange={(e) => updateConfig(provider.key, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        autoComplete="off"
                        className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", field.secret && "pr-11", getDialogInputClass(themeMode))}
                      />
                      {field.secret ? (
                        <button
                          type="button"
                          onClick={() => toggleSecretVisibility(`${provider.key}-${field.key}`)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                        >
                          {visibleSecrets.has(`${provider.key}-${field.key}`) ? (
                            <EyeOff className={cn("h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />
                          ) : (
                            <Eye className={cn("h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  {/* 保存按钮 */}
                  <button
                    type="button"
                    onClick={() => void handleSave(provider.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
                      savedProvider === provider.key
                        ? isDark ? "bg-emerald-600/60 text-white" : "bg-emerald-600 text-white"
                        : isDark ? "bg-teal-600/80 text-white hover:bg-teal-500/90" : "bg-teal-600 text-white hover:bg-teal-700",
                    )}
                  >
                    {savedProvider === provider.key ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {savedProvider === provider.key ? "已保存" : "保存"}
                  </button>

                  {/* 测试按钮 */}
                  <button
                    type="button"
                    disabled={!canTest}
                    onClick={() => void handleTestProvider(provider.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      isDark ? "bg-white/10 text-white/90 hover:bg-white/15" : "bg-black/5 text-slate-700 hover:bg-black/8",
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    测试连通性
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        );
      })}

      {/* 测试弹窗 */}
      {testProvider ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
          <div className={cn(
            "w-full max-w-sm rounded-3xl border p-8 shadow-2xl backdrop-blur-xl text-center",
            isDark ? "border-white/10 bg-slate-900/95" : "border-black/8 bg-white/95",
          )}>
            <div className="mb-4 flex justify-center">
              <OAuthProviderIcon providerKey={testProvider} size={48} />
            </div>
            <h3 className={cn("mb-2 text-lg font-semibold", isDark ? "text-white/90" : "text-slate-800")}>
              {OAUTH_PROVIDERS.find((p) => p.key === testProvider)?.label ?? testProvider} 连通性测试
            </h3>
            <p className={cn("text-sm mb-4", isDark ? "text-white/60" : "text-slate-500")}>{testMessage}</p>
            {testStatus === "testing" ? (
              <div className="flex justify-center">
                <LoaderCircle className={cn("h-8 w-8 animate-spin", isDark ? "text-teal-400" : "text-teal-600")} />
              </div>
            ) : (
              <button
                type="button"
                onClick={closeTestDialog}
                className={cn(
                  "w-full rounded-2xl px-5 py-3 text-sm font-medium transition",
                  isDark ? "bg-white/10 text-white/90 hover:bg-white/15" : "bg-black/5 text-slate-700 hover:bg-black/8",
                )}
              >
                关闭
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
