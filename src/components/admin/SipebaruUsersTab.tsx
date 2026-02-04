import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CheckCircle, XCircle, Clock, UserCheck, UserX, Loader2 } from "lucide-react";
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

interface SipebaruUsersTabProps {
  filterStatus?: UserStatus;
  canManage?: boolean; // Only admin_utama can approve/reject
}

const SipebaruUsersTab = ({ filterStatus, canManage = false }: SipebaruUsersTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: SipebaruUser | null;
    action: "approve" | "reject" | null;
  }>({ open: false, user: null, action: null });

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

  const filteredUsers = filterStatus 
    ? users.filter((user) => user.status === filterStatus)
    : users;

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />Aktif
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />Ditolak
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Tidak ada user {filterStatus ? `dengan status ${filterStatus}` : ""}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
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
              {filterStatus === "pending" && canManage && <TableHead>Aksi</TableHead>}
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
                  {format(new Date(user.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                </TableCell>
                {filterStatus === "pending" && canManage && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleAction(user, "approve")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <UserCheck className="h-4 w-4" />Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleAction(user, "reject")}
                        disabled={updateStatusMutation.isPending}
                      >
                        <UserX className="h-4 w-4" />Reject
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => (
          <div key={user.fid} className="p-4 border rounded-lg space-y-3 bg-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{user.nama}</p>
                <p className="text-sm text-muted-foreground">NPK: {user.npk}</p>
                <p className="text-sm text-muted-foreground">{user.unit_kerja}</p>
              </div>
              {getStatusBadge(user.status)}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>FID: {user.fid}</p>
              {user.rfid && <p>RFID: {user.rfid}</p>}
              {user.email && <p>Email: {user.email}</p>}
              <p>Terdaftar: {format(new Date(user.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}</p>
            </div>
            {filterStatus === "pending" && canManage && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleAction(user, "approve")}
                  disabled={updateStatusMutation.isPending}
                >
                  <UserCheck className="h-4 w-4" />Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleAction(user, "reject")}
                  disabled={updateStatusMutation.isPending}
                >
                  <UserX className="h-4 w-4" />Reject
                </Button>
              </div>
            )}
          </div>
        ))}
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
    </>
  );
};

export default SipebaruUsersTab;
