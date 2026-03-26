import { redirect } from "next/navigation";
import { EditorConsole } from "@/components/editor-console";
import { getSession } from "@/lib/auth";
import { getAllSitesForAdmin, getAppSettings, getAppearances, getVisibleTags } from "@/lib/db";

export default async function EditorPage() {
  const session = await getSession();

  if (!session?.isAuthenticated) {
    redirect("/");
  }

  return (
    <EditorConsole
      initialData={{
        tags: getVisibleTags(true),
        sites: getAllSitesForAdmin(),
        appearances: getAppearances(),
        settings: getAppSettings(),
      }}
    />
  );
}
