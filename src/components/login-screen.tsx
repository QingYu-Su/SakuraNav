/**
 * 登录界面组件
 * @description 管理员登录页面，提供用户名密码认证功能
 */

/**
 * 登录界面组件
 * @description 提供用户认证登录界面，支持密码显示切换和错误提示
 */

"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { siteConfig } from "@/lib/config";

export function LoginScreen() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "登录失败，请检查账号和密码。");
        return;
      }

      // 使用 window.location.href 直接跳转并刷新，确保 session 正确更新
      window.location.href = "/";
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#efe7db] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,161,84,0.3),_transparent_35%),radial-gradient(circle_at_80%_20%,_rgba(95,134,255,0.35),_transparent_30%),linear-gradient(145deg,_#f4efe8_0%,_#e4ddd4_45%,_#d6d8e5_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="animate-panel-rise grid w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/70 shadow-[0_30px_120px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:rounded-[36px] lg:grid-cols-[1.15fr_0.85fr]">
          {/* 移动端顶部：Logo和应用名 */}
          <div className="flex items-center justify-center border-b border-slate-200/50 bg-[linear-gradient(160deg,rgba(18,31,51,0.92),rgba(18,31,51,0.74))] px-6 py-5 lg:hidden">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteConfig.logoSrc}
                alt={`${siteConfig.appName} logo`}
                className="h-8 w-8 rounded-xl border border-white/20 bg-white/10 p-1"
              />
              <span className="tracking-[0.22em] uppercase text-white/80">
                {siteConfig.appName}
              </span>
            </div>
          </div>
          {/* 桌面端左侧介绍区 */}
          <section className="hidden flex-col justify-between bg-[linear-gradient(160deg,rgba(18,31,51,0.92),rgba(18,31,51,0.74)),radial-gradient(circle_at_top,_rgba(255,255,255,0.18),transparent_45%)] px-10 py-12 text-white lg:flex">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={siteConfig.logoSrc}
                  alt={`${siteConfig.appName} logo`}
                  className="h-8 w-8 rounded-xl border border-white/20 bg-white/10 p-1"
                />
                <span className="tracking-[0.22em] uppercase text-white/80">
                  {siteConfig.appName}
                </span>
              </div>
              <div className="space-y-4">
                <p className="text-sm uppercase tracking-[0.28em] text-white/55">
                  Hidden Admin Route
                </p>
                <h1 className="max-w-lg text-5xl leading-tight font-semibold">
                  登录后就能切换到可编辑的专属导航面板。
                </h1>
                <p className="max-w-lg text-base leading-8 text-white/72">
                  支持 30 天免登录、隐藏标签与站点、主题外观配置、壁纸上传和拖拽排序。
                </p>
              </div>
            </div>
            <div className="grid gap-4 text-sm text-white/80">
              <div className="rounded-3xl border border-white/14 bg-white/10 p-5">
                站内搜索会同时命中站点名、描述和标签，登录后隐藏标签也会参与管理。
              </div>
              <div className="rounded-3xl border border-white/14 bg-white/10 p-5">
                主题支持明暗分离配置，可以分别设置壁纸、字体、文字颜色和透明度。
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center px-6 py-10 sm:px-10">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                  <LockKeyhole className="h-4 w-4" />
                  管理登录
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                    进入 SakuraNav 控制模式
                  </h2>
                  <p className="text-sm leading-7 text-slate-600">
                    输入配置文件中的单用户账号密码。登录成功后会自动返回导航页，并保持 30 天登录状态。
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">账号</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-slate-400 focus-within:bg-white">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <input
                      className="w-full bg-transparent outline-none placeholder:text-slate-400"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="请输入账号"
                    />
                  </span>
                </label>

                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">密码</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-slate-400 focus-within:bg-white">
                    <LockKeyhole className="h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-transparent outline-none placeholder:text-slate-400"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="请输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </span>
                </label>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isPending ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      登录中
                    </>
                  ) : (
                    "登录并返回导航页"
                  )}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
