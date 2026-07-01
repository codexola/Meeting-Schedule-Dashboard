import DashboardNav from "@/components/DashboardNav";
import ScheduleGrid from "@/components/ScheduleGrid";

export default function SchedulePage() {
  return (
    <>
      <DashboardNav />
      <main className="container-fluid py-4 px-3 px-lg-4" style={{ maxWidth: 1600 }}>
        <ScheduleGrid />
      </main>
    </>
  );
}
