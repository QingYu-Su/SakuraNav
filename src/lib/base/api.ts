/**
 * 统一的 API 请求工具函数
 * 封装 fetch 请求，统一处理错误和响应解析
 */

/** 会话失效时触发的自定义事件名 */
export const SESSION_EXPIRED_EVENT = "sakura-session-expired";

/** CSRF cookie 名称（与服务端 csrf.ts 保持一致） */
const CSRF_COOKIE_NAME = "csrf_token";
/** CSRF header 名称 */
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * 从浏览器 cookie 中读取 CSRF token
 */
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? match.split("=").slice(1).join("=") : null;
}

/**
 * 发送请求并解析 JSON 响应
 * @param input 请求 URL 或 Request 对象
 * @param init 请求配置
 * @returns 解析后的 JSON 数据
 * @throws Error 当请求失败时抛出错误
 *
 * 特殊行为：当收到 401 时，触发全局会话失效事件并返回永不 resolve 的 Promise，
 * 阻止调用方继续执行（避免在弹窗之后又弹出 toast 错误提示）。
 */
export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new Error("网络连接失败，请检查网络后重试");
  }

  // 会话失效：触发全局事件并阻止调用方继续执行
  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
    // 返回永不 resolve 的 Promise，阻止调用方的 catch/showError 触发 toast
    return new Promise<never>(() => {});
  }

  const data = (await response.json().catch(() => null)) as T | { error?: string } | null;

  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "请求失败");
  }

  return data as T;
}

/**
 * 带认证凭证的请求配置
 */
export function withCredentials(init?: RequestInit): RequestInit {
  return {
    ...init,
    credentials: "include",
  };
}

/**
 * POST 请求配置（自动携带 CSRF token）
 */
export function postJson<T>(body: T, init?: RequestInit): RequestInit {
  const csrfToken = getCsrfTokenFromCookie();
  return {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      ...init?.headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * PUT 请求配置（自动携带 CSRF token）
 */
export function putJson<T>(body: T, init?: RequestInit): RequestInit {
  const csrfToken = getCsrfTokenFromCookie();
  return {
    ...init,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      ...init?.headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * DELETE 请求配置（自动携带 CSRF token）
 */
export function deleteRequest(init?: RequestInit): RequestInit {
  const csrfToken = getCsrfTokenFromCookie();
  return {
    ...init,
    method: "DELETE",
    headers: {
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
      ...init?.headers,
    },
  };
}
