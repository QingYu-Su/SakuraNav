/**
 * 快照管理 Hook
 * @description 管理导航站快照的创建、列表、恢复、删除，以及编辑模式退出时自动保存
 */

import { useCallback, useRef, useState } from "react";
import { requestJson } from "@/lib/base/api";

/** 快照元信息（与后端 SnapshotMeta 对应） */
export type SnapshotItem = {
  id: string;
  ownerId: string;
  label: string;
  createdAt: string;
};

export interface UseSnapshotsOptions {
  isAuthenticated: boolean;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
  syncNavigationData: () => Promise<void>;
  syncAdminBootstrap: () => Promise<void>;
}

export interface UseSnapshotsReturn {
  /** 快照列表 */
  snapshots: SnapshotItem[];
  /** 快照弹窗是否打开 */
  snapshotDialogOpen: boolean;
  setSnapshotDialogOpen: (open: boolean) => void;
  /** 加载快照列表 */
  loadSnapshots: () => Promise<void>;
  /** 创建快照 */
  createSnapshot: () => Promise<void>;
  /** 恢复快照 */
  restoreSnapshot: (id: string) => Promise<void>;
  /** 删除快照 */
  deleteSnapshot: (id: string) => Promise<void>;
  /** 重命名快照 */
  renameSnapshot: (id: string, label: string) => Promise<void>;
  /** 加载中 */
  loading: boolean;
  /** 操作进行中（恢复/删除） */
  busy: boolean;
  /** 编辑模式追踪：记录是否曾进入编辑模式 */
  markEnteredEditMode: () => void;
  /** 检查并保存快照（编辑模式退出时调用） */
  saveSnapshotIfNeeded: () => Promise<void>;
  /** 在页面卸载前同步保存快照（使用 sendBeacon） */
  saveSnapshotOnUnload: () => void;
}

export function useSnapshots(opts: UseSnapshotsOptions): UseSnapshotsReturn {
  const { isAuthenticated, setMessage, setErrorMessage, syncNavigationData, syncAdminBootstrap } = opts;

  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  /** 追踪是否在本次会话中曾进入编辑模式 */
  const hasEditedRef = useRef(false);

  const markEnteredEditMode = useCallback(() => {
    hasEditedRef.current = true;
  }, []);

  const loadSnapshots = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const result = await requestJson<{ items: SnapshotItem[] }>("/api/snapshots");
      setSnapshots(result.items);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "加载快照列表失败");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setErrorMessage]);

  const createSnapshot = useCallback(async () => {
    try {
      await requestJson("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      // 创建成功后刷新列表
      await loadSnapshots();
      hasEditedRef.current = false;
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "创建快照失败");
    }
  }, [loadSnapshots, setErrorMessage]);

  const restoreSnapshot = useCallback(async (id: string) => {
    setBusy(true);
    try {
      await requestJson(`/api/snapshots?action=restore&id=${encodeURIComponent(id)}`, {
        method: "POST",
      });
      // 恢复后需要刷新全部数据
      await Promise.all([syncNavigationData(), syncAdminBootstrap()]);
      await loadSnapshots();
      setMessage("快照已恢复。");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "恢复快照失败");
    } finally {
      setBusy(false);
    }
  }, [syncNavigationData, syncAdminBootstrap, loadSnapshots, setMessage, setErrorMessage]);

  const deleteSnapshot = useCallback(async (id: string) => {
    setBusy(true);
    try {
      await requestJson(`/api/snapshots?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await loadSnapshots();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "删除快照失败");
    } finally {
      setBusy(false);
    }
  }, [loadSnapshots, setErrorMessage]);

  const renameSnapshot = useCallback(async (id: string, label: string) => {
    try {
      await requestJson(`/api/snapshots?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      await loadSnapshots();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "重命名快照失败");
    }
  }, [loadSnapshots, setErrorMessage]);

  /**
   * 检查并保存快照
   * 仅在本次会话中曾进入编辑模式时才保存
   */
  const saveSnapshotIfNeeded = useCallback(async () => {
    if (!isAuthenticated || !hasEditedRef.current) return;
    // 立即重置，防止 React Strict Mode 双重调用或其它竞态导致重复创建
    hasEditedRef.current = false;
    try {
      await requestJson("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      // 静默失败，不影响用户操作
    }
  }, [isAuthenticated]);

  /**
   * 页面卸载前同步保存快照
   * 使用 navigator.sendBeacon 确保请求被发送，且与 saveSnapshotIfNeeded 共享 hasEditedRef 避免重复创建
   */
  const saveSnapshotOnUnload = useCallback(() => {
    if (!isAuthenticated || !hasEditedRef.current) return;
    try {
      const blob = new Blob([JSON.stringify({})], { type: "application/json" });
      navigator.sendBeacon("/api/snapshots", blob);
      hasEditedRef.current = false;
    } catch {
      // sendBeacon 不可用时静默忽略
    }
  }, [isAuthenticated]);

  return {
    snapshots,
    snapshotDialogOpen,
    setSnapshotDialogOpen,
    loadSnapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    renameSnapshot,
    loading,
    busy,
    markEnteredEditMode,
    saveSnapshotIfNeeded,
    saveSnapshotOnUnload,
  };
}
