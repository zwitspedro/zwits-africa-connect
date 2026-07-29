import { Panel } from "./dashboard-kit";
import { AvailableJobs } from "./available-jobs";

export function AvailableJobsSection({ online }: { online: boolean }) {
  return (
    <Panel
      title="Available jobs"
      description={
        online
          ? "Live offers dispatched to you. Respond before the timer runs out."
          : "You are offline — go online to start receiving job offers."
      }
    >
      <AvailableJobs />
    </Panel>
  );
}
