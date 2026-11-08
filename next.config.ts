import type { NextConfig } from "next";

/**
 * Сборка зависит от окружения:
 *   - по умолчанию "standalone" — для локального предпросмотра и песочницы;
 *   - NEXT_EXPORT=1 — статический экспорт в out/ для GitHub Pages
 *     (workflow .github/workflows/github-pages.yml делает это сам).
 *     NEXT_BASE_PATH — "/имя-репозитория", если сайт живёт в подкаталоге.
 */
const isExport = process.env.NEXT_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isExport
    ? { output: "export", basePath: process.env.NEXT_BASE_PATH || "", images: { unoptimized: true } }
    : { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
