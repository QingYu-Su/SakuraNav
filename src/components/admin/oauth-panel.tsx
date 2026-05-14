/**
 * OAuth 第三方登录配置面板
 * @description 管理各 OAuth 供应商的启用/配置
 * - 列表式布局：每个供应商一行，显示状态标签 + 启用/编辑按钮
 * - 编辑弹窗：独立模态窗口，包含完整配置表单
 * - 保存仅持久化，不自动启用；启用需先有已保存的完整配置
 * - 保存前未测试过则提示建议先测试（仅一次）
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Shield, LoaderCircle, Eye, EyeOff, Link, Check, AlertTriangle, Save, Pencil, Power, X } from "lucide-react";
import { requestJson, putJson } from "@/lib/base/api";
import { cn } from "@/lib/utils/utils";
import {
  getDialogSectionClass,
  getDialogSubtleClass,
  getDialogInputClass,
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogPrimaryBtnClass,
  getDialogSecondaryBtnClass,
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

  // 基础 URL（全局共享）
  const [savedBaseUrl, setSavedBaseUrl] = useState("");

  // 编辑弹窗状态
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<ProviderConfig>({ ...DEFAULTS });
  const [editBaseUrl, setEditBaseUrl] = useState("");

  // 弹窗内密钥可见性
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  // 弹窗内测试状态（行内显示）
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");

  // 保存反馈
  const [savedProvider, setSavedProvider] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 复制按钮反馈
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 已测试供应商追踪（用于保存前提示）
  const testedProvidersRef = useRef<Set<string>>(new Set());

  // 测试建议确认弹窗
  const [showTestSuggest, setShowTestSuggest] = useState(false);
  const pendingSaveRef = useRef(false);

  // 未配置启用提示
  const [enableTipProvider, setEnableTipProvider] = useState<string | null>(null);
  const enableTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保存中标记（防重入）
  const savingRef = useRef(false);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (enableTipTimerRef.current) clearTimeout(enableTipTimerRef.current);
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
          if (data.baseUrl) setSavedBaseUrl(data.baseUrl);
        } catch { /* ignore */ }
        setLoading(false);
      })();
    }
  }, []);

  /** 保存配置到服务端（仅持久化，不改变 enabled 状态） */
  const saveConfigToServer = useCallback(async (
    providerKey: string,
    newConfig: ProviderConfig,
    newBaseUrl?: string,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (savingRef.current) return { ok: false };
    savingRef.current = true;
    try {
      // 过滤掉空字符串字段（schema 有 min(1) 约束，空串会校验失败）
      const filtered: Record<string, unknown> = { enabled: newConfig.enabled };
      for (const [k, v] of Object.entries(newConfig)) {
        if (k === "enabled") continue;
        if (typeof v === "string" && v.trim() !== "") filtered[k] = v;
      }
      const body: Record<string, unknown> = { configs: { [providerKey]: filtered } };
      if (newBaseUrl !== undefined) body.baseUrl = newBaseUrl;
      const res = await requestJson<{ ok?: boolean }>("/api/admin/oauth", putJson(body));
      return { ok: res.ok !== false };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "保存失败" };
    } finally {
      savingRef.current = false;
    }
  }, []);

  /** 切换启用/禁用 */
  function handleToggleEnabled(providerKey: string) {
    const config = configs[providerKey];
    if (config.enabled) {
      // 当前已启用 → 直接禁用
      setConfigs((prev) => {
        const updated = { ...prev, [providerKey]: { ...prev[providerKey], enabled: false } };
        void saveConfigToServer(providerKey, updated[providerKey]);
        return updated;
      });
    } else {
      // 当前禁用 → 检查是否已有完整已保存配置
      const fieldsFilled = isRequiredFieldsFilled(providerKey, config);
      const fields = PROVIDER_FIELDS[providerKey] ?? [];
      const hasMaskedSecret = fields.some(
        (f) => f.secret && isMasked((config as unknown as Record<string, string>)[f.key]),
      );
      if (!fieldsFilled && !hasMaskedSecret) {
        // 未配置完整 → 提示
        setEnableTipProvider(providerKey);
        if (enableTipTimerRef.current) clearTimeout(enableTipTimerRef.current);
        enableTipTimerRef.current = setTimeout(() => setEnableTipProvider(null), 2500);
        return;
      }
      setConfigs((prev) => {
        const updated = { ...prev, [providerKey]: { ...prev[providerKey], enabled: true } };
        void saveConfigToServer(providerKey, updated[providerKey]);
        return updated;
      });
    }
  }

  /** 打开编辑弹窗 */
  function handleOpenEdit(providerKey: string) {
    const config = configs[providerKey] ?? { ...DEFAULTS };
    setEditingProvider(providerKey);
    setEditConfig({ ...config });
    setEditBaseUrl(savedBaseUrl);
    setVisibleSecrets(new Set());
    setTestStatus("idle");
    setTestMessage("");
    setShowTestSuggest(false);
    pendingSaveRef.current = false;
  }

  /** 关闭编辑弹窗 */
  function handleCloseEdit() {
    setEditingProvider(null);
    setTestStatus("idle");
    setTestMessage("");
    setShowTestSuggest(false);
  }

  /** 弹窗内编辑字段 */
  function handleEditField(field: string, value: string) {
    setEditConfig((prev) => ({ ...prev, [field]: value }));
  }

  /** 弹窗内测试连通性 */
  async function handleTestInDialog(providerKey: string) {
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

  /** 保存编辑弹窗配置（仅持久化） */
  async function handleSaveEdit(providerKey: string) {
    const normalized = normalizeBaseUrl(editBaseUrl);
    const result = await saveConfigToServer(providerKey, editConfig, normalized || undefined);
    if (result.ok) {
      // 更新全局状态
      setConfigs((prev) => ({ ...prev, [providerKey]: { ...editConfig } }));
      if (normalized) setSavedBaseUrl(normalized);
      setSavedProvider(providerKey);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedProvider(null), 2000);
      handleCloseEdit();
    } else {
      setTestStatus("error");
      setTestMessage(result.error ?? "保存失败，请重试。");
    }
  }

  /** 点击保存按钮入口 */
  function handleClickSave(providerKey: string) {
    // 如果未测试过且不是二次确认，弹出建议
    if (!testedProvidersRef.current.has(providerKey) && !pendingSaveRef.current) {
      setShowTestSuggest(true);
      return;
    }
    pendingSaveRef.current = false;
    setShowTestSuggest(false);
    void handleSaveEdit(providerKey);
  }

  /** 测试建议弹窗 → 仍然保存 */
  function handleConfirmSaveAnyway(providerKey: string) {
    testedProvidersRef.current.add(providerKey);
    pendingSaveRef.current = true;
    setShowTestSuggest(false);
    handleClickSave(providerKey);
  }

  /** 测试建议弹窗 → 先去测试 */
  function handleDismissTestSuggest() {
    setShowTestSuggest(false);
    pendingSaveRef.current = false;
  }

  /** 复制回调地址 */
  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopiedKey(null), 2000);
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

  return (
    <div className="space-y-4">
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
        const isTipVisible = enableTipProvider === provider.key;

        return (
          <section key={provider.key} className={cn("rounded-[28px] border transition-opacity", getDialogSectionClass(themeMode))}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 max-sm:px-4">
              {/* 左侧：图标 + 名称 + 状态标签 */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl max-sm:h-8 max-sm:w-8">
                  <OAuthProviderIcon providerKey={provider.key} size={22} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className={cn("text-sm font-semibold truncate", isDark ? "text-white/90" : "text-slate-800")}>
                      {provider.label}
                    </h3>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
                      config.enabled
                        ? isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-500/10 text-emerald-600"
                        : isDark ? "bg-red-500/15 text-red-400" : "bg-red-500/10 text-red-600",
                    )}>
                      {config.enabled ? "已启用" : "已禁用"}
                    </span>
                  </div>
                  {isTipVisible && (
                    <p className="text-xs mt-1 text-amber-500">
                      请先编辑并保存配置后再启用
                    </p>
                  )}
                </div>
              </div>

              {/* 右侧：启用/禁用按钮 + 编辑按钮 */}
              <div className="flex items-center gap-2 shrink-0 max-sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleEnabled(provider.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition max-sm:px-2.5 max-sm:py-1.5",
                    config.enabled
                      ? isDark ? "bg-red-500/12 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-600 hover:bg-red-100"
                      : isDark ? "bg-emerald-500/12 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
                  )}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span className="max-sm:hidden">{config.enabled ? "禁用" : "启用"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(provider.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition max-sm:px-2.5 max-sm:py-1.5",
                    isDark ? "bg-white/8 text-white/80 hover:bg-white/14" : "bg-black/5 text-slate-600 hover:bg-black/8",
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="max-sm:hidden">编辑</span>
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {/* ============ 编辑弹窗 ============ */}
      {editingProvider && (() => {
        const provider = OAUTH_PROVIDERS.find((p) => p.key === editingProvider)!;
        const fields = PROVIDER_FIELDS[editingProvider] ?? [];
        const liveBaseUrl = normalizeBaseUrl(editBaseUrl);
        const callbackUrl = liveBaseUrl ? `${liveBaseUrl}${callbackBasePath}/${editingProvider}/callback` : "";
        const fieldsFilled = isRequiredFieldsFilled(editingProvider, editConfig);

        return (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden rounded-[28px]" onClick={handleCloseEdit}>
              <div className={cn("absolute inset-0", getDialogOverlayClass(themeMode))} />
            </div>
            <div className={cn(
              "relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border p-6 shadow-2xl",
              getDialogPanelClass(themeMode),
            )}>
              {/* 顶部标题 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl">
                    <OAuthProviderIcon providerKey={editingProvider} size={28} />
                  </span>
                  <div>
                    <h2 className={cn("text-base font-semibold", isDark ? "text-white/90" : "text-slate-800")}>
                      {provider.label} 登录配置
                    </h2>
                    <p className={cn("text-xs mt-0.5", getDialogSubtleClass(themeMode))}>
                      配置 {provider.label} OAuth 应用凭证
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className={cn("rounded-xl p-2 transition", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                >
                  <X className={cn("h-5 w-5", isDark ? "text-white/50" : "text-slate-400")} />
                </button>
              </div>

              {/* 基础 URL */}
              <div className="mb-4">
                <label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-white/75" : "text-slate-600")}>
                  导航站基础 URL
                </label>
                <div className="relative">
                  <Link className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />
                  <input
                    type="url"
                    value={editBaseUrl}
                    onChange={(e) => setEditBaseUrl(e.target.value)}
                    placeholder="例如：https://nav.example.com"
                    autoComplete="off"
                    className={cn("w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition", getDialogInputClass(themeMode))}
                  />
                </div>
                <p className={cn("mt-1.5 text-xs", getDialogSubtleClass(themeMode))}>
                  输入导航站的完整访问地址，自动补全 https://。所有供应商共享此地址。
                </p>
              </div>

              {/* 回调 URL */}
              {callbackUrl ? (
                <div className="mb-4">
                  <label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-white/75" : "text-slate-600")}>
                    回调地址 (Callback URL)
                  </label>
                  <div className={cn("flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm", getDialogInputClass(themeMode))}>
                    <code className="flex-1 text-xs break-all opacity-70">{callbackUrl}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(callbackUrl, editingProvider)}
                      className={cn(
                        "shrink-0 text-xs px-2 py-1 rounded-lg transition inline-flex items-center gap-1",
                        copiedKey === editingProvider
                          ? isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                          : isDark ? "bg-white/10 hover:bg-white/15" : "bg-black/5 hover:bg-black/8",
                      )}
                    >
                      {copiedKey === editingProvider && <Check className="h-3 w-3" />}
                      {copiedKey === editingProvider ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className={cn("mt-1.5 text-xs", getDialogSubtleClass(themeMode))}>
                    请将此地址填写到 {provider.label} 开放平台的授权回调页中
                  </p>
                </div>
              ) : (
                <div className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-xs mb-4",
                  isDark ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-amber-50 text-amber-700 border border-amber-200",
                )}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  请先输入导航站基础 URL，回调地址将自动生成。
                </div>
              )}

              {/* 供应商配置字段 */}
              {fields.map((field) => (
                <div key={field.key} className="mb-3">
                  <label className={cn("mb-1.5 block text-sm font-medium", isDark ? "text-white/75" : "text-slate-600")}>
                    {field.label}{field.required ? <span className="text-red-400 ml-0.5">*</span> : null}
                  </label>
                  <div className="relative">
                    <input
                      type={field.secret && !visibleSecrets.has(`${editingProvider}-${field.key}`) ? "password" : "text"}
                      value={(editConfig as unknown as Record<string, string>)[field.key] ?? ""}
                      onChange={(e) => handleEditField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      className={cn("w-full rounded-2xl border px-4 py-3 text-sm outline-none", field.secret && "pr-11", getDialogInputClass(themeMode))}
                    />
                    {field.secret ? (
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility(`${editingProvider}-${field.key}`)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 transition"
                      >
                        {visibleSecrets.has(`${editingProvider}-${field.key}`) ? (
                          <EyeOff className={cn("h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />
                        ) : (
                          <Eye className={cn("h-4 w-4", isDark ? "text-white/40" : "text-slate-400")} />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}

              {/* 测试结果行内提示 */}
              {testStatus !== "idle" && (
                <div className={cn(
                  "mb-4 rounded-xl px-3 py-2.5 text-xs",
                  testStatus === "testing"
                    ? isDark ? "bg-white/6 text-white/60" : "bg-slate-100 text-slate-500"
                    : testStatus === "success"
                      ? isDark ? "bg-emerald-500/12 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                      : isDark ? "bg-red-500/12 text-red-300" : "bg-red-50 text-red-700",
                )}>
                  <div className="flex items-center gap-2">
                    {testStatus === "testing" && <LoaderCircle className="h-3.5 w-3.5 animate-spin shrink-0" />}
                    {testStatus === "success" && <Check className="h-3.5 w-3.5 shrink-0" />}
                    {testStatus === "error" && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                    <span>{testMessage}</span>
                  </div>
                </div>
              )}

              {/* 底部操作按钮 */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={!fieldsFilled && testStatus !== "success"}
                  onClick={() => void handleTestInDialog(editingProvider)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    isDark ? "bg-white/10 text-white/90 hover:bg-white/15" : "bg-black/5 text-slate-700 hover:bg-black/8",
                  )}
                >
                  {testStatus === "testing" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  测试
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={!fieldsFilled}
                    onClick={() => handleClickSave(editingProvider)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      savedProvider === editingProvider
                        ? isDark ? "bg-emerald-600/60 text-white" : "bg-emerald-600 text-white"
                        : getDialogPrimaryBtnClass(themeMode),
                    )}
                  >
                    {savedProvider === editingProvider ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {savedProvider === editingProvider ? "已保存" : "保存"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseEdit}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                      getDialogSecondaryBtnClass(themeMode),
                    )}
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ 测试建议确认弹窗 ============ */}
      {showTestSuggest && editingProvider && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden rounded-[28px]" onClick={handleDismissTestSuggest}>
              <div className={cn("absolute inset-0", getDialogOverlayClass(themeMode))} />
            </div>
          <div className={cn(
            "relative w-full max-w-sm rounded-3xl border p-6 shadow-2xl",
            getDialogPanelClass(themeMode),
          )}>
            <div className="flex items-center gap-3 mb-3">
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                isDark ? "bg-amber-500/15" : "bg-amber-50",
              )}>
                <AlertTriangle className={cn("h-5 w-5", isDark ? "text-amber-400" : "text-amber-600")} />
              </span>
              <h3 className={cn("text-base font-semibold", isDark ? "text-white/90" : "text-slate-800")}>
                建议先测试连通性
              </h3>
            </div>
            <p className={cn("text-sm mb-5", getDialogSubtleClass(themeMode))}>
              您尚未测试该供应商的连通性。如果配置有误，可能导致用户无法使用第三方登录。建议先进行测试确认配置正确。
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleConfirmSaveAnyway(editingProvider)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                  getDialogPrimaryBtnClass(themeMode),
                )}
              >
                仍然保存
              </button>
              <button
                type="button"
                onClick={handleDismissTestSuggest}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
                  getDialogSecondaryBtnClass(themeMode),
                )}
              >
                先去测试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
