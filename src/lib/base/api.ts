/**
 * 统一的 API 请求工具函数
 * 封装 fetch 请求，统一处理错误和响应解析
 */

/**
 * 发送请求并解析 JSON 响应
 * @param input 请求 URL 或 Request 对象
 * @param init 请求配置
 * @returns 解析后的 JSON 数据
 * @throws Error 当请求失败时抛出错误
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
