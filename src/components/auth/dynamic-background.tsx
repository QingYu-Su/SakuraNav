/**
 * 动态背景组件
 * @description 提供简洁的动态背景效果，支持亮暗主题切换
 * 光明模式：飘落的樱花
 * 暗黑模式：闪烁的星星
 */

"use client";

import { useEffect, useState } from "react";

// 预定义樱花花瓣 - 增加数量到80个，均匀覆盖全屏
const SAKURA_PETALS = Array.from({ length: 80 }, (_, i) => {
  // 均匀分布在屏幕各处起始
  const angle = (i / 80) * 360; // 360度均匀分布
  const radius = 50 + (i % 5) * 15; // 不同半径
  
  // 使用极坐标转换为起始位置，确保均匀分布
  const startX = 50 + Math.cos(angle * Math.PI / 180) * radius;
  const startY = 50 + Math.sin(angle * Math.PI / 180) * radius;
  
  return {
    id: i,
    // 起始位置：从右侧和上方区域均匀分布
    left: `${startX + (i % 3) * 30}%`, // 覆盖右侧和上方
    top: `${startY - 50 - (i % 4) * 10}%`, // 覆盖上方区域
    // 减少延迟，让樱花立即开始飘落
    delay: `${(i * 0.15) % 5}s`, // 最大延迟5秒
    // 添加动画起始偏移，让部分樱花已经在屏幕中
    initialDelay: `${(i * 0.1) % 3}s`, // 0-3秒的初始延迟
    duration: `${8 + (i % 8) * 2}s`, // 8-24秒的飘落时间
    size: 10 + (i % 6) * 3, // 10-25px
    rotation: (i * 45) % 360,
  };
});

// 预定义星星
const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  left: `${(i * 3.3 + (i % 5) * 20) % 95}%`,
  top: `${(i * 3.3 + (i % 7) * 14) % 95}%`,
  delay: `${i * 0.3}s`,
  duration: `${2 + (i % 3) * 0.5}s`,
  size: 1 + (i % 4) * 0.5,
}));

export function DynamicBackground() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // 读取主题
    const updateTheme = () => {
      const storedTheme = window.localStorage.getItem("sakura-theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    };

    // 延迟初始化以避免同步调用 setState
    const timer = setTimeout(updateTheme, 0);

    // 监听主题变化
    const observer = new MutationObserver(() => {
      const htmlTheme = document.documentElement.dataset.theme;
      if (htmlTheme === "light" || htmlTheme === "dark") {
        setTheme(htmlTheme);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("storage", updateTheme);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", updateTheme);
      observer.disconnect();
    };
  }, []);

  // 根据主题设置不同的样式
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 基础渐变背景 */}
      <div 
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #0f0f23 0%, #1a1f35 25%, #2d3561 50%, #1e2742 75%, #0f0f23 100%)"
            : "linear-gradient(135deg, #f8f6ff 0%, #e8e4ff 25%, #f0ebff 50%, #e3dfff 75%, #f8f6ff 100%)",
        }}
      />

      {/* 樱花飘落效果 - 仅光明模式 */}
      {!isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {SAKURA_PETALS.map((petal, index) => (
            <div
              key={petal.id}
              className={`absolute ${index % 3 === 0 ? 'animate-sakura-fall-initial' : 'animate-sakura-fall'}`}
              style={{
                left: petal.left,
                top: petal.top,
                width: petal.size,
                height: petal.size,
                animationDelay: petal.delay,
                animationDuration: petal.duration,
              }}
            >
              {/* 单个樱花花瓣形状 - 水滴形/椭圆 */}
              <svg
                viewBox="0 0 20 30"
                style={{ width: "100%", height: "100%" }}
              >
                {/* 花瓣主体 - 椭圆 */}
                <ellipse
                  cx="10"
                  cy="15"
                  rx="7"
                  ry="13"
                  fill={`rgba(255,${182 + (petal.id % 3) * 5},${193 + (petal.id % 2) * 7},${0.75 + (petal.id % 4) * 0.05})`}
                />
                {/* 花瓣尖端 */}
                <ellipse
                  cx="10"
                  cy="4"
                  rx="3"
                  ry="4"
                  fill={`rgba(255,${192 + (petal.id % 2) * 3},${203 + (petal.id % 3) * 4},${0.85 + (petal.id % 3) * 0.05})`}
                />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* 星星闪烁效果 - 仅暗黑模式 */}
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {STARS.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-star-twinkle"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
