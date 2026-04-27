import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // Docker 构建时通过 BUILD_MAX_CPUS 环境变量限制 worker 数，降低峰值 CPU/内存
  experimental: process.env.BUILD_MAX_CPUS
    ? { cpus: parseInt(process.env.BUILD_MAX_CPUS, 10) }
    : undefined,
};

export default nextConfig;
