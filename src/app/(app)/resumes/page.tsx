import { Topbar } from "@/components/layout/topbar";
import { ResumeManager } from "@/components/resumes/resume-manager";
import { getResumes, getJobOptionsForLinking } from "@/lib/resume-queries";

export default async function ResumesPage() {
  const [resumes, jobOptions] = await Promise.all([getResumes(), getJobOptionsForLinking()]);

  return (
    <>
      <Topbar title="Resume Library" />
      <main className="flex-1 space-y-4 p-4 pb-20 md:p-6 md:pb-6">
        <ResumeManager resumes={resumes} jobOptions={jobOptions} />
      </main>
    </>
  );
}
