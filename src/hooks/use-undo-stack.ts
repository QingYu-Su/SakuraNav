/**
 * 撤销栈 Hook
 * @description 管理操作撤销的堆栈，外部可配合 Ctrl+Z / Toast 按钮触发
 */

import { useCallback, useEffect, useRef, useState } from "react";

/** 撤销动作：描述如何回滚一次操作 */
export type UndoAction = {
  /** 操作描述（用于 Toast 展示） */
  label: string;
  /** 执行撤销的回调 */
  undo: () => Promise<void> | void;
  /** 关联的 Toast 签名，撤销时同步关闭对应通知 */
  toastSignature?: string;
};

export function useUndoStack() {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const stackRef = useRef(stack);
  useEffect(() => {
    stackRef.current = stack;
  });

  /** 压入一个撤销动作 */
  const push = useCallback((action: UndoAction) => {
    setStack((prev) => [...prev, action]);
  }, []);

  /** 弹出栈顶撤销动作（不执行，由调用方执行） */
  const pop = useCallback((): UndoAction | undefined => {
    const current = stackRef.current;
    if (current.length === 0) return undefined;
    const last = current[current.length - 1];
    setStack((prev) => prev.slice(0, -1));
    return last;
  }, []);

  /** 清空栈（退出编辑模式时调用） */
  const clear = useCallback(() => {
    setStack([]);
  }, []);

  /** 当前栈深度 */
  const depth = stack.length;

  return { push, pop, clear, depth };
}
