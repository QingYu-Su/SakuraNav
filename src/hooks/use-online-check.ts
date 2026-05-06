/**
 * 在线检查 Hook
 * @description 管理批量在线检查的执行逻辑
 * 每个站点的检测由站点自身配置控制（skipOnlineCheck + onlineCheckFrequency）
 */

import { useState, useRef, useCallback } from "react";
import { requestJson } from "@/lib/base/api";

export interface UseOnlineCheckOptions {
  isAuthenticated: boolean;
  syncNavigationData: () => Promise<void>;
}

export interface UseOnlineCheckReturn {
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  handleRunOnlineCheck: () => Promise<void>;
}

export function useOnlineCheck(opts: UseOnlineCheckOptions): UseOnlineCheckReturn {
  const { isAuthenticated, syncNavigationData } = opts;

  const [onlineCheckBusy, setOnlineCheckBusy] = useState(false);
  const [onlineCheckResult, setOnlineCheckResult] = useState<{
    checked: number;
    online: number;
    offline: number;
  } | null>(null);

  // 防重入：避免并发触发多次批量检查
  const runningRef = useRef(false);

  const handleRunOnlineCheck = useCallback(async () => {
    if (!isAuthenticated) return;
    if (runningRef.current) return;
    runningRef.current = true;
    setOnlineCheckBusy(true);
    setOnlineCheckResult(null);
    try {
      const res = await requestJson<{ checked: number; online: number; offline: number }>(
        "/api/sites/check-online",
        { method: "POST" },
      );
      setOnlineCheckResult(res);
      await syncNavigationData();
    } finally {
      runningRef.current = false;
      setOnlineCheckBusy(false);
    }
  }, [isAuthenticated, syncNavigationData]);

  return {
    onlineCheckBusy,
    onlineCheckResult,
    handleRunOnlineCheck,
  };
}
