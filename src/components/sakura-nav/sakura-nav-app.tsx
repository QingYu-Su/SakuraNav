/**
 * SakuraNav 主应用组件 — 完全固定的 Composition Root
 * @description 唯一职责：调用编排 Hook → 提供 Context → 渲染布局
 * 新增/删除/修改导航站功能时无需修改此文件
 */

"use client";

import { useSakuraNavOrchestrator } from "@/hooks/use-sakura-nav-orchestrator";
import type { AppSettings, SessionUser, Tag, ThemeAppearance, ThemeMode, FloatingButtonItem } from "@/lib/base/types";
import { SakuraNavContext } from "./sakura-nav-context";
import { SakuraNavLayout } from "./sakura-nav-layout";

type Props = {
  initialTags: Tag[];
  initialAppearances: Record<ThemeMode, ThemeAppearance>;
  initialSettings: AppSettings;
  initialFloatingButtons: FloatingButtonItem[];
  initialSession: SessionUser | null;
  sessionInvalidated?: boolean;
  defaultTheme: ThemeMode;
};

/**
 * 导航站根组件（固定骨架，不需要随功能迭代而修改）
 */
export function SakuraNavApp(props: Props) {
  const contextValue = useSakuraNavOrchestrator(props);
  return (
    <SakuraNavContext.Provider value={contextValue}>
      <SakuraNavLayout />
    </SakuraNavContext.Provider>
  );
}
