/**
 * 在线检查 Hook
 * @description 管理批量在线检查的触发逻辑
 * 批量检查 API 同步返回结果后，通过 syncNavigationData 刷新前端数据
 */

import { useCallback } from "react";
import { requestJson } from "@/lib/base/api";

export interface UseOnlineCheckOptions {
  isAuthenticated: boolean;
  /** 批量检查完成后的刷新回调 */
  syncNavigationData: () => Promise<void>;
}

export interface UseOnlineCheckReturn {
  handleRunOnlineCheck: () => Promise<void>;
}

export function useOnlineCheck(opts: UseOnlineCheckOptions): UseOnlineCheckReturn {
  const { isAuthenticated, syncNavigationData } = opts;

  const handleRunOnlineCheck = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await requestJson("/api/sites/check-online", { method: "POST" });
    } catch {
      /* 静默忽略 */
    }
    // 批量检查完成后刷新前端数据
    await syncNavigationData();
  }, [isAuthenticated, syncNavigationData]);

  return { handleRunOnlineCheck };
}
