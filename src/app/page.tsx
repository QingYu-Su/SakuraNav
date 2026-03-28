import Script from "next/script";
import { SakuraNavApp } from "@/components/sakura-nav-app";
import { getSession } from "@/lib/auth";
import { getAppSettings, getAppearances, getVisibleTags } from "@/lib/db";

export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const appearances = getAppearances();

  // 确定默认主题
  const defaultTheme = appearances.dark.isDefault ? "dark" : 
                       appearances.light.isDefault ? "light" : 
                       "dark";

  return (
    <>
      <Script id="sakura-default-theme" strategy="beforeInteractive">
        {`window.__SAKURA_DEFAULT_THEME__ = "${defaultTheme}";`}
      </Script>
      <SakuraNavApp
        initialSession={session}
        initialTags={getVisibleTags(isAuthenticated)}
        initialAppearances={appearances}
        initialSettings={getAppSettings()}
        defaultTheme={defaultTheme}
      />
    </>
  );
}
