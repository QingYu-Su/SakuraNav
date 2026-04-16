/**
 * 配置管理面板组件
 * @description 提供站点名称设置、在线检查、配置导入、导出和恢复默认功能的管理界面
 */

"use client";

import { Download, LoaderCircle, Upload, RotateCcw, Wifi, WifiOff } from "lucide-react";

export function ConfigAdminPanel({
  siteName,
  siteNameBusy,
  selectedFile,
  busyAction,
  onlineCheckEnabled,
  onlineCheckTime,
  onlineCheckBusy,
  onlineCheckResult,
  onSiteNameChange,
  onFileChange,
  onExport,
  onImport,
  onReset,
  onOnlineCheckToggle,
  onOnlineCheckTimeChange,
  onRunOnlineCheck,
}: {
  siteName: string;
  siteNameBusy: boolean;
  selectedFile: File | null;
  busyAction: "import" | "export" | "reset" | null;
  onlineCheckEnabled: boolean;
  onlineCheckTime: number;
  onlineCheckBusy: boolean;
  onlineCheckResult: { checked: number; online: number; offline: number } | null;
  onSiteNameChange: (name: string) => void;
  onFileChange: (file: File | null) => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onOnlineCheckToggle: (enabled: boolean) => void;
  onOnlineCheckTimeChange: (hour: number) => void;
  onRunOnlineCheck: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">站点名称</h3>
        <p className="mt-1 text-sm text-white/65">
          设置显示在浏览器标签和导航栏中的网站名称。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            value={siteName}
            onChange={(e) => onSiteNameChange(e.target.value)}
            maxLength={30}
            placeholder="输入站点名称"
            className="flex-1 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
          />
          {siteNameBusy ? (
            <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-white/60" />
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">网站在线检测</h3>
            <p className="mt-1 text-sm text-white/65">
              定期检测网站是否可正常访问，在卡片左上角显示状态圆点。
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={onlineCheckEnabled}
            onClick={() => onOnlineCheckToggle(!onlineCheckEnabled)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${onlineCheckEnabled ? "border-emerald-400/30 bg-emerald-500/30" : "border-white/12 bg-white/10"}`}
          >
            <span className={`inline-block h-5 w-5 rounded-full transition-transform ${onlineCheckEnabled ? "translate-x-6 bg-emerald-400" : "translate-x-1 bg-white/50"}`} />
          </button>
        </div>

        {onlineCheckEnabled ? (
          <div className="mt-4 space-y-4">
            <label className="grid gap-1.5 text-sm">
              <span className="text-white/78">每日检测时间点（时）</span>
              <input
                type="number"
                value={onlineCheckTime}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || raw === "-") return;
                  let v = Number(raw);
                  if (!Number.isFinite(v)) return;
                  if (v < 0) v = 23;
                  else if (v > 23) v = 0;
                  onOnlineCheckTimeChange(v);
                }}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v) || v < 0 || v > 23) onOnlineCheckTimeChange(0);
                }}
                className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none"
              />
            </label>
            <p className="text-xs text-white/50">
              每天在设定的小时自动检测一次所有网站是否可正常访问。
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onRunOnlineCheck}
                disabled={onlineCheckBusy}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {onlineCheckBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                立即检测
              </button>
              {onlineCheckResult ? (
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Wifi className="h-3.5 w-3.5" /> {onlineCheckResult.online} 在线
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <WifiOff className="h-3.5 w-3.5" /> {onlineCheckResult.offline} 离线
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">导出配置</h3>
        <p className="mt-1 text-sm text-white/65">
          将当前网站配置导出为 JSON 文件，可用于备份或迁移。
        </p>
        <button
          type="button"
          onClick={onExport}
          disabled={busyAction === "export"}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busyAction === "export" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          导出配置文件
        </button>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-5">
        <h3 className="text-lg font-semibold">导入配置</h3>
        <p className="mt-1 text-sm text-white/65">
          从 JSON 文件导入配置，将覆盖当前所有设置。
        </p>
        <div className="mt-4 space-y-3">
          <label className="grid gap-2 text-sm">
            <span className="text-white/78">选择配置文件</span>
            <input
              type="file"
              accept=".json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                onFileChange(file ?? null);
              }}
              className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </label>
          {selectedFile ? (
            <p className="text-sm text-white/70">
              已选择: {selectedFile.name}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onImport}
            disabled={!selectedFile || busyAction === "import"}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-medium text-white/84 transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busyAction === "import" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            导入配置
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-rose-500/20 bg-rose-500/6 p-5">
        <h3 className="text-lg font-semibold text-rose-100">恢复默认</h3>
        <p className="mt-1 text-sm text-white/65">
          将所有配置重置为初始状态，此操作不可撤销。
        </p>
        <button
          type="button"
          onClick={onReset}
          disabled={busyAction === "reset"}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busyAction === "reset" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          恢复默认配置
        </button>
      </section>
    </div>
  );
}
