/**
 * 访问令牌 Tab 组件
 * @description 令牌列表、创建弹窗、创建成功弹窗、删除确认弹窗
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  Trash2,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import type { ApiTokenListItem, ApiTokenExpiresIn } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";

/* ========== 公共类型 ========== */

type Colors = {
  primaryText: string;
  secondaryText: string;
  tertiaryText: string;
  mutedText: string;
  faintText: string;
  subtleText: string;
  cardBg: string;
  inputBg: string;
  inputBgFocus: string;
  border: string;
  borderFocus: string;
  iconMuted: string;
  isDark: boolean;
};

/* ========== 令牌 Tab 主组件 ========== */

export function TokenTab({ colors }: { colors: Colors }) {
  const [tokens, setTokens] = useState<ApiTokenListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 创建弹窗
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createExpires, setCreateExpires] = useState<ApiTokenExpiresIn>("90d");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // 自定义下拉框
  const [expiresOpen, setExpiresOpen] = useState(false);
  const expiresRef = useRef<HTMLDivElement>(null);

  const expiresOptions: { value: ApiTokenExpiresIn; label: string }[] = [
    { value: "30d", label: "1 个月" },
    { value: "90d", label: "90 天" },
    { value: "1y", label: "1 年" },
    { value: "never", label: "永不过期" },
  ];

  const selectedLabel = expiresOptions.find((o) => o.value === createExpires)?.label ?? "";

  // 创建成功弹窗
  const [successOpen, setSuccessOpen] = useState(false);
  const [successToken, setSuccessToken] = useState("");
  const [successCopied, setSuccessCopied] = useState(false);

  // 删除确认弹窗
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const list = await requestJson<ApiTokenListItem[]>("/api/user/tokens");
      setTokens(list);
    } catch {
      // 未授权会在 profile 层处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (expiresRef.current && !expiresRef.current.contains(e.target as Node)) {
        setExpiresOpen(false);
      }
    }
    if (expiresOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expiresOpen]);

  /** 创建令牌 */
  async function handleCreate() {
    if (!createName.trim()) {
      setCreateError("请输入令牌名称");
      return;
    }
    setCreateError("");
    setCreateSaving(true);
    try {
      const result = await requestJson<{
        id: string;
        name: string;
        tokenSuffix: string;
        token: string;
        expiresAt: string | null;
        createdAt: string;
      }>("/api/user/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim(), expiresIn: createExpires }),
      });
      setCreateOpen(false);
      setCreateName("");
      setCreateExpires("90d");
      setSuccessToken(result.token);
      setSuccessCopied(false);
      setSuccessOpen(true);
      void fetchTokens();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreateSaving(false);
    }
  }

  /** 删除令牌 */
  async function handleDelete() {
    if (!deleteId) return;
    setDeleteBusy(true);
    try {
      await requestJson(`/api/user/tokens/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      void fetchTokens();
    } catch {
      // 忽略
    } finally {
      setDeleteBusy(false);
    }
  }

  /** 复制到剪贴板 */
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessCopied(true);
      setTimeout(() => setSuccessCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setSuccessCopied(true);
      setTimeout(() => setSuccessCopied(false), 2000);
    }
  }

  /** 格式化时间 */
  function formatTime(iso: string | null): string {
    if (!iso) return "永不过期";
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  const { isDark } = colors;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderCircle className={`h-6 w-6 animate-spin ${isDark ? "text-white/60" : "text-slate-400"}`} />
      </div>
    );
  }

  return (
    <>
      {/* 令牌列表 */}
      <div>
        {/* 创建按钮 */}
        <button
          type="button"
          onClick={() => { setCreateOpen(true); setCreateError(""); setCreateName(""); setCreateExpires("90d"); }}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-base font-medium transition-all duration-300"
          style={{ borderColor: colors.border, background: colors.inputBg, color: "rgb(139,92,246)" }}
        >
          <Plus className="h-4 w-4" />
          创建令牌
        </button>

        {tokens.length === 0 ? (
          <div className="py-10 text-center">
            <KeyRound className="mx-auto mb-4 h-14 w-14" style={{ color: colors.iconMuted }} />
            <p className="text-base" style={{ color: colors.mutedText }}>暂无访问令牌</p>
            <p className="mt-2 text-sm" style={{ color: colors.subtleText }}>创建令牌后可通过 API 远程管理数据</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: colors.border }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
                  <th className="px-4 py-3 font-medium" style={{ color: colors.mutedText }}>名称</th>
                  <th className="px-4 py-3 font-medium" style={{ color: colors.mutedText }}>令牌</th>
                  <th className="px-4 py-3 font-medium" style={{ color: colors.mutedText }}>创建时间</th>
                  <th className="px-4 py-3 font-medium" style={{ color: colors.mutedText }}>过期时间</th>
                  <th className="px-4 py-3 font-medium" style={{ color: colors.mutedText }}></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr
                    key={token.id}
                    className="border-t transition-colors duration-200"
                    style={{
                      borderColor: colors.border,
                      background: token.isExpired
                        ? (isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)")
                        : "transparent",
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: colors.primaryText }}>
                          {token.name}
                        </span>
                        {token.isExpired && (
                          <span className="shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                            已过期
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-xs" style={{ color: colors.mutedText }}>
                        ••••{token.tokenSuffix}
                      </code>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: colors.mutedText }}>
                      {formatTime(token.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: token.isExpired ? "rgb(239,68,68)" : colors.mutedText }}>
                      {formatTime(token.expiresAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="relative group">
                        <button
                          type="button"
                          onClick={() => { setDeleteId(token.id); setDeleteName(token.name); }}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-500/30 p-2 text-rose-400 transition-all duration-200 hover:border-rose-500/60 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span
                          className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
                          style={{ background: isDark ? "rgba(30,30,40,0.95)" : "rgba(30,30,40,0.9)" }}
                        >
                          删除
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== 创建令牌弹窗 ===== */}
      {createOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => { if (!createSaving) setCreateOpen(false); }}>
          <div className="absolute inset-0 bg-black/20 animate-drawer-fade" />
          <div
            className="relative w-full max-w-[460px] rounded-t-[30px] sm:rounded-[30px] border shadow-2xl backdrop-blur-xl p-6 animate-panel-rise"
            style={{ borderColor: colors.border, background: isDark ? "#101a2eee" : "rgba(255,255,255,0.96)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "rgb(139,92,246)" }}>访问令牌</p>
                <h3 className="mt-1 text-lg font-semibold" style={{ color: colors.primaryText }}>创建新令牌</h3>
              </div>
              <button
                type="button"
                onClick={() => { if (!createSaving) setCreateOpen(false); }}
                className="rounded-xl p-2 transition-colors"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: colors.mutedText }}
              >
                ✕
              </button>
            </div>

            {/* 名称输入 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium" style={{ color: colors.secondaryText }}>令牌名称</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={50}
                placeholder="例如：CI/CD 自动化"
                autoFocus
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-300"
                style={{ borderColor: colors.border, background: colors.inputBg, color: colors.primaryText }}
              />
            </div>

            {/* 过期时间下拉框（自定义） */}
            <div className="mb-5" ref={expiresRef}>
              <label className="mb-2 block text-sm font-medium" style={{ color: colors.secondaryText }}>过期时间</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExpiresOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-300"
                  style={{
                    borderColor: expiresOpen ? colors.borderFocus : colors.border,
                    background: colors.inputBg,
                    color: colors.primaryText,
                  }}
                >
                  <span>{selectedLabel}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${expiresOpen ? "rotate-180" : ""}`}
                    style={{ color: colors.iconMuted }}
                  />
                </button>
                {expiresOpen && (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-2xl border shadow-xl backdrop-blur-xl animate-panel-rise"
                    style={{
                      borderColor: colors.border,
                      background: isDark ? "#101a2eee" : "rgba(255,255,255,0.96)",
                    }}
                  >
                    {expiresOptions.map((opt) => {
                      const isSelected = opt.value === createExpires;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setCreateExpires(opt.value);
                            setExpiresOpen(false);
                          }}
                          className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors duration-150"
                          style={{
                            background: isSelected
                              ? (isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)")
                              : "transparent",
                            color: isSelected ? "rgb(139,92,246)" : colors.primaryText,
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check className="h-4 w-4" style={{ color: "rgb(139,92,246)" }} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {createError && (
              <p className="mb-3 text-xs text-red-400">{createError}</p>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={createSaving}
                className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: colors.mutedText }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={createSaving}
                className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-violet-700 disabled:opacity-50"
              >
                {createSaving ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : "创建"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== 创建成功弹窗（展示完整令牌） ===== */}
      {successOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/20 animate-drawer-fade" />
          <div
            className="relative w-full max-w-[460px] rounded-t-[30px] sm:rounded-[30px] border shadow-2xl backdrop-blur-xl p-6 animate-panel-rise"
            style={{ borderColor: colors.border, background: isDark ? "#101a2eee" : "rgba(255,255,255,0.96)" }}
          >
            {/* 标题 */}
            <div className="mb-5">
              <p className="text-xs font-medium" style={{ color: "rgb(139,92,246)" }}>访问令牌</p>
              <h3 className="mt-1 text-lg font-semibold" style={{ color: colors.primaryText }}>令牌已创建</h3>
            </div>

            {/* 安全提示 */}
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed" style={{ color: colors.mutedText }}>
                请立即复制并妥善保存此令牌。关闭此弹窗后将<b>无法再次查看</b>完整令牌。
              </p>
            </div>

            {/* 令牌值 */}
            <div className="mb-5 rounded-2xl border p-3" style={{ borderColor: colors.border, background: colors.inputBg }}>
              <div className="flex items-center justify-between gap-2">
                <code className="flex-1 break-all font-mono text-xs" style={{ color: colors.primaryText }}>
                  {successToken}
                </code>
                <button
                  type="button"
                  onClick={() => void copyToClipboard(successToken)}
                  className="shrink-0 rounded-lg p-2 transition-colors"
                  style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: successCopied ? "rgb(34,197,94)" : colors.mutedText }}
                >
                  {successCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              type="button"
              onClick={() => setSuccessOpen(false)}
              className="w-full rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200"
              style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: colors.mutedText }}
            >
              我已保存令牌，关闭
            </button>
          </div>
        </div>
      ) : null}

      {/* ===== 删除确认弹窗 ===== */}
      {deleteId !== null ? (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => { if (!deleteBusy) setDeleteId(null); }}>
          <div className="absolute inset-0 bg-black/20 animate-drawer-fade" />
          <div
            className="relative w-full max-w-[400px] rounded-t-[30px] sm:rounded-[30px] border shadow-2xl backdrop-blur-xl p-6 animate-panel-rise"
            style={{ borderColor: colors.border, background: isDark ? "#101a2eee" : "rgba(255,255,255,0.96)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle className="h-6 w-6 text-rose-400" />
              </div>
              <h3 className="text-base font-semibold" style={{ color: colors.primaryText }}>删除令牌</h3>
              <p className="mt-2 text-sm" style={{ color: colors.mutedText }}>
                确定要删除令牌「{deleteName}」吗？使用该令牌的所有 API 请求将立即失效。
              </p>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleteBusy}
                className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200"
                style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: colors.mutedText }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleteBusy}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-rose-600 disabled:opacity-50"
              >
                {deleteBusy ? <LoaderCircle className="mx-auto h-4 w-4 animate-spin" /> : "删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
