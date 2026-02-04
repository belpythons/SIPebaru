import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, CheckCircle, XCircle, Clock, UserCheck, UserX, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type UserStatus = "pending" | "active" | "rejected";

interface SipebaruUser {
  fid: number;
  nama: string;
  npk: string;
  unit_kerja: string;
  rfid: string | null;
  email: string | null;
  status: UserStatus;
  created_at: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UserStatus>("pending");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: SipebaruUser | null;
    action: "approve" | "reject" | null;
  }>({ open: false, user: null, action: null });

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["sipebaru-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sipebaru_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SipebaruUser[];
    },
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ fid, status }: { fid: number; status: UserStatus }) => {
      const { error } = await supabase
        .from("sipebaru_users")
        .update({ status })
        .eq("fid", fid);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sipebaru-users"] });
      toast({
        title: variables.status === "active" ? "User Diaktifkan" : "User Ditolak",
        description: `Status user berhasil diperbarui menjadi ${variables.status}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Gagal Memperbarui Status",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const handleAction = (user: SipebaruUser, action: "approve" | "reject") => {
    setConfirmDialog({ open: true, user, action });
  };

  const confirmAction = () => {
    if (!confirmDialog.user || !confirmDialog.action) return;

    updateStatusMutation.mutate({
      fid: confirmDialog.user.fid,
      status: confirmDialog.action === "approve" ? "active" : "rejected",
    });

    setConfirmDialog({ open: false, user: null, action: null });
  };

  const filteredUsers = users.filter((user) => user.status === activeTab);

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aktif
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Ditolak
          </Badge>
        );
    }
  };

  const pendingCount = users.filter((u) => u.status === "pending").length;
  const activeCount = users.filter((u) => u.status === "active").length;
  const rejectedCount = users.filter((u) => u.status === "rejected").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen User SIPEBARU</h1>
          <p className="text-muted-foreground">
            Kelola pendaftaran dan akses pengguna sistem
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        {/* User Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Daftar User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserStatus)}>
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

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Tidak ada user dengan status {activeTab}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>FID</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>NPK</TableHead>
                          <TableHead>Unit Kerja</TableHead>
                          <TableHead>RFID</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Terdaftar</TableHead>
                          {activeTab === "pending" && <TableHead>Aksi</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.fid}>
                            <TableCell className="font-mono">{user.fid}</TableCell>
                            <TableCell className="font-medium">{user.nama}</TableCell>
                            <TableCell>{user.npk}</TableCell>
                            <TableCell>{user.unit_kerja}</TableCell>
                            <TableCell>{user.rfid || "-"}</TableCell>
                            <TableCell>{user.email || "-"}</TableCell>
                            <TableCell>{getStatusBadge(user.status)}</TableCell>
                            <TableCell>
                              {format(new Date(user.created_at), "dd MMM yyyy HH:mm", {
                                locale: localeId,
                              })}
                            </TableCell>
                            {activeTab === "pending" && (
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleAction(user, "approve")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleAction(user, "reject")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <UserX className="h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve" ? "Aktivasi User" : "Tolak User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve"
                ? `Apakah Anda yakin ingin mengaktifkan akun "${confirmDialog.user?.nama}"? User akan dapat login ke sistem.`
                : `Apakah Anda yakin ingin menolak akun "${confirmDialog.user?.nama}"? User tidak akan dapat login ke sistem.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                confirmDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {confirmDialog.action === "approve" ? "Aktifkan" : "Tolak"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default UserManagement;
