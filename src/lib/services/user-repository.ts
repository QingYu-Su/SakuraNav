/**
 * @description 用户数据仓库 - 管理注册用户的增删改查
 */

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import fs from "node:fs";
import path from "node:path";
import type { User } from "@/lib/base/types";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("UserRepository");

const KEY_LENGTH = 64;

/** 用户数据库行类型（含密码哈希，仅内部使用） */
type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  nickname: string | null;
  avatar_asset_id: string | null;
  avatar_color: string | null;
  created_at: string;
};

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role as User["role"],
    nickname: row.nickname,
    avatarAssetId: row.avatar_asset_id,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
  };
}

/**
 * 哈希密码
 * @param password 明文密码
 * @returns 格式为 "salt:hash" 的哈希字符串
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${key}`;
}

/**
 * 验证密码
 * @param password 明文密码
 * @param storedHash 存储的哈希字符串
 * @returns 密码是否匹配
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(derivedKey, Buffer.from(key, "hex"));
}

/** 获取所有注册用户 */
export function getAllUsers(): User[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, username, role, nickname, avatar_asset_id, avatar_color, created_at FROM users ORDER BY created_at ASC").all() as UserRow[];
  return rows.map(mapUserRow);
}

/** 根据 ID 获取用户 */
export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT id, username, role, nickname, avatar_asset_id, avatar_color, created_at FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? mapUserRow(row) : null;
}

/** 根据用户名获取用户（含密码哈希，仅用于认证） */
export function getUserByUsernameWithHash(username: string): (User & { passwordHash: string }) | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
  if (!row) return null;
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash,
  };
}

/** 检查用户名是否已存在 */
export function isUsernameTaken(username: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM users WHERE username = ?").get(username);
  return !!row;
}

/** 预定义的头像背景色（适合头像展示的柔和色系） */
const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#2563eb",
];

/** 随机生成头像背景色 */
function randomAvatarColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * 注册新用户
 * @param username 用户名
 * @param password 明文密码
 * @returns 新创建的用户
 */
export function createUser(username: string, password: string): User {
  const db = getDb();
  const id = `user-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const hash = hashPassword(password);
  const avatarColor = randomAvatarColor();

  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, nickname, avatar_color, created_at) VALUES (?, ?, ?, 'user', ?, ?, ?)"
  ).run(id, username, hash, username, avatarColor, now);

  logger.info("用户注册成功", { username, id });
  return { id, username, role: "user", nickname: username, avatarAssetId: null, avatarColor, createdAt: now };
}

/**
 * 删除用户及其所有数据
 * @param userId 用户 ID
 */
export function deleteUser(userId: string): void {
  const db = getDb();

  // 收集用户的资源文件路径
  const userAssets = db.prepare("SELECT file_path FROM assets WHERE file_path LIKE ?").all(
    `%${path.sep}uploads${path.sep}${userId}${path.sep}%`
  ) as Array<{ file_path: string }>;

  // 级联删除用户的标签和站点
  const transaction = db.transaction(() => {
    // 获取用户的所有站点 ID
    const siteIds = db.prepare("SELECT id FROM sites WHERE owner_id = ?").all(userId) as Array<{ id: string }>;
    // 删除 site_tags 关联
    for (const { id } of siteIds) {
      db.prepare("DELETE FROM site_tags WHERE site_id = ?").run(id);
    }
    // 删除用户的站点
    db.prepare("DELETE FROM sites WHERE owner_id = ?").run(userId);
    // 获取用户的标签 ID
    const tagIds = db.prepare("SELECT id FROM tags WHERE owner_id = ?").all(userId) as Array<{ id: string }>;
    // 删除 site_tags 中涉及这些标签的关联
    for (const { id } of tagIds) {
      db.prepare("DELETE FROM site_tags WHERE tag_id = ?").run(id);
    }
    // 删除用户的标签
    db.prepare("DELETE FROM tags WHERE owner_id = ?").run(userId);
    // 删除用户的资源记录
    for (const asset of userAssets) {
      db.prepare("DELETE FROM assets WHERE file_path = ?").run(asset.file_path);
    }
    // 删除用户
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });
  transaction();

  // 清理用户的资源文件和上传目录
  for (const asset of userAssets) {
    if (fs.existsSync(asset.file_path)) {
      fs.rmSync(asset.file_path, { force: true });
    }
  }
  const userUploadsDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", userId);
  if (fs.existsSync(userUploadsDir)) {
    fs.rmSync(userUploadsDir, { recursive: true, force: true });
  }

  logger.info("用户已删除", { userId });
}

/**
 * 更新用户角色
 * @param userId 用户 ID
 * @param role 新角色
 */
export function updateUserRole(userId: string, role: "user" | "superuser"): void {
  const db = getDb();
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  logger.info("用户角色已更新", { userId, role });
}

/**
 * 复制管理员数据到新用户空间
 * @param newUserId 新用户 ID
 */
export function copyAdminDataToUser(newUserId: string): void {
  const db = getDb();

  // 建立旧标签 ID → 新标签 ID 的映射
  const tagIdMap = new Map<string, string>();

  const transaction = db.transaction(() => {
    // 1. 复制标签
    const adminTags = db.prepare("SELECT * FROM tags WHERE owner_id = ?").all(ADMIN_USER_ID) as Array<{
      id: string; name: string; slug: string; sort_order: number; is_hidden: number;
      logo_url: string | null; logo_bg_color: string | null; description: string | null;
    }>;

    const insertTag = db.prepare(`
      INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const tag of adminTags) {
      const newTagId = `tag-${crypto.randomUUID()}`;
      tagIdMap.set(tag.id, newTagId);
      insertTag.run(
        newTagId, tag.name, tag.slug, tag.sort_order, tag.is_hidden,
        tag.logo_url, tag.logo_bg_color, tag.description, newUserId
      );
    }

    // 2. 复制站点
    const adminSites = db.prepare("SELECT * FROM sites WHERE owner_id = ?").all(ADMIN_USER_ID) as Array<{
      id: string; name: string; url: string; description: string | null;
      icon_url: string | null; icon_bg_color: string | null; is_online: number | null;
      skip_online_check: number; is_pinned: number; global_sort_order: number;
      card_type: string | null; card_data: string | null; created_at: string; updated_at: string;
    }>;

    const insertSite = db.prepare(`
      INSERT INTO sites (id, name, url, description, icon_url, icon_bg_color, is_online, skip_online_check, is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSiteTag = db.prepare(`
      INSERT INTO site_tags (site_id, tag_id, sort_order) VALUES (?, ?, ?)
    `);

    for (const site of adminSites) {
      const newSiteId = `site-${crypto.randomUUID()}`;
      insertSite.run(
        newSiteId, site.name, site.url, site.description, site.icon_url, site.icon_bg_color,
        site.is_online, site.skip_online_check, site.is_pinned, site.global_sort_order,
        site.card_type, site.card_data, newUserId, site.created_at, site.updated_at
      );

      // 复制 site_tags 关联（映射到新标签 ID）
      const siteTags = db.prepare("SELECT tag_id, sort_order FROM site_tags WHERE site_id = ?").all(site.id) as Array<{
        tag_id: string; sort_order: number;
      }>;

      for (const st of siteTags) {
        const newTagId = tagIdMap.get(st.tag_id);
        if (newTagId) {
          insertSiteTag.run(newSiteId, newTagId, st.sort_order);
        }
      }
    }

    // 3. 复制外观配置（theme_appearances）
    const adminAppearances = db.prepare("SELECT * FROM theme_appearances WHERE owner_id = ?").all(ADMIN_USER_ID) as Array<{
      theme: string; wallpaper_asset_id: string | null; desktop_wallpaper_asset_id: string | null;
      mobile_wallpaper_asset_id: string | null; font_preset: string; font_size: number;
      overlay_opacity: number; text_color: string; logo_asset_id: string | null;
      favicon_asset_id: string | null; card_frosted: number; desktop_card_frosted: number;
      mobile_card_frosted: number; is_default: number;
    }>;

    const insertAppearance = db.prepare(`
      INSERT INTO theme_appearances (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
        mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
        logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const appearance of adminAppearances) {
      insertAppearance.run(
        newUserId, appearance.theme, appearance.wallpaper_asset_id, appearance.desktop_wallpaper_asset_id,
        appearance.mobile_wallpaper_asset_id, appearance.font_preset, appearance.font_size,
        appearance.overlay_opacity, appearance.text_color, appearance.logo_asset_id,
        appearance.favicon_asset_id, appearance.card_frosted, appearance.desktop_card_frosted,
        appearance.mobile_card_frosted, appearance.is_default
      );
    }
  });

  transaction();
  logger.info("管理员数据已复制到新用户", { newUserId, tagCount: tagIdMap.size });
}

/**
 * 更新用户昵称
 * @param userId 用户 ID
 * @param nickname 新昵称（null 表示清空）
 */
export function updateUserNickname(userId: string, nickname: string | null): void {
  const db = getDb();
  db.prepare("UPDATE users SET nickname = ? WHERE id = ?").run(nickname, userId);
  logger.info("用户昵称已更新", { userId, nickname });
}

/**
 * 更新用户头像资源 ID
 * @param userId 用户 ID
 * @param avatarAssetId 头像资源 ID（null 表示清空）
 */
export function updateUserAvatar(userId: string, avatarAssetId: string | null): void {
  const db = getDb();
  db.prepare("UPDATE users SET avatar_asset_id = ? WHERE id = ?").run(avatarAssetId, userId);
  logger.info("用户头像已更新", { userId, avatarAssetId });
}

/**
 * 更新用户密码
 * @param userId 用户 ID
 * @param newPassword 新密码（明文）
 */
export function updateUserPassword(userId: string, newPassword: string): void {
  const db = getDb();
  const hash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
  logger.info("用户密码已更新", { userId });
}
