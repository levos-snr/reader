import { UserManagement } from "@/components/admin/user-management";
import BackButton from "@/components/back-button";

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-background pt-20 sm:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        <div className="mb-4"><BackButton fallbackHref="/dashboard/admin" /></div>
        <UserManagement />
      </div>
    </div>
  );
}
