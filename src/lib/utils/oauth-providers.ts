/**
 * @description OAuth 供应商工具 - 定义各 OAuth 供应商的授权 URL、Token 交换和用户信息获取逻辑
 * 所有 HTTP 请求均在服务端执行，client_secret 不会暴露给客户端
 */

import "server-only";
import type { OAuthProvider, OAuthProviderConfig } from "@/lib/base/types";
import { OAUTH_PROVIDERS } from "@/lib/base/types";
import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("OAuthProviders");

const OAUTH_SETTINGS_KEY = "oauth_providers";
const OAUTH_BASE_URL_KEY = "oauth_base_url";

export async function getOAuthBaseUrl(): Promise<string> {
  try {
    const db = await getDb();
    const row = await db.queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", [OAUTH_BASE_URL_KEY]);
    return row?.value ?? "";
  } catch { return ""; }
}

export async function saveOAuthBaseUrl(url: string): Promise<void> {
  const db = await getDb();
  await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", [OAUTH_BASE_URL_KEY, url]);
  logger.info("OAuth 基础 URL 已保存:", url);
}

export async function getOAuthConfigs(): Promise<Record<string, OAuthProviderConfig>> {
  try {
    const db = await getDb();
    const row = await db.queryOne<{ value: string }>("SELECT value FROM app_settings WHERE key = ?", [OAUTH_SETTINGS_KEY]);
    if (!row?.value) return {};
    return JSON.parse(row.value) as Record<string, OAuthProviderConfig>;
  } catch { return {}; }
}

export async function saveOAuthConfigs(configs: Record<string, OAuthProviderConfig>): Promise<void> {
  const db = await getDb();
  await db.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)", [OAUTH_SETTINGS_KEY, JSON.stringify(configs)]);
  logger.info("OAuth 配置已保存");
}

export async function getOAuthConfig(provider: string): Promise<OAuthProviderConfig | null> {
  const configs = await getOAuthConfigs();
  return configs[provider] ?? null;
}

export async function getEnabledOAuthProviders(): Promise<Array<{ key: OAuthProvider; label: string; color: string }>> {
  const configs = await getOAuthConfigs();
  return OAUTH_PROVIDERS.filter((p) => configs[p.key]?.enabled).map((p) => ({ key: p.key, label: p.label, color: p.color }));
}

export function buildAuthorizationUrl(provider: OAuthProvider, config: OAuthProviderConfig, redirectUri: string, state: string): string {
  switch (provider) {
    case "github": return `https://github.com/login/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email&state=${state}`;
    case "wechat": return `https://open.weixin.qq.com/connect/qrconnect?appid=${config.appId || config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
    case "wecom": return `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${config.corpId}&agentid=${config.agentId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    case "feishu": return `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${config.appId || config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    case "dingtalk": return `https://login.dingtalk.com/login/qrcode.htm?appid=${config.appId || config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&scope=openid`;
    default: throw new Error(`不支持的 OAuth 供应商: ${provider}`);
  }
}

type OAuthUserInfo = { id: string; displayName: string | null; avatarUrl: string | null; email: string | null; raw: Record<string, string> };

export async function exchangeCodeForUser(provider: OAuthProvider, config: OAuthProviderConfig, code: string, redirectUri: string): Promise<OAuthUserInfo> {
  switch (provider) {
    case "github": return exchangeGitHub(config, code, redirectUri);
    case "wechat": return exchangeWeChat(config, code);
    case "wecom": return exchangeWeCom(config, code);
    case "feishu": return exchangeFeishu(config, code, redirectUri);
    case "dingtalk": return exchangeDingTalk(config, code);
    default: throw new Error(`不支持的 OAuth 供应商: ${provider}`);
  }
}

async function exchangeGitHub(config: OAuthProviderConfig, code: string, redirectUri: string): Promise<OAuthUserInfo> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: redirectUri }) });
  const tokenData = await tokenRes.json() as Record<string, string>;
  const accessToken = tokenData.access_token;
  if (!accessToken) { logger.error("GitHub Token 交换失败", { error: tokenData.error_description || tokenData.error }); throw new Error("GitHub 授权失败: 无法获取访问令牌"); }
  const userRes = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } });
  const userData = await userRes.json() as Record<string, string>;
  if (!userData.id) throw new Error("GitHub 授权失败: 无法获取用户信息");
  return { id: String(userData.id), displayName: userData.name || userData.login, avatarUrl: userData.avatar_url, email: userData.email, raw: userData };
}

async function exchangeWeChat(config: OAuthProviderConfig, code: string): Promise<OAuthUserInfo> {
  const appId = config.appId || config.clientId; const secret = config.appSecret || config.clientSecret;
  const tokenRes = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${secret}&code=${code}&grant_type=authorization_code`);
  const tokenData = await tokenRes.json() as Record<string, string>; const accessToken = tokenData.access_token; const openid = tokenData.openid;
  if (!accessToken || !openid) throw new Error("微信授权失败: 无法获取访问令牌");
  const userRes = await fetch(`https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`);
  const userData = await userRes.json() as Record<string, string>;
  return { id: openid, displayName: userData.nickname, avatarUrl: userData.headimgurl, email: null, raw: userData };
}

async function exchangeWeCom(config: OAuthProviderConfig, code: string): Promise<OAuthUserInfo> {
  const tokenRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.secret}`);
  const tokenData = await tokenRes.json() as Record<string, string>; const accessToken = tokenData.access_token;
  if (!accessToken) throw new Error("企业微信授权失败: 无法获取企业访问令牌");
  const userRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${accessToken}&code=${code}`);
  const userData = await userRes.json() as Record<string, string>; const userId = userData.userid || userData.openid;
  if (!userId) throw new Error("企业微信授权失败: 无法获取用户信息");
  const detailRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&userid=${userId}`);
  const detailData = await detailRes.json() as Record<string, string>;
  return { id: userId, displayName: detailData.name || userData.userid, avatarUrl: detailData.avatar, email: detailData.email, raw: { ...userData, ...detailData } };
}

async function exchangeFeishu(config: OAuthProviderConfig, code: string, _redirectUri: string): Promise<OAuthUserInfo> {
  const appId = config.appId || config.clientId; const secret = config.appSecret || config.clientSecret;
  const tokenRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: appId, app_secret: secret }) });
  const tokenData = await tokenRes.json() as Record<string, string>; const appAccessToken = tokenData.app_access_token;
  if (!appAccessToken) throw new Error("飞书授权失败: 无法获取应用访问令牌");
  const userTokenRes = await fetch("https://open.feishu.cn/open-apis/authen/v1/oidc/access_token", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${appAccessToken}` }, body: JSON.stringify({ grant_type: "authorization_code", code }) });
  const userTokenData = await userTokenRes.json() as Record<string, string>; const userAccessToken = userTokenData.access_token;
  if (!userAccessToken) throw new Error("飞书授权失败: 无法获取用户令牌");
  const userRes = await fetch("https://open.feishu.cn/open-apis/authen/v1/user_info", { headers: { Authorization: `Bearer ${userAccessToken}` } });
  const userData = await userRes.json() as { data?: Record<string, string> }; const info = userData.data ?? {};
  return { id: info.open_id || info.user_id || "", displayName: info.name, avatarUrl: info.avatar_url, email: info.email, raw: info };
}

async function exchangeDingTalk(config: OAuthProviderConfig, _code: string): Promise<OAuthUserInfo> {
  const appKey = config.appKey || config.clientId; const secret = config.appSecret || config.clientSecret;
  const tokenRes = await fetch("https://api.dingtalk.com/v1.0/oauth2/accessToken", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appKey, appSecret: secret }) });
  const tokenData = await tokenRes.json() as Record<string, string>; const accessToken = tokenData.accessToken;
  if (!accessToken) throw new Error("钉钉授权失败: 无法获取访问令牌");
  const userRes = await fetch("https://api.dingtalk.com/v1.0/contact/users/me", { headers: { "x-acs-dingtalk-access-token": accessToken } });
  const userData = await userRes.json() as Record<string, string>;
  if (!userData.openId) throw new Error("钉钉授权失败: 无法获取用户信息");
  return { id: userData.openId, displayName: userData.nick || userData.name, avatarUrl: userData.avatarUrl, email: userData.email, raw: userData };
}
