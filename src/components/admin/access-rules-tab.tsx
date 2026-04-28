/**
 * 访问控制 Tab 组件
 * @description 网站编辑器中的"访问控制"Tab，合并了 URL 管理（备选 URL + 模式选择）和在线检测配置
 */

"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import {
  Check, ChevronDown, ChevronRight, Clock, Globe, GripVertical, Monitor, Plus, Smartphone,
  Trash2, X, PencilLine,
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ThemeMode, type AccessRules, type AccessRuleMode, type AlternateUrl,
  type AccessCondition, type TimeCondition, type DeviceCondition,
  type OnlineCheckFrequency,
} from "@/lib/base/types";
import type { SiteFormState } from "./types";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getDialogSectionClass, getDialogSubtleClass, getDialogInputClass,
  getDialogSecondaryBtnClass, getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";

/** 星期选项 */
const WEEK_DAY_OPTIONS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];

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
  const urlsEnabled = rules != null;

  const mode = rules?.mode ?? "auto";
  const urls = rules?.urls ?? [];
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

  /** 条件编辑面板展开状态 */
  const [openConditions, setOpenConditions] = useState<string | null>(null);

  /** Section 折叠状态：记录用户手动折叠的 section */
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(key: string) {
    setManualCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** 开关切换时重置手动折叠 */
  function handleOnlineToggle() {
    setSiteForm((cur) => ({ ...cur, skipOnlineCheck: !cur.skipOnlineCheck }));
    setManualCollapsed((prev) => {
      const next = new Set(prev);
      next.delete("online");
      return next;
    });
  }

  function handleUrlsToggle(enabled: boolean) {
    toggleUrlsEnabled(enabled);
    setManualCollapsed((prev) => {
      const next = new Set(prev);
      next.delete("urls");
      return next;
    });
  }

  function updateRules(patch: Partial<AccessRules>) {
    setSiteForm((cur) => ({
      ...cur,
      accessRules: {
        mode: rules?.mode ?? "auto",
        autoConfig: rules?.autoConfig ?? { revertOnRecovery: true },
        urls: rules?.urls ?? [],
        ...patch,
      },
    }));
  }

  /** 切换备选 URL 总开关 */
  function toggleUrlsEnabled(enabled: boolean) {
    if (enabled) {
      setSiteForm((cur) => ({
        ...cur,
        accessRules: {
          mode: "auto",
          autoConfig: { revertOnRecovery: true },
          urls: [],
        },
      }));
    } else {
      setSiteForm((cur) => ({ ...cur, accessRules: null }));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = urls.findIndex((u) => u.id === active.id);
    const newIndex = urls.findIndex((u) => u.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateRules({ urls: arrayMove(urls, oldIndex, newIndex) });
  }

  /** 打开添加弹窗 */
  function openAddModal() {
    setEditingAlt(null);
    setModalUrl("");
    setModalLabel("");
    setModalOpen(true);
  }

  /** 打开编辑弹窗 */
  function openEditModal(alt: AlternateUrl) {
    setEditingAlt(alt);
    setModalUrl(alt.url);
    setModalLabel(alt.label);
    setModalOpen(true);
  }

  /** 保存弹窗 */
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
        conditions: [],
      };
      updateRules({ urls: [...urls, newAlt] });
    }
    setModalOpen(false);
  }

  /** 删除备选 URL */
  function deleteUrl(id: string) {
    updateRules({ urls: urls.filter((u) => u.id !== id) });
    if (openConditions === id) setOpenConditions(null);
  }

  /** 更新某个备选 URL 的条件 */
  function updateUrlConditions(id: string, conditions: AccessCondition[]) {
    updateRules({
      urls: urls.map((u) => (u.id === id ? { ...u, conditions } : u)),
    });
  }

  /** 折叠状态：开启时默认展开（除非用户手动折叠），关闭时默认收回 */
  const onlineCollapsed = !onlineCheckEnabled || manualCollapsed.has("online");
  const urlsCollapsed = !urlsEnabled || manualCollapsed.has("urls");

  return (
    <div className="flex flex-col gap-4 pb-5">
      {/* ── 在线检测开关 ── */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        {/* 头部：标题 | 开关 + 折叠按钮 */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold">在线检测</h4>
            <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>
              定期检测该网站是否可正常访问
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={onlineCheckEnabled}
              onClick={handleOnlineToggle}
              className={cn(
                "relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border transition-colors",
                onlineCheckEnabled
                  ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
                  : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
              )}
            >
              <span className={cn(
                "inline-block h-5 w-5 rounded-full transition-transform",
                onlineCheckEnabled
                  ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
                  : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
              )} />
            </button>
            <button
              type="button"
              onClick={() => toggleCollapse("online")}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark
                  ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {onlineCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 展开内容 */}
        {!onlineCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            {/* 检测频率 */}
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>检测频率</p>
              <div className="flex gap-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckFrequency: opt.value }))}
                    className={cn(
                      "inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                      siteForm.onlineCheckFrequency === opt.value
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 超时时间 */}
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>超时时间</p>
              <div className="flex gap-2">
                {[3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckTimeout: sec }))}
                    className={cn(
                      "inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                      siteForm.onlineCheckTimeout === sec
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >
                    {sec} 秒
                  </button>
                ))}
              </div>
            </div>

            {/* 在线判定模式 */}
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>在线判定</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckMatchMode: "status" }))}
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                    siteForm.onlineCheckMatchMode === "status"
                      ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                      : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                  )}
                >
                  HTTP 状态码 2xx/3xx
                </button>
                <button
                  type="button"
                  onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckMatchMode: "keyword" }))}
                  className={cn(
                    "inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                    siteForm.onlineCheckMatchMode === "keyword"
                      ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                      : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                  )}
                >
                  关键词匹配
                </button>
              </div>
            </div>

            {/* 关键词输入 */}
            {siteForm.onlineCheckMatchMode === "keyword" && (
              <input
                value={siteForm.onlineCheckKeyword}
                onChange={(e) => setSiteForm((cur) => ({ ...cur, onlineCheckKeyword: e.target.value }))}
                placeholder="页面中需包含的关键词"
                className={cn("w-full rounded-xl border px-3 py-2 text-sm outline-none", getDialogInputClass(themeMode))}
              />
            )}

            {/* 连续失败阈值 */}
            <div>
              <p className={cn("mb-2 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>连续失败判定离线</p>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSiteForm((cur) => ({ ...cur, onlineCheckFailThreshold: n }))}
                    className={cn(
                      "inline-flex items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-medium transition",
                      siteForm.onlineCheckFailThreshold === n
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >
                    {n} 次
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 备选 URL（带总开关） ── */}
      <section className={cn("rounded-2xl border", getDialogSectionClass(themeMode))}>
        {/* 头部：标题 | 开关 + 折叠按钮 */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-[15px] font-semibold">备选 URL</h4>
            <p className={cn("mt-0.5 text-xs", getDialogSubtleClass(themeMode))}>
              配置备选地址和访问模式
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={urlsEnabled}
              onClick={() => handleUrlsToggle(!urlsEnabled)}
              className={cn(
                "relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border transition-colors",
                urlsEnabled
                  ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
                  : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
              )}
            >
              <span className={cn(
                "inline-block h-5 w-5 rounded-full transition-transform",
                urlsEnabled
                  ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
                  : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
              )} />
            </button>
            <button
              type="button"
              onClick={() => toggleCollapse("urls")}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark
                  ? "border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                  : "border-slate-200/60 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              {urlsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 展开内容 */}
        {!urlsCollapsed && (
          <div className="px-4 pb-4">
            {/* 模式选择 */}
            <div className="grid gap-2 sm:grid-cols-2 mb-4">
              {MODE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateRules({ mode: value })}
                  className={cn(
                    "flex flex-col gap-1 rounded-2xl border px-3 py-3 text-left transition",
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
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoConfig.revertOnRecovery}
                  onClick={() => updateRules({ autoConfig: { revertOnRecovery: !autoConfig.revertOnRecovery } })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors",
                    autoConfig.revertOnRecovery
                      ? isDark ? "border-emerald-400/30 bg-emerald-500/30" : "border-emerald-300/60 bg-emerald-100"
                      : isDark ? "border-white/12 bg-white/10" : "border-slate-200/60 bg-slate-100",
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 rounded-full transition-transform",
                    autoConfig.revertOnRecovery
                      ? isDark ? "translate-x-6 bg-emerald-400" : "translate-x-6 bg-emerald-500"
                      : isDark ? "translate-x-1 bg-white/50" : "translate-x-1 bg-slate-300",
                  )} />
                </button>
              </div>
            )}

            {/* URL 列表（包含末尾的添加按钮） */}
            {urls.length === 0 ? (
              <button
                type="button"
                onClick={openAddModal}
                className={cn(
                  "flex w-full items-center justify-center rounded-2xl border border-dashed py-3 transition",
                  isDark
                    ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                    : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600",
                )}
              >
                <Plus className="h-5 w-5" />
              </button>
            ) : (
              <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={urls.map((u) => u.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {urls.map((alt) => (
                        <SortableUrlItem
                          key={alt.id}
                          alt={alt}
                          mode={mode}
                          conditionsOpen={openConditions === alt.id}
                          isDark={isDark}
                          themeMode={themeMode}
                          onToggleConditions={() => setOpenConditions(openConditions === alt.id ? null : alt.id)}
                          onEdit={() => openEditModal(alt)}
                          onDelete={() => deleteUrl(alt.id)}
                          onUpdateConditions={(conditions) => updateUrlConditions(alt.id, conditions)}
                        />
                      ))}
                      {/* 添加按钮：与 item 等宽等高 */}
                      <button
                        type="button"
                        onClick={openAddModal}
                        className={cn(
                          "flex w-full items-center justify-center rounded-2xl border border-dashed py-2.5 transition",
                          isDark
                            ? "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                            : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600",
                        )}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
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
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={cn(
              "animate-panel-rise w-full max-w-[400px] overflow-hidden rounded-[24px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]",
              isDark ? "border-white/12 bg-slate-900" : "border-slate-200 bg-white",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
              <h3 className="text-base font-semibold">
                {editingAlt ? "编辑备选 URL" : "添加备选 URL"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition",
                  isDark ? "border-white/10 bg-white/6 hover:bg-white/12 text-white/60"
                    : "border-slate-200/50 bg-slate-50 hover:bg-slate-100 text-slate-400",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-5 space-y-3">
              <div>
                <p className={cn("mb-1.5 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>URL</p>
                <input
                  value={modalUrl}
                  onChange={(e) => setModalUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                  className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none", getDialogInputClass(themeMode))}
                />
              </div>
              <div>
                <p className={cn("mb-1.5 text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>备注名</p>
                <input
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  placeholder="如：国内镜像、备用站点"
                  className={cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none", getDialogInputClass(themeMode))}
                />
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className={cn("flex justify-end gap-2 border-t px-5 py-3", isDark ? "border-white/10" : "border-slate-200/50")}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition",
                  isDark ? "border-white/10 bg-white/6 text-white/70 hover:bg-white/12"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                )}
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveModal}
                disabled={!modalUrl.trim()}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-40",
                  isDark ? "bg-white text-slate-950 hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800",
                )}
              >
                <Check className="h-3.5 w-3.5" />
                {editingAlt ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// 可拖拽排序的 URL 条目
// ──────────────────────────────────────

function SortableUrlItem({
  alt, mode, conditionsOpen, isDark, themeMode,
  onToggleConditions, onEdit, onDelete, onUpdateConditions,
}: {
  alt: AlternateUrl;
  mode: AccessRuleMode;
  conditionsOpen: boolean;
  isDark: boolean;
  themeMode: ThemeMode;
  onToggleConditions: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateConditions: (conditions: AccessCondition[]) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: alt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms ease",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style}>
      <div className={cn(
        "group flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition",
        getDialogListItemClass(themeMode),
      )}>
        {/* 拖拽手柄 */}
        <button
          type="button"
          className={cn(
            "cursor-grab touch-none p-0.5 rounded-lg transition hover:bg-white/10",
            isDark ? "text-white/30 hover:text-white/50" : "text-slate-400 hover:text-slate-600",
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* 主内容：第一行备注名，第二行 URL */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {alt.label ? (
              <span className="truncate text-sm font-medium">{alt.label}</span>
            ) : (
              <span className={cn("truncate text-sm", getDialogSubtleClass(themeMode))}>未命名</span>
            )}
            {mode === "conditional" && alt.conditions.length > 0 && (
              <div className="flex shrink-0 items-center gap-1">
                {alt.conditions.map((cond, i) => (
                  <ConditionBadge key={i} condition={cond} isDark={isDark} />
                ))}
              </div>
            )}
          </div>
          <p className={cn("mt-0.5 truncate text-xs", getDialogSubtleClass(themeMode))}>{alt.url}</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          {mode === "conditional" && (
            <Tooltip tip="条件配置" themeMode={themeMode}>
              <button
                type="button"
                onClick={onToggleConditions}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                  conditionsOpen
                    ? isDark ? "border-violet-400/30 bg-violet-500/10 text-violet-300" : "border-violet-200 bg-violet-50 text-violet-600"
                    : isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-white/12" : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-slate-100",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip tip="编辑" themeMode={themeMode}>
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-white/12" : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-slate-100",
              )}
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip tip="删除" themeMode={themeMode}>
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-red-500/15 hover:text-red-400" : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500",
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 条件编辑面板 */}
      {conditionsOpen && (
        <div className={cn(
          "mt-1 rounded-2xl border p-3",
          getDialogListItemClass(themeMode),
        )}>
          <ConditionEditor
            conditions={alt.conditions}
            isDark={isDark}
            themeMode={themeMode}
            onChange={onUpdateConditions}
          />
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────
// 条件编辑器
// ──────────────────────────────────────

function ConditionEditor({
  conditions, isDark, themeMode, onChange,
}: {
  conditions: AccessCondition[];
  isDark: boolean;
  themeMode: ThemeMode;
  onChange: (conditions: AccessCondition[]) => void;
}) {
  function addTimeCondition() {
    const cond: TimeCondition = {
      type: "schedule",
      weekDays: [],
      startHour: 0,
      endHour: 23,
      startDate: null,
      endDate: null,
    };
    onChange([...conditions, cond]);
  }

  function addDeviceCondition() {
    const cond: DeviceCondition = { type: "device", device: "desktop" };
    onChange([...conditions, cond]);
  }

  function updateCondition(index: number, patch: Record<string, unknown>) {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } as AccessCondition : c)));
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <p className={cn("text-sm font-medium", isDark ? "text-white/70" : "text-slate-600")}>
        匹配条件（按顺序优先）
      </p>

      {conditions.map((cond, i) => (
        <div key={i} className={cn("rounded-xl border p-3 space-y-2", getDialogListItemClass(themeMode))}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {cond.type === "schedule" ? "时间段" : "设备"}
            </span>
            <button
              type="button"
              onClick={() => removeCondition(i)}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-lg transition",
                isDark ? "text-white/40 hover:text-red-400" : "text-slate-400 hover:text-red-500",
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {cond.type === "schedule" && (
            <>
              {/* 星期选择 */}
              <div>
                <p className={cn("mb-1.5 text-xs", isDark ? "text-white/50" : "text-slate-500")}>星期</p>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAY_OPTIONS.map(({ value, label }) => {
                    const active = cond.weekDays.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? cond.weekDays.filter((d) => d !== value)
                            : [...cond.weekDays, value].sort();
                          updateCondition(i, { weekDays: next });
                        }}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition",
                          active
                            ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                            : isDark ? "border-white/10 text-white/50" : "border-slate-200 text-slate-400",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => updateCondition(i, { weekDays: [] })}
                    className={cn(
                      "inline-flex h-7 items-center justify-center rounded-lg border px-2 text-xs font-medium transition",
                      cond.weekDays.length === 0
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : isDark ? "border-white/10 text-white/50" : "border-slate-200 text-slate-400",
                    )}
                  >
                    每天
                  </button>
                </div>
              </div>
              {/* 时间段 */}
              <div className="flex items-center gap-2">
                <p className={cn("text-xs shrink-0", isDark ? "text-white/50" : "text-slate-500")}>时间</p>
                <input
                  type="number"
                  min={0} max={23}
                  value={cond.startHour}
                  onChange={(e) => updateCondition(i, { startHour: Math.min(23, Math.max(0, Number(e.target.value))) })}
                  className={cn("w-14 rounded-lg border px-2 py-1 text-xs text-center outline-none", getDialogInputClass(themeMode))}
                />
                <span className={cn("text-xs", isDark ? "text-white/40" : "text-slate-400")}>:</span>
                <span className={cn("text-xs", isDark ? "text-white/40" : "text-slate-400")}>00 —</span>
                <input
                  type="number"
                  min={0} max={23}
                  value={cond.endHour}
                  onChange={(e) => updateCondition(i, { endHour: Math.min(23, Math.max(0, Number(e.target.value))) })}
                  className={cn("w-14 rounded-lg border px-2 py-1 text-xs text-center outline-none", getDialogInputClass(themeMode))}
                />
                <span className={cn("text-xs", isDark ? "text-white/40" : "text-slate-400")}>:</span>
                <span className={cn("text-xs", isDark ? "text-white/40" : "text-slate-400")}>59</span>
              </div>
              {/* 日期范围 */}
              <div className="flex items-center gap-2">
                <p className={cn("text-xs shrink-0", isDark ? "text-white/50" : "text-slate-500")}>日期</p>
                <input
                  type="date"
                  value={cond.startDate ?? ""}
                  onChange={(e) => updateCondition(i, { startDate: e.target.value || null })}
                  className={cn("rounded-lg border px-2 py-1 text-xs outline-none", getDialogInputClass(themeMode))}
                />
                <span className={cn("text-xs", isDark ? "text-white/40" : "text-slate-400")}>—</span>
                <input
                  type="date"
                  value={cond.endDate ?? ""}
                  onChange={(e) => updateCondition(i, { endDate: e.target.value || null })}
                  className={cn("rounded-lg border px-2 py-1 text-xs outline-none", getDialogInputClass(themeMode))}
                />
              </div>
            </>
          )}

          {cond.type === "device" && (
            <div className="flex gap-2">
              {([["desktop", "桌面端", Monitor], ["mobile", "移动端", Smartphone]] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateCondition(i, { device: value })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                    cond.device === value
                      ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                      : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addTimeCondition}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-1.5 text-sm transition",
            isDark ? "border-white/10 text-white/50 hover:text-white/70" : "border-slate-200 text-slate-400 hover:text-slate-600",
          )}
        >
          <Clock className="h-3 w-3" />
          添加时间段
        </button>
        <button
          type="button"
          onClick={addDeviceCondition}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-1.5 text-sm transition",
            isDark ? "border-white/10 text-white/50 hover:text-white/70" : "border-slate-200 text-slate-400 hover:text-slate-600",
          )}
        >
          <Monitor className="h-3 w-3" />
          添加设备条件
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// 条件标签（用于 URL 条目上显示）
// ──────────────────────────────────────

function ConditionBadge({ condition, isDark }: { condition: AccessCondition; isDark: boolean }) {
  if (condition.type === "device") {
    return (
      <span className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        isDark ? "bg-blue-500/16 text-blue-300" : "bg-blue-100 text-blue-600",
      )}>
        {condition.device === "desktop" ? "桌面" : "移动"}
      </span>
    );
  }
  const dayLabel = condition.weekDays.length === 0
    ? "每天"
    : condition.weekDays.length === 5 && [1, 2, 3, 4, 5].every((d) => condition.weekDays.includes(d))
      ? "工作日"
      : condition.weekDays.length === 2 && [6, 7].every((d) => condition.weekDays.includes(d))
        ? "周末"
        : `${condition.weekDays.length}天`;
  return (
    <span className={cn(
      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
      isDark ? "bg-violet-500/16 text-violet-300" : "bg-violet-100 text-violet-600",
    )}>
      {dayLabel} {condition.startHour}-{condition.endHour}
    </span>
  );
}
