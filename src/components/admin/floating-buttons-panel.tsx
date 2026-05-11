/**
 * 悬浮按钮配置面板
 * @description 管理右下角快捷按钮的启用/禁用、拖拽排序和个性化配置
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { PencilLine, GripVertical, Check, X, ExternalLink } from "lucide-react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ThemeMode, FloatingButtonItem } from "@/lib/base/types";


import { cn } from "@/lib/utils/utils";
import { getDialogSectionClass, getDialogSubtleClass, getDialogInputClass } from "@/components/sakura-nav/style-helpers";
import { DEFAULT_FEEDBACK_URL } from "@/lib/base/types";

/** 拖拽过渡动画 — 与网站卡片/标签一致 */
const dragTransition = {
  duration: 240,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)" as const,
};

type FloatingButtonsPanelProps = {
  themeMode: ThemeMode;
  buttons: FloatingButtonItem[];
  onButtonsChange: (buttons: FloatingButtonItem[]) => void;
};

/* ─── 反馈链接编辑弹窗 ─── */

function FeedbackEditDialog({
  open,
  themeMode,
  currentUrl,
  onSave,
  onClose,
}: {
  open: boolean;
  themeMode: ThemeMode;
  currentUrl: string;
  onSave: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(currentUrl);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          "relative flex w-full max-w-[480px] flex-col rounded-[28px] border p-6",
          themeMode === "light"
            ? "border-slate-200/60 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
            : "border-white/14 bg-[#0f172af0] shadow-[0_24px_80px_rgba(15,23,42,0.5)]",
        )}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">编辑反馈链接</h3>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
              themeMode === "light"
                ? "border-slate-200/60 text-slate-500 hover:bg-slate-50"
                : "border-white/12 text-white/60 hover:bg-white/10",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className={cn("mt-2 text-sm", getDialogSubtleClass(themeMode))}>
          设置点击「反馈问题」按钮后跳转的目标地址。
        </p>

        <div className="mt-5 space-y-2">
          <label className="text-sm font-medium">反馈地址</label>
          <div className="relative">
            <ExternalLink className={cn("absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", getDialogSubtleClass(themeMode))} />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/your-repo/issues"
              className={cn("w-full rounded-2xl border py-3 pl-10 pr-4 text-sm outline-none", getDialogInputClass(themeMode))}
            />
          </div>
          <p className={cn("text-xs", getDialogSubtleClass(themeMode))}>
            默认值：{DEFAULT_FEEDBACK_URL}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition",
              themeMode === "light"
                ? "border-slate-200/60 bg-white text-slate-700 hover:bg-slate-50"
                : "border-white/12 bg-white/8 text-white/84 hover:bg-white/14",
            )}
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(url.trim() || DEFAULT_FEEDBACK_URL);
            }}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition",
              themeMode === "light"
                ? "bg-slate-900 hover:bg-slate-800"
                : "bg-white text-slate-950 hover:bg-white/90",
            )}
          >
            <Check className="h-4 w-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 可排序按钮行 ─── */

function SortableButtonRow({
  btn,
  themeMode,
  saving,
  onToggle,
  onEdit,
}: {
  btn: FloatingButtonItem;
  themeMode: ThemeMode;
  saving: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: btn.id,
    transition: dragTransition,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3",
        themeMode === "light"
          ? "border-slate-200/50 bg-white/60"
          : "border-white/8 bg-white/4",
        isDragging && "opacity-0",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
      }}
    >
      {/* 左侧：勾选框 + 标签 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onToggle}
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
            btn.enabled
              ? themeMode === "light"
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-white bg-white text-slate-950"
              : themeMode === "light"
                ? "border-slate-300 bg-white"
                : "border-white/20 bg-transparent",
          )}
        >
          {btn.enabled ? <Check className="h-3.5 w-3.5" /> : null}
        </button>
        <span className="text-sm font-medium">{btn.label}</span>
        {btn.editable && btn.customData?.url ? (
          <span className={cn("max-w-[180px] truncate text-xs", getDialogSubtleClass(themeMode))}>
            ({btn.customData.url})
          </span>
        ) : null}
      </div>

      {/* 右侧：编辑按钮 + 拖拽手柄 */}
      <div className="flex items-center gap-1.5">
        {btn.editable ? (
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition",
              themeMode === "light"
                ? "border-slate-200/60 text-slate-500 hover:bg-slate-50"
                : "border-white/12 text-white/60 hover:bg-white/10",
            )}
            aria-label={`编辑${btn.label}`}
          >
            <PencilLine className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          className={cn(
            "inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-xl border transition active:cursor-grabbing",
            themeMode === "light"
              ? "border-slate-200/60 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              : "border-white/12 text-white/40 hover:bg-white/10 hover:text-white/70",
          )}
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
          aria-label="拖拽排序"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── DragOverlay 中的浮起副本 ─── */

function OverlayButtonRow({
  btn,
  themeMode,
}: {
  btn: FloatingButtonItem;
  themeMode: ThemeMode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3 shadow-xl",
        themeMode === "light"
          ? "border-slate-200/60 bg-white/95 ring-1 ring-slate-200/40"
          : "border-white/14 bg-[#0f172af5] ring-1 ring-white/18",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{btn.label}</span>
      </div>
      <GripVertical className={cn("h-4 w-4", themeMode === "light" ? "text-slate-400" : "text-white/40")} />
    </div>
  );
}

/* ─── 面板主体 ─── */

export function FloatingButtonsPanel({
  themeMode,
  buttons,
  onButtonsChange,
}: FloatingButtonsPanelProps) {
  const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragOffset, setActiveDragOffset] = useState<{ x: number; y: number } | null>(null);
  const saving = false;

  // portalContainer：SSR 时为 null，客户端为 document.body
  const portalContainer = useMemo(() => (typeof document !== "undefined" ? document.body : null), []);

  const editingButton = buttons.find((b) => b.id === editingButtonId) ?? null;
  const activeBtn = activeId ? buttons.find((b) => b.id === activeId) ?? null : null;

  /** 传感器配置 */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 90, tolerance: 6 } }),
  );

  /** 光标吸附 Modifier — 让 DragOverlay 以鼠标点击位置为锚点跟随 */
  const snapToCursorModifier = useCallback<Modifier>(
    ({ transform, activeNodeRect }) => {
      if (!activeDragOffset || !activeNodeRect) return transform;
      return {
        ...transform,
        x: transform.x + activeDragOffset.x - activeNodeRect.width / 2,
        y: transform.y + activeDragOffset.y - activeNodeRect.height / 2,
      };
    },
    [activeDragOffset],
  );

  /** 更新本地状态（由"作用到全局"按钮统一持久化） */
  const persistButtons = useCallback((updated: FloatingButtonItem[]) => {
    onButtonsChange(updated);
  }, [onButtonsChange]);

  /** 切换单个按钮启用状态 */
  const toggleButton = useCallback((id: string) => {
    const updated = buttons.map((b) =>
      b.id === id ? { ...b, enabled: !b.enabled } : b,
    );
    persistButtons(updated);
  }, [buttons, persistButtons]);

  /** 拖拽开始 */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    const rect = event.active.rect.current.initial;
    if (rect && event.activatorEvent instanceof MouseEvent) {
      setActiveDragOffset({
        x: event.activatorEvent.clientX - rect.left,
        y: event.activatorEvent.clientY - rect.top,
      });
    } else {
      setActiveDragOffset(null);
    }
  }, []);

  /** 拖拽排序完成 */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    setActiveDragOffset(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = buttons.findIndex((b) => b.id === active.id);
    const newIndex = buttons.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    persistButtons(arrayMove(buttons, oldIndex, newIndex));
  }, [buttons, persistButtons]);

  /** 保存反馈链接编辑 */
  const saveFeedbackUrl = useCallback((url: string) => {
    if (!editingButtonId) return;
    const updated = buttons.map((b) =>
      b.id === editingButtonId
        ? { ...b, customData: { ...(b.customData ?? {}), url } }
        : b,
    );
    setEditingButtonId(null);
    persistButtons(updated);
  }, [editingButtonId, buttons, persistButtons]);

  return (
    <div className="space-y-6">
      <section className={cn("rounded-[28px] border p-5", getDialogSectionClass(themeMode))}>
        <h3 className="text-lg font-semibold">快捷按钮</h3>
        <p className={cn("mt-1 text-sm", getDialogSubtleClass(themeMode))}>
          控制页面右下角显示的快捷操作按钮。拖拽调整顺序。
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={buttons.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-4 space-y-2">
              {buttons.map((btn) => (
                <SortableButtonRow
                  key={btn.id}
                  btn={btn}
                  themeMode={themeMode}
                  saving={saving}
                  onToggle={() => toggleButton(btn.id)}
                  onEdit={() => setEditingButtonId(btn.id)}
                />
              ))}
            </div>
          </SortableContext>
          {portalContainer && createPortal(
            <DragOverlay dropAnimation={dragTransition} modifiers={[snapToCursorModifier]}>
              {activeBtn ? (
                <OverlayButtonRow btn={activeBtn} themeMode={themeMode} />
              ) : null}
            </DragOverlay>,
            portalContainer,
          )}
        </DndContext>
      </section>

      {/* 编辑反馈链接弹窗 */}
      <FeedbackEditDialog
        open={editingButtonId != null}
        themeMode={themeMode}
        currentUrl={editingButton?.customData?.url ?? DEFAULT_FEEDBACK_URL}
        onSave={(url) => saveFeedbackUrl(url)}
        onClose={() => setEditingButtonId(null)}
      />
    </div>
  );
}
