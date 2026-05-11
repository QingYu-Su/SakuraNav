/**
 * 通知设置面板
 * @description 设置弹窗中的「通知」标签页，管理用户的通知配置列表
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Send,
  Search,
  LoaderCircle,
  Webhook,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import type { ThemeMode, NotificationChannel, NotificationChannelType, WebhookMethod, WebhookContentType } from "@/lib/base/types";
import {
  getDialogSectionClass,
  getDialogInputClass,
  getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";
import { Tooltip } from "@/components/ui/tooltip";

// ── 类型 ──

type FilterStatus = "all" | "active" | "disabled";

type NotificationPanelProps = {
  themeMode: ThemeMode;
};

type ChannelFormData = {
  name: string;
  type: NotificationChannelType;
  url: string;
  method: WebhookMethod;
  contentType: WebhookContentType;
  titleParam: string;
  contentParam: string;
};

const defaultFormData: ChannelFormData = {
  name: "",
  type: "webhook",
  url: "",
  method: "POST",
  contentType: "application/json",
  titleParam: "title",
  contentParam: "content",
};

const METHOD_OPTIONS: { value: WebhookMethod; label: string }[] = [
  { value: "POST", label: "POST" },
  { value: "PUT", label: "PUT" },
  { value: "GET", label: "GET" },
];

const CONTENT_TYPE_OPTIONS: { value: WebhookContentType; label: string }[] = [
  { value: "application/json", label: "application/json" },
  { value: "application/x-www-form-urlencoded", label: "x-www-form-urlencoded" },
];

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "active", label: "使用中" },
  { value: "disabled", label: "已禁用" },
];

// ── 主组件 ──

export function NotificationPanel({ themeMode }: NotificationPanelProps) {
  const isDark = themeMode === "dark";

  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  // 编辑弹窗状态
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>(defaultFormData);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");

  // 测试/删除 busy 状态
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  /** 加载通知配置列表 */
  const loadChannels = useCallback(async () => {
    try {
      const data = await requestJson<NotificationChannel[]>("/api/notifications");
      setChannels(data);
    } catch {
      // 未授权等错误静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  // 3 秒后自动清除测试结果
  useEffect(() => {
    if (!testResult) return;
    const timer = setTimeout(() => setTestResult(null), 3000);
    return () => clearTimeout(timer);
  }, [testResult]);

  /** 打开新建弹窗 */
  function handleAdd() {
    setEditingId(null);
    setFormData(defaultFormData);
    setFormError("");
    setEditorOpen(true);
  }

  /** 打开编辑弹窗 */
  function handleEdit(channel: NotificationChannel) {
    setEditingId(channel.id);
    setFormData({
      name: channel.name,
      type: channel.type,
      url: channel.url,
      method: channel.method,
      contentType: channel.contentType,
      titleParam: channel.titleParam,
      contentParam: channel.contentParam,
    });
    setFormError("");
    setEditorOpen(true);
  }

  /** 提交表单（新建或更新） */
  async function handleSubmit() {
    setFormBusy(true);
    setFormError("");
    try {
      if (editingId) {
        const updated = await requestJson<NotificationChannel>(`/api/notifications/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        setChannels((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await requestJson<NotificationChannel>("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        setChannels((prev) => [...prev, created]);
      }
      setEditorOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "操作失败";
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) { setFormError(parsed.error); return; }
      } catch { /* 非 JSON 错误 */ }
      setFormError(msg);
    } finally {
      setFormBusy(false);
    }
  }

  /** 切换启用/禁用 */
  async function handleToggle(channel: NotificationChannel) {
    setBusyAction(channel.id);
    try {
      const updated = await requestJson<NotificationChannel>(`/api/notifications/${channel.id}`, {
        method: "PATCH",
      });
      setChannels((prev) => prev.map((c) => (c.id === channel.id ? updated : c)));
    } catch { /* 静默 */ }
    setBusyAction(null);
  }

  /** 删除 */
  async function handleDelete(id: string) {
    setBusyAction(id);
    try {
      await requestJson(`/api/notifications/${id}`, { method: "DELETE" });
      setChannels((prev) => prev.filter((c) => c.id !== id));
    } catch { /* 静默 */ }
    setBusyAction(null);
  }

  /** 发送测试通知（列表 item 上的） */
  async function handleTest(channel: NotificationChannel) {
    setBusyAction(`test-${channel.id}`);
    setTestResult(null);
    try {
      await requestJson(`/api/notifications/${channel.id}/test`, { method: "POST" });
      setTestResult({ id: channel.id, ok: true, msg: "发送成功" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "发送失败";
      try {
        const parsed = JSON.parse(msg);
        setTestResult({ id: channel.id, ok: false, msg: parsed?.error || msg });
      } catch {
        setTestResult({ id: channel.id, ok: false, msg });
      }
    }
    setBusyAction(null);
  }

  // 筛选与搜索
  const filteredChannels = channels.filter((c) => {
    if (filterStatus === "active" && !c.enabled) return false;
    if (filterStatus === "disabled" && c.enabled) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* 工具栏：搜索 + 过滤 + 添加 */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* 搜索框 */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索通知配置..."
            className={cn("w-full rounded-xl border px-3 py-2 pl-9 text-sm outline-none transition", getDialogInputClass(themeMode))}
          />
        </div>

        {/* 过滤下拉（自定义） */}
        <CustomDropdown
          themeMode={themeMode}
          options={FILTER_OPTIONS}
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as FilterStatus)}
        />

        {/* 添加按钮 */}
        <button
          type="button"
          onClick={handleAdd}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition",
            isDark
              ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
              : "bg-violet-100 text-violet-700 hover:bg-violet-200",
          )}
        >
          <Plus className="h-4 w-4" />
          添加
        </button>
      </div>

      {/* 配置列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="h-6 w-6 animate-spin opacity-40" />
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className={cn("rounded-2xl border border-dashed px-4 py-8 text-center text-sm", getDialogSectionClass(themeMode))}>
          <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" />
          <p style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>
            {channels.length === 0 ? "暂无通知配置，点击上方添加按钮创建" : "没有匹配的通知配置"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                getDialogListItemClass(themeMode),
              )}
            >
              {/* 图标 */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  isDark ? "bg-violet-500/15 text-violet-300" : "bg-violet-100 text-violet-600",
                )}
              >
                <Webhook className="h-4 w-4" />
              </div>

              {/* 名称与启用状态 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{channel.name}</p>
                <p className={cn("text-xs mt-0.5", channel.enabled ? (isDark ? "text-emerald-400/80" : "text-emerald-600") : (isDark ? "text-rose-400/80" : "text-rose-500"))}>
                  {channel.enabled ? "已启用" : "已禁用"}
                </p>
              </div>

              {/* 测试结果提示 */}
              {testResult?.id === channel.id && (
                <span className={cn("shrink-0 text-xs font-medium animate-[fadeIn_0.2s_ease]", testResult.ok ? "text-emerald-500" : "text-rose-500")}>
                  {testResult.ok ? <CheckCircle2 className="inline h-3.5 w-3.5 mr-0.5" /> : <XCircle className="inline h-3.5 w-3.5 mr-0.5" />}
                  {testResult.msg}
                </span>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-0.5 shrink-0">
                <IconButton tip="编辑" themeMode={themeMode} onClick={() => handleEdit(channel)}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton
                  tip={channel.enabled ? "禁用" : "启用"}
                  themeMode={themeMode}
                  onClick={() => void handleToggle(channel)}
                  disabled={busyAction === channel.id}
                >
                  {busyAction === channel.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : channel.enabled ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                </IconButton>
                <IconButton
                  tip="发送测试通知"
                  themeMode={themeMode}
                  onClick={() => void handleTest(channel)}
                  disabled={busyAction === `test-${channel.id}`}
                >
                  {busyAction === `test-${channel.id}` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </IconButton>
                <IconButton
                  tip="删除"
                  themeMode={themeMode}
                  variant="danger"
                  onClick={() => void handleDelete(channel.id)}
                  disabled={busyAction === channel.id}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editorOpen ? (
        <ChannelEditorDialog
          themeMode={themeMode}
          isEdit={!!editingId}
          formData={formData}
          onFormChange={setFormData}
          busy={formBusy}
          error={formError}
          onSubmit={handleSubmit}
          onClose={() => setEditorOpen(false)}
        />
      ) : null}
    </div>
  );
}

// ── 操作按钮（带 hover 动画和提示） ──

function IconButton({
  tip,
  themeMode,
  variant = "default",
  disabled,
  onClick,
  children,
}: {
  tip: string;
  themeMode: ThemeMode;
  variant?: "default" | "danger";
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const isDark = themeMode === "dark";
  return (
    <Tooltip tip={tip} themeMode={themeMode} disabled={disabled}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "rounded-lg p-1.5 transition-all duration-200",
          variant === "danger"
            ? isDark
              ? "border border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300 hover:scale-110 active:scale-95"
              : "border border-rose-300/40 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 hover:scale-110 active:scale-95"
            : isDark
              ? "border border-white/10 hover:border-white/25 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95"
              : "border border-slate-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 hover:scale-110 active:scale-95",
          disabled && "opacity-40 pointer-events-none",
        )}
        style={{
          color: variant === "danger"
            ? isDark ? "rgba(244,63,94,0.7)" : "rgba(244,63,94,0.8)"
            : isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}

// ── 自定义下拉组件 ──

function CustomDropdown<T extends string>({
  themeMode,
  options,
  value,
  onChange,
}: {
  themeMode: ThemeMode;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const isDark = themeMode === "dark";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm outline-none transition cursor-pointer",
          getDialogInputClass(themeMode),
        )}
      >
        <span>{currentLabel}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
          isDark ? "text-white/40" : "text-slate-400",
          open && "rotate-180",
        )} />
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 mt-1.5 w-full min-w-[120px] overflow-hidden rounded-2xl border py-1 shadow-xl outline-none",
          isDark
            ? "border-white/12 bg-[#162032]/98 backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.4)]"
            : "border-slate-200/60 bg-white/98 backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.08)]",
        )}>
          {options.map((opt) => {
            const isActive = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? isDark ? "bg-white/14 text-white" : "bg-slate-100/90 text-slate-900"
                    : isDark ? "text-white/85 hover:bg-white/12" : "text-slate-700 hover:bg-slate-100/80",
                )}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {isActive && <Check className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/60" : "text-slate-500")} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 编辑弹窗 ──

function ChannelEditorDialog({
  themeMode,
  isEdit,
  formData,
  onFormChange,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  themeMode: ThemeMode;
  isEdit: boolean;
  formData: ChannelFormData;
  onFormChange: (data: ChannelFormData) => void;
  busy: boolean;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const isDark = themeMode === "dark";

  // 弹窗内测试状态
  const [testBusy, setTestBusy] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const inputClass = cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition", getDialogInputClass(themeMode));
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider";
  const labelStyle = { color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" };

  /** 弹窗内测试发送（使用表单数据直接构建请求） */
  async function handleTestInDialog() {
    if (!formData.url) {
      setTestMsg({ ok: false, text: "请先填写请求地址" });
      return;
    }
    setTestBusy(true);
    setTestMsg(null);
    try {
      await requestJson(`/api/notifications/test-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setTestMsg({ ok: true, text: "测试消息已发送，请检查是否正确收到通知" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "发送失败";
      try {
        const parsed = JSON.parse(msg);
        setTestMsg({ ok: false, text: parsed?.error || msg });
      } catch {
        setTestMsg({ ok: false, text: msg });
      }
    } finally {
      setTestBusy(false);
    }
  }

  // 3 秒后自动清除测试提示
  useEffect(() => {
    if (!testMsg) return;
    const timer = setTimeout(() => setTestMsg(null), 5000);
    return () => clearTimeout(timer);
  }, [testMsg]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className={cn(
          "w-full max-w-md rounded-3xl border shadow-2xl backdrop-blur-xl overflow-hidden animate-panel-rise",
          isDark ? "bg-[#101a2eee] border-white/12 text-white" : "bg-white/96 border-slate-200/50 text-slate-900",
        )}
      >
        {/* 标题 */}
        <div className={cn("flex items-center justify-between px-6 py-4 border-b", isDark ? "border-white/8" : "border-slate-100")}>
          <h3 className="text-lg font-semibold">{isEdit ? "编辑通知配置" : "添加通知配置"}</h3>
        </div>

        {/* 表单 */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 错误信息 */}
          {error && (
            <div className={cn("rounded-xl border px-3.5 py-2.5 text-sm", isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-rose-300 bg-rose-50 text-rose-700")}>
              {error}
            </div>
          )}

          {/* 名称 */}
          <div>
            <label className={labelClass} style={labelStyle}>名称</label>
            <input type="text" value={formData.name} onChange={(e) => onFormChange({ ...formData, name: e.target.value })} placeholder="例如：企业微信" className={inputClass} />
          </div>

          {/* 请求地址 */}
          <div>
            <label className={labelClass} style={labelStyle}>请求地址</label>
            <input type="url" value={formData.url} onChange={(e) => onFormChange({ ...formData, url: e.target.value })} placeholder="https://example.com/webhook" className={inputClass} />
          </div>

          {/* 请求方法 + 请求体类型（自定义下拉） */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>请求方法</label>
              <FormDropdown
                themeMode={themeMode}
                options={METHOD_OPTIONS}
                value={formData.method}
                onChange={(v) => onFormChange({ ...formData, method: v })}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>请求体类型</label>
              <FormDropdown
                themeMode={themeMode}
                options={CONTENT_TYPE_OPTIONS}
                value={formData.contentType}
                onChange={(v) => onFormChange({ ...formData, contentType: v })}
              />
            </div>
          </div>

          {/* 标题参数名 + 内容参数名 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>标题参数名</label>
              <input type="text" value={formData.titleParam} onChange={(e) => onFormChange({ ...formData, titleParam: e.target.value })} placeholder="title" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>内容参数名</label>
              <input type="text" value={formData.contentParam} onChange={(e) => onFormChange({ ...formData, contentParam: e.target.value })} placeholder="content" className={inputClass} />
            </div>
          </div>

          {/* 测试结果提示 */}
          {testMsg && (
            <div className={cn(
              "rounded-xl border px-3.5 py-2.5 text-sm flex items-center gap-2",
              testMsg.ok
                ? isDark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-300 bg-emerald-50 text-emerald-700"
                : isDark ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-rose-300 bg-rose-50 text-rose-700",
            )}>
              {testMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {testMsg.text}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className={cn("flex items-center gap-2 px-6 py-4 border-t", isDark ? "border-white/8" : "border-slate-100")}>
          {/* 测试按钮（仅创建时显示） */}
          {!isEdit && (
            <button
              type="button"
              onClick={() => void handleTestInDialog()}
              disabled={testBusy || busy}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                isDark
                  ? "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
              )}
            >
              {testBusy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              测试
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn("rounded-xl px-4 py-2 text-sm font-medium transition", isDark ? "text-white/60 hover:bg-white/8" : "text-slate-500 hover:bg-slate-50")}
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
          >
            {busy ? <LoaderCircle className="inline h-4 w-4 animate-spin mr-1.5" /> : null}
            {isEdit ? "保存" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 表单内下拉（无 border，视觉上与 input 一致） ──

function FormDropdown<T extends string>({
  themeMode,
  options,
  value,
  onChange,
}: {
  themeMode: ThemeMode;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const isDark = themeMode === "dark";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm outline-none transition cursor-pointer text-left",
          getDialogInputClass(themeMode),
        )}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
          isDark ? "text-white/40" : "text-slate-400",
          open && "rotate-180",
        )} />
      </button>

      {open && (
        <div className={cn(
          "absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border py-1 shadow-xl outline-none",
          isDark
            ? "border-white/12 bg-[#162032]/98 backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.4)]"
            : "border-slate-200/60 bg-white/98 backdrop-blur-2xl shadow-[0_22px_60px_rgba(0,0,0,0.08)]",
        )}>
          {options.map((opt) => {
            const isActive = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                  isActive
                    ? isDark ? "bg-white/14 text-white" : "bg-slate-100/90 text-slate-900"
                    : isDark ? "text-white/85 hover:bg-white/12" : "text-slate-700 hover:bg-slate-100/80",
                )}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {isActive && <Check className={cn("h-3.5 w-3.5 shrink-0", isDark ? "text-white/60" : "text-slate-500")} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
