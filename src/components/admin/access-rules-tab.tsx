/**
 * 访问控制 Tab 组件
 * @description 网站编辑器中的"访问控制"Tab，合并了 URL 管理（备选 URL + 模式选择）和在线检测配置
 */

"use client";

import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import {
  Check, ChevronDown, ChevronRight, CircleAlert, Clock, Globe, Plus,
  Trash2, X,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import {
  type ThemeMode, type AccessRules, type AccessRuleMode, type AlternateUrl,
  type AccessCondition, type OnlineCheckFrequency,
} from "@/lib/base/types";
import type { SiteFormState } from "./types";
import type { NotificationChannel } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getDialogSectionClass, getDialogSubtleClass, getDialogInputClass,
  getDialogSecondaryBtnClass, getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";
import {
  SortableUrlItem, ConditionModal,
} from "./access-rules-components";

const MODE_OPTIONS: Array<{ value: AccessRuleMode; label: string; desc: string; icon: typeof Globe }> = [
  { value: "auto", label: "自动", desc: "主 URL 离线时自动切换到可用备选", icon: Globe },
  { value: "conditional", label: "条件", desc: "根据时间段、设备等条件选择 URL", icon: Clock },
];

/** 在线检测频率选项 */
const FREQUENCY_OPTIONS: Array<{ value: OnlineCheckFrequency; label: string }> = [
  { value: "5min", label: "每 5 分钟" },
  { value: "1h", label: "每 1 小时" },
  { value: "1d", label: "每天" },
];

// ──────────────────────────────────────
// 主组件
// ──────────────────────────────────────

export function AccessRulesTab({
  siteForm,
  setSiteForm,
  themeMode,
}: {
  siteForm: SiteFormState;
  setSiteForm: Dispatch<SetStateAction<SiteFormState>>;
  themeMode: ThemeMode;
}) {
  const isDark = themeMode === "dark";
  const rules = siteForm.accessRules;
  const onlineCheckEnabled = !siteForm.skipOnlineCheck;

  /** 备选 URL 开关状态：根据 accessRules.enabled 判断 */
  const [urlsEnabled, setUrlsEnabled] = useState(rules != null && rules.enabled !== false);
  /** 本地缓存的 URL 列表（开关关闭时仍保留，方便用户先添加再开启） */
  const [localUrls, setLocalUrls] = useState(rules?.urls ?? []);

  const mode = rules?.mode ?? "auto";
  const urls = rules?.urls ?? localUrls;
  const autoConfig = rules?.autoConfig ?? { revertOnRecovery: true };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** 弹窗状态 */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlt, setEditingAlt] = useState<AlternateUrl | null>(null);
  const [modalUrl, setModalUrl] = useState("");
  const [modalLabel, setModalLabel] = useState("");

  /** 条件编辑弹窗状态 */
  const [condModalOpen, setCondModalOpen] = useState(false);
  const [condModalAltId, setCondModalAltId] = useState<string | null>(null);
  const [condModalCondition, setCondModalCondition] = useState<AccessCondition | null>(null);

  /** 删除最后备选 URL 的确认弹窗 */
  const [deleteLastConfirmOpen, setDeleteLastConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  /** 开启开关但无备选 URL 时的提示弹窗 */
  const [noUrlHintOpen, setNoUrlHintOpen] = useState(false);

  /** 已启用的通知配置数量（用于提示文字） */
  const [enabledChannelCount, setEnabledChannelCount] = useState<number | null>(null);
  useEffect(() => {
    requestJson<NotificationChannel[]>("/api/notifications")
      .then((channels) => setEnabledChannelCount(channels.filter((ch) => ch.enabled).length))
      .catch(() => setEnabledChannelCount(null));
  }, []);

  /** Section 折叠状态 */
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(key: string) {
    setManualCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleOnlineToggle() {
    setSiteForm((cur) => ({ ...cur, skipOnlineCheck: !cur.skipOnlineCheck }));
    setManualCollapsed((prev) => { const n = new Set(prev); n.delete("online"); return n; });
  }

  function handleUrlsToggle(enabled: boolean) {
    // 关闭时：保留 accessRules 数据，仅设 enabled=false
    if (!enabled) {
      setUrlsEnabled(false);
      setSiteForm((cur) => ({
        ...cur,
        accessRules: cur.accessRules
          ? { ...cur.accessRules, enabled: false }
          : null,
      }));
      setManualCollapsed((prev) => { const n = new Set(prev); n.delete("urls"); return n; });
      return;
    }
    // 已有 accessRules 时直接开启
    if (rules && urls.length > 0) {
      setUrlsEnabled(true);
      setSiteForm((cur) => ({
        ...cur,
        accessRules: { ...cur.accessRules!, enabled: true },
      }));
      setManualCollapsed((prev) => { const n = new Set(prev); n.delete("urls"); return n; });
      return;
    }
    // 有本地缓存 URL 时写入并开启
    if (localUrls.length > 0) {
      setUrlsEnabled(true);
      setSiteForm((cur) => ({
        ...cur,
        accessRules: { mode: "auto", autoConfig: { revertOnRecovery: true }, urls: localUrls, enabled: true },
      }));
      setManualCollapsed((prev) => { const n = new Set(prev); n.delete("urls"); return n; });
      return;
    }
    // 没有 URL 时弹出提示并自动展开 URL 区域，不开启开关
    setNoUrlHintOpen(true);
    setManualCollapsed((prev) => { const n = new Set(prev); n.add("urls"); return n; });
  }

  /** 更新 accessRules 配置（始终同步到 accessRules 以确保持久化） */
  function updateRules(patch: Partial<AccessRules>) {
    // 同步到本地缓存
    if (patch.urls) setLocalUrls(patch.urls);
    // 始终写入 accessRules，确保关闭开关时 URL 配置也不会丢失
    setSiteForm((cur) => ({
      ...cur,
      accessRules: {
        mode: rules?.mode ?? "auto",
        autoConfig: rules?.autoConfig ?? { revertOnRecovery: true },
        urls: rules?.urls ?? localUrls,
        enabled: urlsEnabled ? true : (rules?.enabled ?? false),
        ...patch,
      },
    }));
  }


  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = urls.findIndex((u) => u.id === active.id);
    const newIndex = urls.findIndex((u) => u.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateRules({ urls: arrayMove(urls, oldIndex, newIndex) });
  }

  function openAddModal() {
    setEditingAlt(null);
    setModalUrl("");
    setModalLabel("");
    setModalOpen(true);
  }

  function openEditModal(alt: AlternateUrl) {
    setEditingAlt(alt);
    setModalUrl(alt.url);
    setModalLabel(alt.label);
    setModalOpen(true);
  }

  function saveModal() {
    const trimmedUrl = modalUrl.trim();
    if (!trimmedUrl) return;
    if (editingAlt) {
      updateRules({
        urls: urls.map((u) =>
          u.id === editingAlt.id ? { ...u, url: trimmedUrl, label: modalLabel.trim() } : u,
        ),
      });
    } else {
      const newAlt: AlternateUrl = {
        id: `alt-${crypto.randomUUID()}`,
        url: trimmedUrl,
        label: modalLabel.trim(),
        enabled: true,
        isOnline: null,
        lastCheckTime: null,
        latency: null,
        condition: null,
      };
      updateRules({ urls: [...urls, newAlt] });
    }
    setModalOpen(false);
  }

  function deleteUrl(id: string) {
    const remaining = urls.filter((u) => u.id !== id);
    // 如果删除的是最后一个备选 URL，弹出确认提示
    if (remaining.length === 0) {
      setPendingDeleteId(id);
      setDeleteLastConfirmOpen(true);
      return;
    }
    updateRules({ urls: remaining });
    if (condModalAltId === id) { setCondModalOpen(false); setCondModalAltId(null); }
  }

  /** 确认删除最后一个备选 URL 并关闭开关 */
  function confirmDeleteLast() {
    if (pendingDeleteId) {
      if (condModalAltId === pendingDeleteId) { setCondModalOpen(false); setCondModalAltId(null); }
    }
    // 删除最后一个 URL 后关闭开关并清空
    setUrlsEnabled(false);
    setLocalUrls([]);
    setSiteForm((cur) => ({ ...cur, accessRules: null }));
    setDeleteLastConfirmOpen(false);
    setPendingDeleteId(null);
  }

  /** 打开条件编辑弹窗 */
  function openCondModal(altId: string) {
    const alt = urls.find((u) => u.id === altId);
    setCondModalAltId(altId);
    setCondModalCondition(alt?.condition ?? null);
    setCondModalOpen(true);
  }

  /** 保存条件 */
  function saveCondModal() {
    if (condModalAltId) {
      updateRules({
        urls: urls.map((u) => (u.id === condModalAltId ? { ...u, condition: condModalCondition } : u)),
      });
    }
    setCondModalOpen(false);
    setCondModalAltId(null);
  }

  const onlineCollapsed = onlineCheckEnabled
    ? manualCollapsed.has("online")
    : !manualCollapsed.has("online");
  // 备选 URL 折叠：开启时默认展开（除非手动折叠），关闭时默认折叠（除非手动展开）
  const urlsCollapsed = urlsEnabled
    ? manualCollapsed.has("urls")
    : !manualCollapsed.has("urls");

  return (
    <div className="flex flex-col gap-4 pb-5">
      {/* ── 在线检测开关 ── */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold">在线检测</h4>
            <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>
              定期检测该网站是否可正常访问
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" role="switch" aria-checked={onlineCheckEnabled}
              onClick={handleOnlineToggle}
              className={cn("relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border transition-colors",
                onlineCheckEnabled
                  ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
                  : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
              )}
            >
              <span className={cn("inline-block h-5 w-5 rounded-full transition-transform",
                onlineCheckEnabled
                  ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
                  : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
              )} />
            </button>
            <button type="button" onClick={() => toggleCollapse("online")}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {onlineCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!onlineCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>检测频率</p>
              <div className="flex gap-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckFrequency: opt.value }))}
                    className={cn("inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                      siteForm.onlineCheckFrequency === opt.value
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>超时时间</p>
              <div className="flex gap-2">
                {[3, 5, 10].map((sec) => (
                  <button key={sec} type="button"
                    onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckTimeout: sec }))}
                    className={cn("inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                      siteForm.onlineCheckTimeout === sec
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >{sec} 秒</button>
                ))}
              </div>
            </div>
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>在线判定</p>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckMatchMode: "status" }))}
                  className={cn("inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                    siteForm.onlineCheckMatchMode === "status"
                      ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                      : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                  )}
                >HTTP 状态码 2xx/3xx</button>
                <button type="button"
                  onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckMatchMode: "keyword" }))}
                  className={cn("inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                    siteForm.onlineCheckMatchMode === "keyword"
                      ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                      : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                  )}
                >关键词匹配</button>
              </div>
            </div>
            {siteForm.onlineCheckMatchMode === "keyword" && (
              <input value={siteForm.onlineCheckKeyword}
                onChange={(e) => setSiteForm((cur) => ({ ...cur, onlineCheckKeyword: e.target.value }))}
                placeholder="页面中需包含的关键词"
                className={cn("w-full rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
              />
            )}
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>离线通知</p>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => setSiteForm((cur) => ({ ...cur, offlineNotify: !cur.offlineNotify }))}
                  className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition", getDialogListItemClass(themeMode))}
                >
                  <span className={cn(
                    "inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition",
                    siteForm.offlineNotify
                      ? isDark ? "border-emerald-400/40 bg-emerald-500/20" : "border-emerald-400 bg-emerald-500"
                      : isDark ? "border-white/20 bg-transparent" : "border-slate-300 bg-transparent",
                  )}>
                    {siteForm.offlineNotify && <Check className={cn("h-3 w-3", isDark ? "text-emerald-400" : "text-white")} strokeWidth={3} />}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">站点离线时发送通知</span>
                </button>
                {enabledChannelCount === 0 && (
                  <span className={cn("text-xs", isDark ? "text-amber-400/80" : "text-amber-600")}>
                    暂无已启用的通知配置
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>连续失败判定离线</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((n) => (
                  <button key={n} type="button"
                    onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckFailThreshold: n }))}
                    className={cn("inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                      siteForm.onlineCheckFailThreshold === n
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >{n} 次</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 备选 URL（带总开关） ── */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold">备选 URL</h4>
            <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>配置备选地址和访问模式</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" role="switch" aria-checked={urlsEnabled}
              onClick={() => handleUrlsToggle(!urlsEnabled)}
              className={cn("relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border transition-colors",
                urlsEnabled
                  ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
                  : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
              )}
            >
              <span className={cn("inline-block h-5 w-5 rounded-full transition-transform",
                urlsEnabled
                  ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
                  : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
              )} />
            </button>
            <button type="button" onClick={() => toggleCollapse("urls")}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {urlsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!urlsCollapsed && (
          <div className="px-4 pb-4">
            {/* 模式选择 */}
            <div className="grid gap-2 sm:grid-cols-2 mb-4">
              {MODE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                <button key={value} type="button"
                  onClick={() => updateRules({ mode: value })}
                  className={cn("flex flex-col gap-1 rounded-2xl border px-3 py-3 text-left transition",
                    mode === value
                      ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                      : cn(getDialogListItemClass(themeMode), "cursor-pointer"),
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                  <span className={cn("text-xs leading-5", mode === value ? (isDark ? "text-slate-700" : "text-white/70") : getDialogSubtleClass(themeMode))}>
                    {desc}
                  </span>
                </button>
              ))}
            </div>

            {/* 自动恢复开关 */}
            {mode === "auto" && (
              <div className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5 mb-4", getDialogListItemClass(themeMode))}>
                <div>
                  <p className="text-sm font-medium">自动恢复</p>
                  <p className={cn("text-xs", getDialogSubtleClass(themeMode))}>主 URL 恢复在线后自动切回</p>
                </div>
                <button type="button" role="switch" aria-checked={autoConfig.revertOnRecovery}
                  onClick={() => updateRules({ autoConfig: { revertOnRecovery: !autoConfig.revertOnRecovery } })}
                  className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
                    autoConfig.revertOnRecovery
                      ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
                      : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
                  )}
                >
                  <span className={cn("inline-block h-4 w-4 rounded-full transition-transform",
                    autoConfig.revertOnRecovery
                      ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
                      : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
                  )} />
                </button>
              </div>
            )}

            {/* 自动模式提示 */}
            {mode === "auto" && urls.length > 0 && (
              <p className={cn("mb-3 text-xs", getDialogSubtleClass(themeMode))}>
                拖拽调整优先级。主站离线时按顺序自动切换到第一个在线的备选 URL；卡片上的在线状态反映的是当前实际跳转的 URL
              </p>
            )}

            {/* 条件模式提示 */}
            {mode === "conditional" && urls.length > 0 && (
              <p className={cn("mb-3 text-xs", getDialogSubtleClass(themeMode))}>
                拖拽调整优先级，点击时按顺序匹配条件，都不满足则使用主站 URL；条件模式下不显示在线状态
              </p>
            )}

            {/* URL 列表 */}
            {urls.length === 0 ? (
              <Tooltip tip="添加备选 URL" themeMode={themeMode}>
                <button type="button" onClick={openAddModal}
                  className={cn("flex w-full items-center justify-center rounded-2xl border border-dashed py-3 transition",
                    isDark ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                      : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600",
                  )}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </Tooltip>
            ) : (
              <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={urls.map((u) => u.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {urls.map((alt) => (
                        <SortableUrlItem key={alt.id} alt={alt} mode={mode} isDark={isDark} themeMode={themeMode}
                          onOpenConditions={() => openCondModal(alt.id)}
                          onEdit={() => openEditModal(alt)} onDelete={() => deleteUrl(alt.id)}
                        />
                      ))}
                      <Tooltip tip="添加备选 URL" themeMode={themeMode}>
                        <button type="button" onClick={openAddModal}
                          className={cn("flex w-full items-center justify-center rounded-2xl border border-dashed py-2.5 transition",
                            isDark ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                              : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600",
                          )}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 添加/编辑弹窗 ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setModalOpen(false)}
        >
          <div className={cn("animate-panel-rise w-full max-w-[400px] overflow-hidden rounded-[24px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]",
            isDark ? "border-white/12 bg-slate-900" : "border-slate-200 bg-white",
          )} onClick={(e) => e.stopPropagation()}>
            <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
              <h3 className="text-base font-semibold">{editingAlt ? "编辑备选 URL" : "添加备选 URL"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}
                className={cn("inline-flex h-8 w-8 items-center justify-center rounded-xl border transition",
                  isDark ? "border-white/10 bg-white/6 hover:bg-white/12 text-white/60"
                    : "border-slate-200/50 bg-slate-50 hover:bg-slate-100 text-slate-400",
                )}
              ><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <p className={cn("mb-1.5 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>URL</p>
                <input value={modalUrl} onChange={(e) => setModalUrl(e.target.value)}
                  placeholder="https://example.com" autoFocus
                  className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none", getDialogInputClass(themeMode))}
                />
              </div>
              <div>
                <p className={cn("mb-1.5 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>备注名</p>
                <input value={modalLabel} onChange={(e) => setModalLabel(e.target.value)}
                  placeholder="如：国内镜像、备用站点"
                  className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none", getDialogInputClass(themeMode))}
                />
              </div>
            </div>
            <div className={cn("flex justify-end gap-2 border-t px-5 py-3", isDark ? "border-white/10" : "border-slate-200/50")}>
              <button type="button" onClick={() => setModalOpen(false)}
                className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition",
                  isDark ? "border-white/10 bg-white/6 text-white/70 hover:bg-white/12"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                )}
              >取消</button>
              <button type="button" onClick={saveModal} disabled={!modalUrl.trim()}
                className={cn("inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-40",
                  isDark ? "bg-white text-slate-950 hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800",
                )}
              >
                <Check className="h-3.5 w-3.5" />{editingAlt ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 条件编辑弹窗 ── */}
      {condModalOpen && (
        <ConditionModal
          condition={condModalCondition}
          isDark={isDark}
          themeMode={themeMode}
          onChange={(c) => setCondModalCondition(c)}
          onConfirm={saveCondModal}
          onCancel={() => { setCondModalOpen(false); setCondModalAltId(null); }}
        />
      )}

      {/* ── 删除最后一个备选 URL 确认弹窗 ── */}
      {deleteLastConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => { setDeleteLastConfirmOpen(false); setPendingDeleteId(null); }}
        >
          <div className={cn("animate-panel-rise w-full max-w-[400px] overflow-hidden rounded-[24px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]",
            isDark ? "border-white/12 bg-slate-900" : "border-slate-200 bg-white",
          )} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-8 pb-2 text-center">
              <div className={cn("mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full",
                isDark ? "bg-amber-500/15" : "bg-amber-100",
              )}>
                <CircleAlert className={cn("h-7 w-7", isDark ? "text-amber-400" : "text-amber-500")} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold">确认删除</h3>
              <p className={cn("mt-2 text-sm leading-relaxed", getDialogSubtleClass(themeMode))}>
                删除最后一个备选 URL 后，备选 URL 开关将同时关闭。确定要继续吗？
              </p>
            </div>
            <div className={cn("flex gap-2 border-t px-5 py-3", isDark ? "border-white/10" : "border-slate-200/50")}>
              <button type="button" onClick={() => { setDeleteLastConfirmOpen(false); setPendingDeleteId(null); }}
                className={cn("flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                  isDark ? "border-white/10 bg-white/6 text-white/70 hover:bg-white/12"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                )}
              >取消</button>
              <button type="button" onClick={confirmDeleteLast}
                className={cn("flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                  isDark ? "bg-amber-500/80 text-white hover:bg-amber-400/90" : "bg-amber-500 text-white hover:bg-amber-600",
                )}
              >
                <Trash2 className="h-3.5 w-3.5" />确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 无备选 URL 时开启开关的提示弹窗 ── */}
      {noUrlHintOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={() => setNoUrlHintOpen(false)}
        >
          <div className={cn("animate-panel-rise w-full max-w-[400px] overflow-hidden rounded-[24px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]",
            isDark ? "border-white/12 bg-slate-900" : "border-slate-200 bg-white",
          )} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 pt-8 pb-2 text-center">
              <div className={cn("mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full",
                isDark ? "bg-blue-500/15" : "bg-blue-100",
              )}>
                <CircleAlert className={cn("h-7 w-7", isDark ? "text-blue-400" : "text-blue-500")} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold">无法开启</h3>
              <p className={cn("mt-2 text-sm leading-relaxed", getDialogSubtleClass(themeMode))}>
                请先添加至少一个备选 URL，才能开启备选 URL 开关。
              </p>
            </div>
            <div className={cn("flex gap-2 border-t px-5 py-3", isDark ? "border-white/10" : "border-slate-200/50")}>
              <button type="button" onClick={() => setNoUrlHintOpen(false)}
                className={cn("flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition",
                  isDark ? "border-white/10 bg-white/6 text-white/70 hover:bg-white/12"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                )}
              >知道了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
