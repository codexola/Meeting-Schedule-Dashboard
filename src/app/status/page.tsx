import DashboardNav from "@/components/DashboardNav";
import StatusTable from "@/components/StatusTable";

export default function StatusPage() {
  return (
    <>
      <DashboardNav />
      <main className="container-fluid py-4 px-3 px-lg-4" style={{ maxWidth: 1600 }}>
        <StatusTable />
      </main>
    </>
  );
}
