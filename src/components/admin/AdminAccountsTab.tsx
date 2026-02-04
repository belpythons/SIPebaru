import { useState } from "react";
import { Plus, Edit, Trash2, Clock, CheckCircle, XCircle, UserCheck, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type AdminStatus = "pending" | "active" | "rejected";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  status: AdminStatus;
  created_at: string;
}

interface AdminAccountsTabProps {
  isAdminUtama?: boolean;
}

const AdminAccountsTab = ({ isAdminUtama = false }: AdminAccountsTabProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<AdminStatus>("active");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    profile: Profile | null;
    action: "approve" | "reject" | null;
  }>({ open: false, profile: null, action: null });

  // Fetch current user
  const { } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      return user;
    },
  });

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AdminStatus }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({
        title: variables.status === "active" ? "Akun Diaktifkan" : "Akun Ditolak",
        description: `Status akun berhasil diperbarui`,
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

  const pendingCount = profiles.filter((p) => p.status === "pending").length;
  const activeCount = profiles.filter((p) => p.status === "active").length;
  const rejectedCount = profiles.filter((p) => p.status === "rejected").length;

  const filteredProfiles = profiles.filter((p) => p.status === activeSubTab);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
    setSelectedProfile(null);
  };

  const handleOpenDialog = (profile?: Profile) => {
    if (profile) {
      setSelectedProfile(profile);
      setFormData({ username: profile.username, email: "", password: "", confirmPassword: "" });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleAction = (profile: Profile, action: "approve" | "reject") => {
    setConfirmDialog({ open: true, profile, action });
  };

  const confirmAction = () => {
    if (!confirmDialog.profile || !confirmDialog.action) return;

    updateStatusMutation.mutate({
      id: confirmDialog.profile.id,
      status: confirmDialog.action === "approve" ? "active" : "rejected",
    });

    setConfirmDialog({ open: false, profile: null, action: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
      return;
    }

    if (!selectedProfile && !formData.password) {
      toast({ title: "Error", description: "Password wajib diisi", variant: "destructive" });
      return;
    }

    if (!selectedProfile && !formData.email) {
      toast({ title: "Error", description: "Email wajib diisi", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      if (selectedProfile) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ username: formData.username })
          .eq("id", selectedProfile.id);

        if (profileError) throw profileError;

        if (formData.password) {
          if (selectedProfile.user_id === currentUserId) {
            const { error: passwordError } = await supabase.auth.updateUser({
              password: formData.password,
            });
            if (passwordError) throw passwordError;
          } else {
            const response = await supabase.functions.invoke("update-admin-password", {
              body: { target_user_id: selectedProfile.user_id, password: formData.password },
            });
            if (response.error) throw new Error(response.error.message || "Gagal mengubah password");
            if (response.data?.error) throw new Error(response.data.error);
          }
        }

        toast({ title: "Berhasil", description: "Akun berhasil diperbarui" });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sesi tidak valid. Silakan login ulang.");

        const response = await supabase.functions.invoke("create-admin", {
          body: { email: formData.email, password: formData.password, username: formData.username },
        });

        if (response.error) throw new Error(response.error.message || "Gagal membuat akun admin");
        if (response.data?.error) throw new Error(response.data.error);

        toast({ title: "Berhasil", description: "Akun admin baru berhasil dibuat" });
      }

      handleCloseDialog();
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfile) return;

    if (selectedProfile.user_id === currentUserId) {
      toast({ title: "Gagal", description: "Anda tidak dapat menghapus akun sendiri", variant: "destructive" });
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      await supabase.from("user_roles").delete().eq("user_id", selectedProfile.user_id);
      const { error } = await supabase.from("profiles").delete().eq("id", selectedProfile.id);
      if (error) throw error;

      toast({ title: "Berhasil", description: "Akun berhasil dihapus" });
      setIsDeleteDialogOpen(false);
      setSelectedProfile(null);
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message || "Terjadi kesalahan", variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const getStatusBadge = (status: AdminStatus) => {
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
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Daftar Akun Admin</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>{selectedProfile ? "Edit Akun" : "Tambah Akun Admin"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" value={formData.username} onChange={handleInputChange} required placeholder="Masukkan username" />
              </div>

              {!selectedProfile && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="Masukkan email" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{selectedProfile ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} required={!selectedProfile} minLength={6} placeholder={selectedProfile ? "Masukkan password baru" : "Masukkan password"} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{selectedProfile ? "Konfirmasi Password Baru" : "Konfirmasi Password"}</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} required={!selectedProfile || !!formData.password} minLength={6} placeholder="Konfirmasi password" />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Batal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Tabs for Admin Utama */}
      {isAdminUtama && (
        <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as AdminStatus)} className="mb-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending {pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">{pendingCount}</span>}
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
        </Tabs>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal Dibuat</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isAdminUtama ? filteredProfiles : profiles.filter(p => p.status === "active")).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada akun admin</TableCell>
              </TableRow>
            ) : (
              (isAdminUtama ? filteredProfiles : profiles.filter(p => p.status === "active")).map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.username}
                    {profile.user_id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}
                  </TableCell>
                  <TableCell>{profile.email || "-"}</TableCell>
                  <TableCell>{getStatusBadge(profile.status)}</TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      {activeSubTab === "pending" && isAdminUtama ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAction(profile, "approve")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <UserCheck className="h-4 w-4" />Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAction(profile, "reject")}
                            disabled={updateStatusMutation.isPending}
                          >
                            <UserX className="h-4 w-4" />Reject
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleOpenDialog(profile)} className="gap-1">
                            <Edit className="h-4 w-4" />Edit
                          </Button>
                          {profile.user_id !== currentUserId && (
                            <Button variant="outline" size="sm" onClick={() => { setSelectedProfile(profile); setIsDeleteDialogOpen(true); }} className="gap-1 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />Hapus
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {(isAdminUtama ? filteredProfiles : profiles.filter(p => p.status === "active")).length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Tidak ada akun admin</p>
        ) : (
          (isAdminUtama ? filteredProfiles : profiles.filter(p => p.status === "active")).map((profile) => (
            <div key={profile.id} className="p-4 border rounded-lg space-y-3 bg-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">
                    {profile.username}
                    {profile.user_id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{profile.email || "-"}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(profile.created_at)}</p>
                </div>
                {getStatusBadge(profile.status)}
              </div>
              <div className="flex gap-2">
                {activeSubTab === "pending" && isAdminUtama ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleAction(profile, "approve")}
                      disabled={updateStatusMutation.isPending}
                    >
                      <UserCheck className="h-4 w-4" />Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleAction(profile, "reject")}
                      disabled={updateStatusMutation.isPending}
                    >
                      <UserX className="h-4 w-4" />Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(profile)} className="flex-1 gap-1">
                      <Edit className="h-4 w-4" />Edit
                    </Button>
                    {profile.user_id !== currentUserId && (
                      <Button variant="outline" size="sm" onClick={() => { setSelectedProfile(profile); setIsDeleteDialogOpen(true); }} className="flex-1 gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />Hapus
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus akun "{selectedProfile?.username}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "approve" ? "Aktivasi Akun Admin" : "Tolak Akun Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve"
                ? `Apakah Anda yakin ingin mengaktifkan akun "${confirmDialog.profile?.username}"? Admin akan dapat login ke sistem.`
                : `Apakah Anda yakin ingin menolak akun "${confirmDialog.profile?.username}"? Admin tidak akan dapat login ke sistem.`}
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

export default AdminAccountsTab;
