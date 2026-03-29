/**
 * 配置确认对话框组件
 * @description 用于配置导入、导出、恢复默认等敏感操作的密码确认
 */

"use client";

import { LoaderCircle, X } from "lucide-react";

/**
 * 配置确认操作类型
 */
export type ConfigConfirmAction = "export" | "import" | "reset";

/**
 * 配置操作标签映射
 */
export const configActionLabels: Record<ConfigConfirmAction, string> = {
  export: "导出配置",
  import: "导入配置",
  reset: "恢复默认",
};

/**
 * 配置确认对话框组件
 * @param action - 操作类型
 * @param password - 密码值
 * @param error - 错误信息
 * @param busy - 是否正在处理
 * @param onPasswordChange - 密码变更回调
 * @param onClose - 关闭回调
 * @param onSubmit - 提交回调
 */
export function ConfigConfirmDialog({
  action,
  password,
  error,
  busy,
  onPasswordChange,
  onClose,
  onSubmit,
}: {
  action: ConfigConfirmAction;
  password: string;
  error: string;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const title = configActionLabels[action];

  return (
    <div className="animate-drawer-fade fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/52 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-panel-rise w-full max-w-[460px] overflow-hidden rounded-[30px] border border-white/12 bg-[#101a2eee] text-white shadow-[0_32px_120px_rgba(0,0,0,0.42)]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Password Check</p>
            <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/6 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-white/72">
            请输入当前账号密码，以确认{title}。密码会以密文方式输入，本次只用于当前操作校验。
          </div>

          <label className="grid gap-2 text-sm">
            <span className="text-white/78">确认密码</span>
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="请输入当前账号密码"
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300/55 focus:bg-white/10"
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-55"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              确认并继续
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
