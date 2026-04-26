/**
 * 统一的 API 请求工具函数
 * 封装 fetch 请求，统一处理错误和响应解析
 */

/** 会话失效时触发的自定义事件名 */
export const SESSION_EXPIRED_EVENT = "sakura-session-expired";

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
 * POST 请求配置
 */
export function postJson<T>(body: T, init?: RequestInit): RequestInit {
  return {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * DELETE 请求配置
 */
export function deleteRequest(init?: RequestInit): RequestInit {
  return {
    ...init,
    method: "DELETE",
  };
}
