/**
 * 移动端 Tab 滑动切换器
 * @description 通用移动端 Tab 导航组件，支持左右滑动和箭头切换
 */

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";

type TabItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type MobileTabSliderProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  isDark: boolean;
  /** 管理员权限标识，用于区分 tab 样式（如 "admin"） */
  getPrivilege?: (key: string) => string;
  /** 隐藏 tab 卡片中的图标，仅显示文字（节省空间） */
  hideIcons?: boolean;
};

export function MobileTabSlider({
  tabs,
  activeTab,
  onTabChange,
  isDark,
  getPrivilege,
  hideIcons = false,
}: MobileTabSliderProps) {
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  const idx = tabs.findIndex((t) => t.key === activeTab);
  if (idx === -1) return null;
  const prevIdx = (idx - 1 + tabs.length) % tabs.length;
  const nextIdx = (idx + 1) % tabs.length;
  const prevTab = tabs[prevIdx];
  const currTab = tabs[idx];
  const nextTab = tabs[nextIdx];

  function goPrev() { onTabChange(prevTab.key); }
  function goNext() { onTabChange(nextTab.key); }

  /** 非激活卡片样式 */
  function inactiveClass(privilege: string) {
    if (privilege === "admin")
      return isDark ? "bg-teal-600/15 text-teal-300/70" : "bg-teal-600/10 text-teal-600/80";
    return isDark ? "bg-white/10 text-white/60" : "bg-black/6 text-slate-500";
  }

  /** 激活卡片样式 */
  function activeClass(privilege: string) {
    if (privilege === "admin")
      return isDark ? "bg-teal-600/80 text-white" : "bg-teal-600 text-white";
    return isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white";
  }

  const getPriv = (key: string) => getPrivilege?.(key) ?? "none";

  return (
    <div
      className="flex lg:hidden items-center gap-1 py-2.5 select-none"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        if (!touchRef.current) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchRef.current.x;
        const dy = t.clientY - touchRef.current.y;
        touchRef.current = null;
        // 水平滑动距离 > 40px 且大于垂直距离才触发
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
        if (dx < 0) goNext();
        else goPrev();
      }}
    >
      {/* 左箭头 */}
      <button
        type="button"
        onClick={goPrev}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
          isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-black/40",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* 上一个 */}
      <button type="button" onClick={goPrev} className={cn("flex items-center justify-center gap-1 flex-[0.55] px-1.5 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-300 min-w-0 opacity-50", inactiveClass(getPriv(prevTab.key)))}>
        {!hideIcons && <prevTab.icon className="h-3 w-3 shrink-0" />}
        <span className="truncate">{prevTab.label}</span>
      </button>

      {/* 当前（高亮） */}
      <button type="button" className={cn("flex items-center justify-center gap-1.5 flex-1 px-3 py-2 rounded-2xl text-xs font-semibold transition-all duration-300 min-w-0", activeClass(getPriv(currTab.key)))}>
        {!hideIcons && <currTab.icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="whitespace-nowrap">{currTab.label}</span>
      </button>

      {/* 下一个 */}
      <button type="button" onClick={goNext} className={cn("flex items-center justify-center gap-1 flex-[0.55] px-1.5 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-300 min-w-0 opacity-50", inactiveClass(getPriv(nextTab.key)))}>
        {!hideIcons && <nextTab.icon className="h-3 w-3 shrink-0" />}
        <span className="truncate">{nextTab.label}</span>
      </button>

      {/* 右箭头 */}
      <button
        type="button"
        onClick={goNext}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
          isDark ? "hover:bg-white/10 text-white/50" : "hover:bg-black/5 text-black/40",
        )}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
