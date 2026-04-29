/**
 * 访问控制子组件
 * @description 备选 URL 列表中的可拖拽条目、条件编辑弹窗、条件标签等子组件
 */

"use client";

import {
  Check, Clock, ExternalLink, GripVertical, Monitor, Smartphone,
  Trash2, X, PencilLine,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type ThemeMode, type AccessRuleMode, type AlternateUrl,
  type AccessCondition, type TimeCondition,
} from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { Tooltip } from "@/components/ui/tooltip";
import {
  getDialogSubtleClass, getDialogSecondaryBtnClass, getDialogListItemClass,
} from "@/components/sakura-nav/style-helpers";

/** 星期选项（条件编辑弹窗与条件标签共用） */
export const WEEK_DAY_OPTIONS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];

// ──────────────────────────────────────
// 条件描述工具
// ──────────────────────────────────────

/** 获取条件的完整描述文本（用于 Tooltip） */
export function getConditionDescription(cond: AccessCondition): string {
  if (cond.type === "device") {
    return cond.device === "desktop" ? "设备条件：桌面端访问时生效" : "设备条件：移动端访问时生效";
  }
  const dayLabel = cond.weekDays.length === 0
    ? "每天"
    : cond.weekDays.length === 5 && [1, 2, 3, 4, 5].every((d) => cond.weekDays.includes(d))
      ? "工作日"
      : cond.weekDays.length === 2 && [6, 7].every((d) => cond.weekDays.includes(d))
        ? "周末"
        : cond.weekDays.map((d) => WEEK_DAY_OPTIONS.find((o) => o.value === d)?.label ?? d).join("、");
  const timeLabel = `${String(cond.startHour).padStart(2, "0")}:00 — ${String(cond.endHour).padStart(2, "0")}:59`;
  let dateLabel = "";
  if (cond.startDate && cond.endDate) {
    dateLabel = `\n日期：${cond.startDate} 至 ${cond.endDate}`;
  } else if (cond.startDate) {
    dateLabel = `\n日期：${cond.startDate} 起`;
  } else if (cond.endDate) {
    dateLabel = `\n日期：至 ${cond.endDate}`;
  }
  return `时间段条件：${dayLabel} ${timeLabel}${dateLabel}`;
}

// ──────────────────────────────────────
// 可拖拽排序的 URL 条目
// ──────────────────────────────────────

export function SortableUrlItem({
  alt, mode, isDark, themeMode,
  onOpenConditions, onEdit, onDelete,
}: {
  alt: AlternateUrl;
  mode: AccessRuleMode;
  isDark: boolean;
  themeMode: ThemeMode;
  onOpenConditions: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dragTransition = { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: alt.id, transition: dragTransition });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  } as React.CSSProperties;

  /** 条件内联展示 */
  const conditionBadge = mode === "conditional" && alt.condition ? (
    <Tooltip tip={getConditionDescription(alt.condition)} themeMode={themeMode}>
      <span className="cursor-default">
        <ConditionBadge condition={alt.condition} isDark={isDark} />
      </span>
    </Tooltip>
  ) : null;

  return (
    <div ref={setNodeRef} style={style}>
      <div className={cn("group flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition", getDialogListItemClass(themeMode))}>
        {/* 拖拽手柄 */}
        <button type="button"
          className={cn("cursor-grab touch-none p-0.5 rounded-lg transition hover:bg-white/10",
            isDark ? "text-white/30 hover:text-white/50" : "text-slate-400 hover:text-slate-600",
          )}
          {...attributes} {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* 主内容 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {alt.label ? (
              <span className="truncate text-sm font-medium">{alt.label}</span>
            ) : (
              <span className={cn("truncate text-sm", getDialogSubtleClass(themeMode))}>未命名</span>
            )}
            {/* 条件标签 */}
            {conditionBadge}
          </div>
          <Tooltip tip="点击跳转到该网站" themeMode={themeMode}>
            <a href={alt.url} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn("mt-0.5 flex items-center gap-1 truncate text-xs transition group/url", getDialogSubtleClass(themeMode), "hover:underline")}
            >
              {alt.url}
              <ExternalLink className={cn("h-3 w-3 shrink-0 transition-opacity opacity-0 group-hover/url:opacity-100")} />
            </a>
          </Tooltip>
        </div>

        {/* 操作按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          {mode === "conditional" && (
            <Tooltip tip={alt.condition ? "编辑条件" : "设置条件"} themeMode={themeMode}>
              <button type="button" onClick={onOpenConditions}
                className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                  alt.condition
                    ? isDark ? "border-violet-400/30 bg-violet-500/10 text-violet-300" : "border-violet-200 bg-violet-50 text-violet-600"
                    : isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-white/12" : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-slate-100",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
          <Tooltip tip="编辑" themeMode={themeMode}>
            <button type="button" onClick={onEdit}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-white/12" : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-slate-100",
              )}
            ><PencilLine className="h-3.5 w-3.5" /></button>
          </Tooltip>
          <Tooltip tip="删除" themeMode={themeMode}>
            <button type="button" onClick={onDelete}
              className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border transition",
                isDark ? "border-white/10 bg-white/6 text-white/50 hover:bg-red-500/15 hover:text-red-400"
                  : "border-slate-200/60 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500",
              )}
            ><Trash2 className="h-3.5 w-3.5" /></button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// 条件编辑弹窗（单条件选择）
// ──────────────────────────────────────

/** 条件类型选择 */
type CondTypePicker = "schedule" | "device" | null;

export function ConditionModal({
  condition, isDark, themeMode,
  onChange, onConfirm, onCancel,
}: {
  condition: AccessCondition | null;
  isDark: boolean;
  themeMode: ThemeMode;
  onChange: (condition: AccessCondition | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  /** 当前选中的条件类型 */
  const selectedType: CondTypePicker = condition?.type ?? null;

  /** 选择条件类型 */
  function selectType(type: CondTypePicker) {
    if (type === "schedule") {
      onChange({ type: "schedule", weekDays: [], startHour: 0, endHour: 23, startDate: null, endDate: null });
    } else if (type === "device") {
      onChange({ type: "device", device: "desktop" });
    } else {
      onChange(null);
    }
  }

  /** 更新时间条件字段 */
  function patchSchedule(patch: Record<string, unknown>) {
    if (!condition || condition.type !== "schedule") return;
    onChange({ ...condition, ...patch } as TimeCondition);
  }

  /** 更新设备条件字段 */
  function patchDevice(device: "desktop" | "mobile") {
    onChange({ type: "device", device });
  }

  /** 清除条件 */
  function clearCondition() {
    onChange(null);
  }

  const scheduleCond = condition?.type === "schedule" ? condition : null;
  const deviceCond = condition?.type === "device" ? condition : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 backdrop-blur-sm sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={onCancel}
    >
      <div className={cn("animate-panel-rise w-full max-w-[480px] overflow-hidden rounded-[24px] border shadow-[0_32px_120px_rgba(0,0,0,0.42)]",
        isDark ? "border-white/12 bg-slate-900" : "border-slate-200 bg-white",
      )} onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className={cn("flex items-center justify-between border-b px-5 py-4", isDark ? "border-white/10" : "border-slate-200/50")}>
          <h3 className="text-[15px] font-semibold">条件设置</h3>
          <button type="button" onClick={onCancel}
            className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg transition",
              isDark ? "text-white/50 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100",
            )}
          ><X className="h-4 w-4" /></button>
        </div>

        {/* 条件类型选择 */}
        <div className="px-5 pt-4 pb-2 space-y-3">
          <div className="flex gap-2">
            <button type="button"
              onClick={() => selectType(selectedType === "schedule" ? null : "schedule")}
              className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                selectedType === "schedule"
                  ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                  : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
              )}
            >
              <Clock className="h-3.5 w-3.5" />时间段
            </button>
            <button type="button"
              onClick={() => selectType(selectedType === "device" ? null : "device")}
              className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-medium transition",
                selectedType === "device"
                  ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                  : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
              )}
            >
              <Monitor className="h-3.5 w-3.5" />设备
            </button>
          </div>
        </div>

        {/* 条件配置区 */}
        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-5 pb-4">
          {/* 时间条件 */}
          {scheduleCond && (
            <div className={cn("rounded-xl border p-3 space-y-3", getDialogListItemClass(themeMode))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">时间条件配置</span>
                <button type="button" onClick={clearCondition}
                  className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg transition",
                    isDark ? "text-white/40 hover:text-red-400" : "text-slate-400 hover:text-red-500",
                  )}
                ><X className="h-3.5 w-3.5" /></button>
              </div>

              {/* 日期范围 */}
              <div className="flex items-center gap-2">
                <span className={cn("shrink-0 text-xs", getDialogSubtleClass(themeMode))}>日期范围</span>
                <input type="date" value={scheduleCond.startDate ?? ""}
                  onChange={(e) => patchSchedule({ startDate: e.target.value || null })}
                  className={cn("rounded-lg border px-2 py-1 text-xs", isDark ? "border-white/10 bg-white/6 text-white" : "border-slate-200 bg-white text-slate-900")}
                />
                <span className={cn("text-xs", getDialogSubtleClass(themeMode))}>至</span>
                <input type="date" value={scheduleCond.endDate ?? ""}
                  onChange={(e) => patchSchedule({ endDate: e.target.value || null })}
                  className={cn("rounded-lg border px-2 py-1 text-xs", isDark ? "border-white/10 bg-white/6 text-white" : "border-slate-200 bg-white text-slate-900")}
                />
              </div>

              {/* 星期选择 */}
              <div className="space-y-1.5">
                <span className={cn("text-xs", getDialogSubtleClass(themeMode))}>星期（不选=每天）</span>
                <div className="flex flex-wrap gap-1">
                  {WEEK_DAY_OPTIONS.map((opt) => {
                    const active = scheduleCond.weekDays.includes(opt.value);
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => {
                          const days = active
                            ? scheduleCond.weekDays.filter((d) => d !== opt.value)
                            : [...scheduleCond.weekDays, opt.value].sort((a, b) => a - b);
                          patchSchedule({ weekDays: days });
                        }}
                        className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition",
                          active
                            ? isDark ? "border-white/30 bg-white/15 text-white" : "border-slate-400 bg-slate-200 text-slate-900"
                            : isDark ? "border-white/10 text-white/50 hover:bg-white/10" : "border-slate-200 text-slate-400 hover:bg-slate-100",
                        )}
                      >{opt.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* 时间段 */}
              <div className="flex items-center gap-2">
                <span className={cn("shrink-0 text-xs", getDialogSubtleClass(themeMode))}>时段</span>
                <select value={scheduleCond.startHour}
                  onChange={(e) => patchSchedule({ startHour: Number(e.target.value) })}
                  className={cn("rounded-lg border px-2 py-1 text-xs", isDark ? "border-white/10 bg-white/6 text-white" : "border-slate-200 bg-white text-slate-900")}
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                  ))}
                </select>
                <span className={cn("text-xs", getDialogSubtleClass(themeMode))}>至</span>
                <select value={scheduleCond.endHour}
                  onChange={(e) => patchSchedule({ endHour: Number(e.target.value) })}
                  className={cn("rounded-lg border px-2 py-1 text-xs", isDark ? "border-white/10 bg-white/6 text-white" : "border-slate-200 bg-white text-slate-900")}
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:59</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 设备条件 */}
          {deviceCond && (
            <div className={cn("rounded-xl border p-3 space-y-3", getDialogListItemClass(themeMode))}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">设备条件配置</span>
                <button type="button" onClick={clearCondition}
                  className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg transition",
                    isDark ? "text-white/40 hover:text-red-400" : "text-slate-400 hover:text-red-500",
                  )}
                ><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex gap-2">
                {([["desktop", "桌面端", Monitor], ["mobile", "移动端", Smartphone]] as const).map(([value, label, Icon]) => (
                  <button key={value} type="button"
                    onClick={() => patchDevice(value)}
                    className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition",
                      deviceCond.device === value
                        ? isDark ? "bg-white text-slate-950 border-white/30" : "bg-slate-900 text-white border-slate-900"
                        : cn(getDialogSecondaryBtnClass(themeMode), isDark ? "text-white/70" : "text-slate-600"),
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className={cn("flex justify-end gap-2 border-t px-5 py-3", isDark ? "border-white/10" : "border-slate-200/50")}>
          <button type="button" onClick={onCancel}
            className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition",
              isDark ? "border-white/10 bg-white/6 text-white/70 hover:bg-white/12"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
            )}
          >取消</button>
          <button type="button" onClick={onConfirm}
            className={cn("inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition",
              isDark ? "bg-white text-slate-950 hover:bg-white/90" : "bg-slate-900 text-white hover:bg-slate-800",
            )}
          >
            <Check className="h-3.5 w-3.5" />确认
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// 条件标签（用于 URL 条目上显示）
// ──────────────────────────────────────

export function ConditionBadge({ condition, isDark }: { condition: AccessCondition; isDark: boolean }) {
  if (condition.type === "device") {
    return (
      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
        isDark ? "bg-blue-500/16 text-blue-300" : "bg-blue-100 text-blue-600",
      )}>
        {condition.device === "desktop" ? "桌面端" : "移动端"}
      </span>
    );
  }
  // 时间条件：显示星期 + 时间段
  const dayLabel = condition.weekDays.length === 0
    ? "每天"
    : condition.weekDays.length === 5 && [1, 2, 3, 4, 5].every((d) => condition.weekDays.includes(d))
      ? "工作日"
      : condition.weekDays.length === 2 && [6, 7].every((d) => condition.weekDays.includes(d))
        ? "周末"
        : condition.weekDays.map((d) => WEEK_DAY_OPTIONS.find((o) => o.value === d)?.label ?? String(d)).join("");
  const timeLabel = `${condition.startHour}-${condition.endHour}时`;
  return (
    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
      isDark ? "bg-violet-500/16 text-violet-300" : "bg-violet-100 text-violet-600",
    )}>
      {dayLabel} {timeLabel}
    </span>
  );
}
