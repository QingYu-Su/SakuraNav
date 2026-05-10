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

/**
 * scrypt 参数
 * N=16384 (2^14), r=8, p=1 — 内存约 2MB，兼容性良好
 * 注意：修改参数后已有用户的密码哈希将无法验证，需重新设置密码
 */
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
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
  const key = scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS).toString("hex");
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
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return timingSafeEqual(derivedKey, Buffer.from(key, "hex"));
}

/** 获取所有注册用户 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  const rows = await db.query<UserRow>("SELECT id, username, role, nickname, avatar_asset_id, avatar_color, created_at FROM users ORDER BY created_at ASC");
  return rows.map(mapUserRow);
}

/** 根据 ID 获取用户 */
export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const row = await db.queryOne<UserRow>("SELECT id, username, role, nickname, avatar_asset_id, avatar_color, created_at FROM users WHERE id = ?", [id]);
  return row ? mapUserRow(row) : null;
}

/** 根据用户名获取用户（含密码哈希，仅用于认证） */
export async function getUserByUsernameWithHash(username: string): Promise<(User & { passwordHash: string }) | null> {
  const db = await getDb();
  const row = await db.queryOne<UserRow>("SELECT * FROM users WHERE username = ?", [username]);
  if (!row) return null;
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash,
  };
}

/** 检查用户名是否已存在 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.queryOne("SELECT 1 FROM users WHERE username = ?", [username]);
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
export async function createUser(username: string, password: string): Promise<User> {
  const db = await getDb();
  const id = `user-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const hash = hashPassword(password);
  const avatarColor = randomAvatarColor();

  await db.execute(
    "INSERT INTO users (id, username, password_hash, role, nickname, avatar_color, created_at, has_password) VALUES (?, ?, ?, 'user', ?, ?, ?, 1)",
    [id, username, hash, username, avatarColor, now]
  );

  logger.info("用户注册成功", { username, id });
  return { id, username, role: "user", nickname: username, avatarAssetId: null, avatarColor, createdAt: now };
}

/**
 * 创建 OAuth 用户（自动生成随机用户名和密码）
 * @param provider OAuth 供应商
 * @param displayName 供应商返回的显示名称（用作昵称）
 * @returns 新创建的用户
 */
export async function createOAuthUser(provider: string, displayName?: string | null): Promise<User> {
  const db = await getDb();
  const id = `user-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  // 生成随机用户名：oauth_ + 8 位随机字符
  const randomSuffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const username = `oauth_${randomSuffix}`;
  // 生成随机密码（用户不需要知道，后续可自行设置）
  const randomPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const hash = hashPassword(randomPassword);
  const avatarColor = randomAvatarColor();
  const nickname = displayName || username;

  await db.execute(
    "INSERT INTO users (id, username, password_hash, role, nickname, avatar_color, created_at, has_password, username_changed) VALUES (?, ?, ?, 'user', ?, ?, ?, 0, 0)",
    [id, username, hash, nickname, avatarColor, now]
  );

  logger.info("OAuth 用户创建成功", { provider, username, id });
  return { id, username, role: "user", nickname, avatarAssetId: null, avatarColor, createdAt: now };
}

/**
 * 删除用户及其所有数据
 * @param userId 用户 ID
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = await getDb();

  // 收集用户的资源文件路径
  const userAssets = await db.query<{ file_path: string }>(
    "SELECT file_path FROM assets WHERE file_path LIKE ?",
    [`%${path.sep}uploads${path.sep}${userId}${path.sep}%`]
  );

  // 级联删除用户的标签和站点
  await db.transaction(async () => {
    // 获取用户的所有站点 ID
    const siteIds = await db.query<{ id: string }>("SELECT id FROM cards WHERE owner_id = ?", [userId]);
    // 删除 card_tags 关联
    for (const { id } of siteIds) {
      await db.execute("DELETE FROM card_tags WHERE card_id = ?", [id]);
    }
    // 删除用户的站点
    await db.execute("DELETE FROM cards WHERE owner_id = ?", [userId]);
    // 获取用户的标签 ID
    const tagIds = await db.query<{ id: string }>("SELECT id FROM tags WHERE owner_id = ?", [userId]);
    // 删除 card_tags 中涉及这些标签的关联
    for (const { id } of tagIds) {
      await db.execute("DELETE FROM card_tags WHERE tag_id = ?", [id]);
    }
    // 删除用户的标签
    await db.execute("DELETE FROM tags WHERE owner_id = ?", [userId]);
    // 删除用户的外观配置
    await db.execute("DELETE FROM theme_appearances WHERE owner_id = ?", [userId]);
    // 删除用户的资源记录
    for (const asset of userAssets) {
      await db.execute("DELETE FROM assets WHERE file_path = ?", [asset.file_path]);
    }
    // 删除用户的通知配置
    await db.execute("DELETE FROM notification_channels WHERE owner_id = ?", [userId]);
    // 删除用户
    await db.execute("DELETE FROM users WHERE id = ?", [userId]);
  });

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
 * @param role 新角色（当前版本仅支持 "user"）
 */
export async function updateUserRole(userId: string, role: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
  logger.info("用户角色已更新", { userId, role });
}

/**
 * 复制管理员数据到新用户空间
 * @param newUserId 新用户 ID
 */
export async function copyAdminDataToUser(newUserId: string): Promise<void> {
  const db = await getDb();

  // 建立旧标签 ID → 新标签 ID 的映射
  const tagIdMap = new Map<string, string>();

  await db.transaction(async () => {
    // 1. 复制标签
    const adminTags = await db.query<{
      id: string; name: string; slug: string; sort_order: number; is_hidden: number;
      logo_url: string | null; logo_bg_color: string | null; description: string | null;
    }>("SELECT * FROM tags WHERE owner_id = ?", [ADMIN_USER_ID]);

    for (const tag of adminTags) {
      const newTagId = `tag-${crypto.randomUUID()}`;
      tagIdMap.set(tag.id, newTagId);
      await db.execute(`
        INSERT INTO tags (id, name, slug, sort_order, is_hidden, logo_url, logo_bg_color, description, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newTagId, tag.name, tag.slug, tag.sort_order, tag.is_hidden,
          tag.logo_url, tag.logo_bg_color, tag.description, newUserId]);
    }

    // 2. 复制站点
    const adminSites = await db.query<{
      id: string; name: string; site_url: string; site_description: string | null;
      icon_url: string | null; icon_bg_color: string | null; site_is_online: number | null;
      site_skip_online_check: number; site_is_pinned: number; global_sort_order: number;
      card_type: string | null; card_data: string | null; created_at: string; updated_at: string;
    }>("SELECT * FROM cards WHERE owner_id = ?", [ADMIN_USER_ID]);

    for (const site of adminSites) {
      const newCardId = `site-${crypto.randomUUID()}`;
      await db.execute(`
        INSERT INTO cards (id, name, site_url, site_description, icon_url, icon_bg_color, site_is_online, site_skip_online_check, site_is_pinned, global_sort_order, card_type, card_data, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newCardId, site.name, site.site_url, site.site_description, site.icon_url, site.icon_bg_color,
          site.site_is_online, site.site_skip_online_check, site.site_is_pinned, site.global_sort_order,
          site.card_type, site.card_data, newUserId, site.created_at, site.updated_at]);

      // 复制 card_tags 关联（映射到新标签 ID）
      const cardTags = await db.query<{
        tag_id: string; sort_order: number;
      }>("SELECT tag_id, sort_order FROM card_tags WHERE card_id = ?", [site.id]);

      for (const st of cardTags) {
        const newTagId = tagIdMap.get(st.tag_id);
        if (newTagId) {
          await db.execute(`INSERT INTO card_tags (card_id, tag_id, sort_order) VALUES (?, ?, ?)`, [newCardId, newTagId, st.sort_order]);
        }
      }
    }

    // 3. 复制外观配置（theme_appearances）
    const adminAppearances = await db.query<{
      theme: string; wallpaper_asset_id: string | null; desktop_wallpaper_asset_id: string | null;
      mobile_wallpaper_asset_id: string | null; font_preset: string; font_size: number;
      overlay_opacity: number; text_color: string; logo_asset_id: string | null;
      favicon_asset_id: string | null; card_frosted: number; desktop_card_frosted: number;
      mobile_card_frosted: number; is_default: number;
    }>("SELECT * FROM theme_appearances WHERE owner_id = ?", [ADMIN_USER_ID]);

    for (const appearance of adminAppearances) {
      await db.execute(`
        INSERT INTO theme_appearances (owner_id, theme, wallpaper_asset_id, desktop_wallpaper_asset_id,
          mobile_wallpaper_asset_id, font_preset, font_size, overlay_opacity, text_color,
          logo_asset_id, favicon_asset_id, card_frosted, desktop_card_frosted, mobile_card_frosted, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [newUserId, appearance.theme, appearance.wallpaper_asset_id, appearance.desktop_wallpaper_asset_id,
          appearance.mobile_wallpaper_asset_id, appearance.font_preset, appearance.font_size,
          appearance.overlay_opacity, appearance.text_color, appearance.logo_asset_id,
          appearance.favicon_asset_id, appearance.card_frosted, appearance.desktop_card_frosted,
          appearance.mobile_card_frosted, appearance.is_default]);
    }
  });

  logger.info("管理员数据已复制到新用户", { newUserId, tagCount: tagIdMap.size });
}

/**
 * 更新用户昵称
 * @param userId 用户 ID
 * @param nickname 新昵称（null 表示清空）
 */
export async function updateUserNickname(userId: string, nickname: string | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE users SET nickname = ? WHERE id = ?", [nickname, userId]);
  logger.info("用户昵称已更新", { userId, nickname });
}

/**
 * 更新用户头像资源 ID
 * @param userId 用户 ID
 * @param avatarAssetId 头像资源 ID（null 表示清空）
 */
export async function updateUserAvatar(userId: string, avatarAssetId: string | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE users SET avatar_asset_id = ? WHERE id = ?", [avatarAssetId, userId]);
  logger.info("用户头像已更新", { userId, avatarAssetId });
}

/**
 * 更新用户密码
 * @param userId 用户 ID
 * @param newPassword 新密码（明文）
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const db = await getDb();
  const hash = hashPassword(newPassword);
  await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
  logger.info("用户密码已更新", { userId });
}

/**
 * 检查管理员是否已初始化（users 表中存在 id = ADMIN_USER_ID 的记录）
 */
export async function isAdminInitialized(): Promise<boolean> {
  try {
    const db = await getDb();
    const row = await db.queryOne("SELECT 1 FROM users WHERE id = ?", [ADMIN_USER_ID]);
    return !!row;
  } catch {
    return false;
  }
}

/**
 * 初始化管理员账户（仅在引导设置页调用一次）
 * @param username 管理员用户名
 * @param password 管理员密码
 * @returns 创建的管理员用户
 */
export async function initializeAdmin(username: string, password: string): Promise<User> {
  const db = await getDb();
  const now = new Date().toISOString();
  const hash = hashPassword(password);
  const avatarColor = randomAvatarColor();

  await db.execute(
    "INSERT INTO users (id, username, password_hash, role, nickname, avatar_color, created_at) VALUES (?, ?, ?, 'admin', ?, ?, ?)",
    [ADMIN_USER_ID, username, hash, username, avatarColor, now]
  );

  logger.info("管理员账户初始化成功", { username });
  return { id: ADMIN_USER_ID, username, role: "admin", nickname: username, avatarAssetId: null, avatarColor, createdAt: now };
}

/**
 * 获取管理员信息（含密码哈希，仅用于认证）
 */
export async function getAdminWithHash(): Promise<(User & { passwordHash: string }) | null> {
  return getUserByUsernameWithHashById(ADMIN_USER_ID);
}

/**
 * 根据 ID 获取用户（含密码哈希，仅用于认证）
 */
export async function getUserByUsernameWithHashById(id: string): Promise<(User & { passwordHash: string }) | null> {
  const db = await getDb();
  const row = await db.queryOne<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  if (!row) return null;
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash,
  };
}

/**
 * 更新管理员用户名
 */
export async function updateAdminUsername(username: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE users SET username = ?, nickname = COALESCE(nickname, ?) WHERE id = ?", [username, username, ADMIN_USER_ID]);
  logger.info("管理员用户名已更新", { username });
}

/**
 * 更新用户用户名（仅允许修改一次）
 * @param userId 用户 ID
 * @param newUsername 新用户名
 * @returns 是否修改成功（false 表示已修改过）
 */
export async function updateUserUsername(userId: string, newUsername: string): Promise<boolean> {
  const db = await getDb();
  const user = await db.queryOne<{ username_changed: number }>("SELECT username_changed FROM users WHERE id = ?", [userId]);
  if (!user || user.username_changed === 1) {
    logger.warning("用户名修改失败: 已修改过或用户不存在", { userId });
    return false;
  }
  await db.execute("UPDATE users SET username = ?, username_changed = 1 WHERE id = ?", [newUsername, userId]);
  logger.info("用户名已修改", { userId, newUsername });
  return true;
}

/**
 * 标记用户已设置密码（OAuth 用户首次设置密码后调用）
 */
export async function markUserHasPassword(userId: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE users SET has_password = 1 WHERE id = ?", [userId]);
  logger.info("用户密码已标记为已设置", { userId });
}

/**
 * 检查用户是否已设置密码
 */
export async function userHasPassword(userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.queryOne<{ has_password: number }>("SELECT has_password FROM users WHERE id = ?", [userId]);
  return row ? row.has_password === 1 : true;
}
