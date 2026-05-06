/**
 * 切换用户 Hook
 * @description 管理可切换用户列表（localStorage 持久化）、弹窗状态、切换/删除回调
 */

"use client";

import { useState } from "react";
import type { SwitchableUser } from "@/components/dialogs/switch-user-dialog";

const STORAGE_KEY = "sakura-switchable-users";

/** 从 localStorage 加载可切换用户列表 */
function loadUsers(): SwitchableUser[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as SwitchableUser[]) : [];
  } catch {
    return [];
  }
}

/** 持久化用户列表到 localStorage */
function saveUsers(users: SwitchableUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    /* 静默 */
  }
}

/**
 * 将当前用户加入可切换列表（如果尚未存在）
 * 直接操作 localStorage 并返回更新后的列表
 */
function addUserToList(
  prev: SwitchableUser[],
  session: {
    userId: string;
    username: string;
    nickname: string | null;
    avatarUrl: string | null;
    avatarColor: string | null;
  },
): SwitchableUser[] {
  const existing = prev.find((u) => u.userId === session.userId);
  // 同步最新的头像、昵称等展示信息到已有条目
  const freshInfo: SwitchableUser = {
    userId: session.userId,
    username: session.username,
    nickname: session.nickname,
    avatarUrl: session.avatarUrl,
    avatarColor: session.avatarColor,
  };
  if (!existing) {
    const updated = [...prev, freshInfo];
    saveUsers(updated);
    return updated;
  }
  // 已存在但信息有变化时，就地更新
  if (
    existing.avatarUrl !== freshInfo.avatarUrl
    || existing.avatarColor !== freshInfo.avatarColor
    || existing.nickname !== freshInfo.nickname
  ) {
    const updated = prev.map((u) => u.userId === session.userId ? freshInfo : u);
    saveUsers(updated);
    return updated;
  }
  return prev;
}

export function useSwitchUser(isAuthenticated: boolean, session: {
  userId: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
} | null) {
  const [open, setOpen] = useState(false);

  // 初始化时从 localStorage 加载，并确保当前用户在列表中
  const [users, setUsers] = useState<SwitchableUser[]>(() => {
    const loaded = loadUsers();
    if (isAuthenticated && session) {
      return addUserToList(loaded, session);
    }
    return loaded;
  });

  /** 从列表中移除用户 */
  function removeUser(userId: string) {
    setUsers((prev) => {
      const updated = prev.filter((u) => u.userId !== userId);
      saveUsers(updated);
      return updated;
    });
  }

  /** 切换成功回调 — 刷新页面加载新用户数据 */
  function handleSwitched(_user: { username: string; userId: string; role: string }) {
    window.location.reload();
  }

  return {
    switchUserOpen: open,
    setSwitchUserOpen: setOpen,
    switchableUsers: users,
    handleUserSwitched: handleSwitched,
    handleRemoveSwitchableUser: removeUser,
  };
}
