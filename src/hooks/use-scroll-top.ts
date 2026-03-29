/**
 * 滚动状态管理 Hook
 * 管理回到顶部按钮的显示状态
 */

"use client";

import { useState, useEffect } from "react";

export function useScrollTop(threshold: number = 260) {
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTopButton(window.scrollY > threshold);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    showScrollTopButton,
    scrollToTop,
  };
}
