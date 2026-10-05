import { redirect } from "next/navigation";

import { AppHeader } from "@/components/shell/app-header";
import { getInstitutions } from "@/lib/queries/accounts";
import { getViewer } from "@/lib/viewer";

import { NewAccountForm } from "./new-account-form";

export const metadata = { title: "Nueva cuenta" };

export default async function NewAccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.isDemo) redirect("/login");

  const institutions = await getInstitutions();

  return (
    <>
      <AppHeader
        title="Nueva cuenta"
        subtitle="Agrega una cuenta, tarjeta o inversión"
        isDemo={false}
      />

      <div className="mx-auto max-w-lg p-4 md:p-6">
        <NewAccountForm
          institutions={institutions.map((i) => ({
            id: i.id,
            name: i.name,
            kind: i.kind,
            brandColor: i.brandColor,
          }))}
        />
      </div>
    </>
  );
}
