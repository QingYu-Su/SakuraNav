/**
 * Next.js Instrumentation Hook
 * @description 在服务器启动时初始化后台服务（在线检测定时调度器）
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOnlineCheckScheduler } = await import("./lib/services/online-check-scheduler");
    startOnlineCheckScheduler();
  }
}
