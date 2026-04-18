/**
 * 配置操作 Hook
 * @description 管理配置导出/导入/重置、确认弹窗等逻辑
 */

import { useState } from "react";
import type { AdminBootstrap, AppSettings, ThemeMode, ThemeAppearance, Tag } from "@/lib/base/types";
import { requestJson } from "@/lib/base/api";
import { configActionLabels } from "@/components/dialogs";
import type { ConfigConfirmAction } from "@/components/dialogs/config-confirm-dialog";
import type { SiteFormState, TagFormState, AdminGroup } from "@/components/admin";
import { defaultSiteForm, defaultTagForm } from "@/components/admin";

export interface UseConfigActionsOptions {
  applyAdminBootstrap: (data: AdminBootstrap) => void;
  setAppearances: (v: Record<ThemeMode, ThemeAppearance>) => void;
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  setSettings: (v: AppSettings) => void;
  setSettingsDraft: (v: AppSettings) => void;
  setSiteForm: React.Dispatch<React.SetStateAction<SiteFormState>>;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormState>>;
  setSiteAdminGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  setTagAdminGroup: React.Dispatch<React.SetStateAction<AdminGroup>>;
  searchBarSetQuery: React.Dispatch<React.SetStateAction<string>>;
  setRefreshNonce: React.Dispatch<React.SetStateAction<number>>;
  setMessage: (msg: string) => void;
  setErrorMessage: (msg: string) => void;
}

export interface UseConfigActionsReturn {
  configImportFile: File | null;
  setConfigImportFile: React.Dispatch<React.SetStateAction<File | null>>;
  configConfirmAction: ConfigConfirmAction | null;
  configConfirmPassword: string;
  configConfirmError: string;
  configBusyAction: "import" | "export" | "reset" | null;
  openConfigConfirm: (action: ConfigConfirmAction) => void;
  closeConfigConfirm: () => void;
  submitConfigConfirm: () => Promise<void>;
  handlePasswordChange: (v: string) => void;
}

export function useConfigActions(opts: UseConfigActionsOptions): UseConfigActionsReturn {
  const {
    applyAdminBootstrap,
    setAppearances,
    setTags,
    setSettings,
    setSettingsDraft,
    setSiteForm,
    setTagForm,
    setSiteAdminGroup,
    setTagAdminGroup,
    searchBarSetQuery,
    setRefreshNonce,
    setMessage,
    setErrorMessage,
  } = opts;

  const [configImportFile, setConfigImportFile] = useState<File | null>(null);
  const [configConfirmAction, setConfigConfirmAction] = useState<ConfigConfirmAction | null>(null);
  const [configConfirmPassword, setConfigConfirmPassword] = useState("");
  const [configConfirmError, setConfigConfirmError] = useState("");
  const [configBusyAction, setConfigBusyAction] = useState<"import" | "export" | "reset" | null>(null);

  function openConfigConfirm(action: ConfigConfirmAction) {
    if (action === "import" && !configImportFile) {
      setErrorMessage("请先选择要导入的配置压缩包。");
      return;
    }
    setConfigConfirmAction(action);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
  }

  function closeConfigConfirm() {
    if (configBusyAction) return;
    setConfigConfirmAction(null);
    setConfigConfirmPassword("");
    setConfigConfirmError("");
  }

  function handlePasswordChange(v: string) {
    setConfigConfirmPassword(v);
    if (configConfirmError) setConfigConfirmError("");
  }

  async function exportConfig(password: string) {
    setConfigBusyAction("export");
    try {
      const response = await fetch("/api/config/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const d = await response.json().catch(() => null);
        throw new Error((d as Record<string, string>)?.error ?? "导出配置失败");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+?)"/i);
      link.href = url;
      link.download = match?.[1] ?? "sakuranav-config.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage("配置压缩包已生成，浏览器会开始下载。");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function importConfig(password: string) {
    if (!configImportFile) throw new Error("请先选择要导入的配置压缩包。");
    setConfigBusyAction("import");
    try {
      const formData = new FormData();
      formData.append("file", configImportFile);
      formData.append("password", password);
      const data = await requestJson<AdminBootstrap>("/api/config/import", {
        method: "POST",
        body: formData,
      });
      applyAdminBootstrap(data);
      setAppearances(data.appearances);
      setTags(data.tags);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      setSiteAdminGroup("create");
      setTagAdminGroup("create");
      setConfigImportFile(null);
      setRefreshNonce((v) => v + 1);
      setMessage("配置压缩包已导入，当前导航数据已刷新。");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function resetConfig(password: string) {
    setConfigBusyAction("reset");
    try {
      const data = await requestJson<AdminBootstrap>("/api/config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      applyAdminBootstrap(data);
      setTags(data.tags);
      setAppearances(data.appearances);
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSiteForm(defaultSiteForm);
      setTagForm(defaultTagForm);
      searchBarSetQuery("");
      setRefreshNonce((v) => v + 1);
      setMessage("已恢复默认内容配置。");
    } finally {
      setConfigBusyAction(null);
    }
  }

  async function submitConfigConfirm() {
    if (!configConfirmAction || !configConfirmPassword.trim()) {
      if (!configConfirmPassword.trim()) setConfigConfirmError("请输入当前账号密码。");
      return;
    }
    setConfigConfirmError("");
    try {
      if (configConfirmAction === "export") {
        await exportConfig(configConfirmPassword);
      } else if (configConfirmAction === "import") {
        await importConfig(configConfirmPassword);
      } else {
        await resetConfig(configConfirmPassword);
      }
      setConfigConfirmAction(null);
      setConfigConfirmPassword("");
      setConfigConfirmError("");
    } catch (e) {
      setConfigConfirmError(
        e instanceof Error ? e.message : `${configActionLabels[configConfirmAction]}失败`,
      );
    }
  }

  return {
    configImportFile,
    setConfigImportFile,
    configConfirmAction,
    configConfirmPassword,
    configConfirmError,
    configBusyAction,
    openConfigConfirm,
    closeConfigConfirm,
    submitConfigConfirm,
    handlePasswordChange,
  };
}
