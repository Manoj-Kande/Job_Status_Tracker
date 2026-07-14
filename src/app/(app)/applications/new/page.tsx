import { Topbar } from "@/components/layout/topbar";
import { NewJobForm } from "@/components/jobs/new-job-form";

export default function NewApplicationPage() {
  return (
    <>
      <Topbar title="Add Job Application" />
      <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">
        <NewJobForm />
      </main>
    </>
  );
}
