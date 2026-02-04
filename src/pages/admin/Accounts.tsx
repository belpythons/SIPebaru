import { useEffect, useState } from "react";
import { Loader2, Users, Shield, Clock, CheckCircle, XCircle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AdminAccountsTab from "@/components/admin/AdminAccountsTab";
import SipebaruUsersTab from "@/components/admin/SipebaruUsersTab";

type UserStatus = "pending" | "active" | "rejected";

const Accounts = () => {
  const [activeTab, setActiveTab] = useState("admin");
  const [sipebaruSubTab, setSipebaruSubTab] = useState<UserStatus>("pending");
  const [isAdminUtama, setIsAdminUtama] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Check if current user is admin_utama
  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin_utama")
          .maybeSingle();

        setIsAdminUtama(!!roleData);
      }
      setIsCheckingRole(false);
    };
    checkRole();
  }, []);

  // Fetch SIPEBARU user counts
  const { data: sipebaruUsers = [] } = useQuery({
    queryKey: ["sipebaru-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sipebaru_users")
        .select("status");
      if (error) throw error;
      return data;
    },
  });

  const pendingCount = sipebaruUsers.filter((u) => u.status === "pending").length;
  const activeCount = sipebaruUsers.filter((u) => u.status === "active").length;
  const rejectedCount = sipebaruUsers.filter((u) => u.status === "rejected").length;

  if (isCheckingRole) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengaturan Akun</h1>
          <p className="text-muted-foreground">
            Kelola akun admin dan pengguna SIPEBARU
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="admin" className="gap-2">
              <Shield className="h-4 w-4" />
              Akun Admin
            </TabsTrigger>
            <TabsTrigger value="sipebaru" className="gap-2">
              <Users className="h-4 w-4" />
              User SIPEBARU
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin">
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <AdminAccountsTab isAdminUtama={isAdminUtama} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sipebaru">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pendingCount}</p>
                      <p className="text-sm text-muted-foreground">Menunggu Aktivasi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activeCount}</p>
                      <p className="text-sm text-muted-foreground">User Aktif</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-red-100">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{rejectedCount}</p>
                      <p className="text-sm text-muted-foreground">User Ditolak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Daftar User SIPEBARU
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={sipebaruSubTab} onValueChange={(v) => setSipebaruSubTab(v as UserStatus)}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="pending" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Pending ({pendingCount})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Aktif ({activeCount})
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="gap-2">
                      <XCircle className="h-4 w-4" />
                      Ditolak ({rejectedCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={sipebaruSubTab}>
                    <SipebaruUsersTab filterStatus={sipebaruSubTab} canManage={isAdminUtama} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Accounts;
