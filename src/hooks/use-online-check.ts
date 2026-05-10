/**
 * 在线检查 Hook
 * @description 管理批量在线检查的触发逻辑
 * 批量检查 API 同步返回结果后，通过 syncNavigationData 刷新前端数据
 * 首次加载时若所有站点均未检测（isOnline 全为 null），自动触发检查并刷新
 */

import { useCallback, useEffect, useRef } from "react";
import { requestJson } from "@/lib/base/api";
import type { AdminBootstrap } from "@/lib/base/types";

export interface UseOnlineCheckOptions {
  isAuthenticated: boolean;
  /** 管理数据（含站点列表），用于检测首次加载时的在线检查需求 */
  adminData: AdminBootstrap | null;
  /** 批量检查完成后的刷新回调 */
  syncNavigationData: () => Promise<void>;
  /** 管理数据刷新回调（检查完成后同步管理面板中的在线状态） */
  syncAdminBootstrap: () => Promise<void>;
}

export interface UseOnlineCheckReturn {
  handleRunOnlineCheck: () => Promise<void>;
}

/** 全局标记：应用生命周期内仅触发一次首次检查 */
let hasTriggeredInitialCheck = false;

export function useOnlineCheck(opts: UseOnlineCheckOptions): UseOnlineCheckReturn {
  const { isAuthenticated, adminData, syncNavigationData, syncAdminBootstrap } = opts;
  const initialCheckDone = useRef(false);

  const handleRunOnlineCheck = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await requestJson("/api/site-cards/check-online", { method: "POST" });
    } catch {
      /* 静默忽略 */
    }
    // 批量检查完成后刷新前端数据
    await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
  }, [isAuthenticated, syncNavigationData, syncAdminBootstrap]);

  /* 首次加载时：若所有站点 isOnline 均为 null（从未检测），自动触发检查 */
  useEffect(() => {
    if (initialCheckDone.current || !isAuthenticated || !adminData) return;
    if (hasTriggeredInitialCheck) {
      initialCheckDone.current = true;
      return;
    }
    const sites = adminData.cards;
    if (sites.length === 0) return;
    // 仅当所有站点的 isOnline 都为 null 时才触发（首次初始化的典型状态）
    const allUnchecked = sites.every((s) => s.siteIsOnline === null);
    if (!allUnchecked) return;
    initialCheckDone.current = true;
    hasTriggeredInitialCheck = true;
    void handleRunOnlineCheck();
  }, [isAuthenticated, adminData, handleRunOnlineCheck]);

  return { handleRunOnlineCheck };
}
