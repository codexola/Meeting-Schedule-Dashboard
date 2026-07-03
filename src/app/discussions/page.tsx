import DashboardNav from "@/components/DashboardNav";
import CompanyDiscussionsTable from "@/components/CompanyDiscussionsTable";

export default function DiscussionsPage() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <DashboardNav />
      <main className="container-fluid flex-grow-1 py-4 px-3 px-lg-4" style={{ maxWidth: 1800 }}>
        <CompanyDiscussionsTable />
      </main>
    </div>
  );
}
