import { useEffect, useState } from "react";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Profile {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
}

const Accounts = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setProfiles(data);
      }
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setSelectedProfile(null);
  };

  const handleOpenDialog = (profile?: Profile) => {
    if (profile) {
      setSelectedProfile(profile);
      setFormData({
        username: profile.username,
        email: "",
        password: "",
        confirmPassword: "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password match
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Password tidak cocok",
        variant: "destructive",
      });
      return;
    }

    // For new account, password is required
    if (!selectedProfile && !formData.password) {
      toast({
        title: "Error",
        description: "Password wajib diisi",
        variant: "destructive",
      });
      return;
    }

    // For new account, email is required
    if (!selectedProfile && !formData.email) {
      toast({
        title: "Error",
        description: "Email wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (selectedProfile) {
        // Update existing profile - username
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ username: formData.username })
          .eq("id", selectedProfile.id);

        if (profileError) throw profileError;

        // Update password if provided
        if (formData.password) {
          if (selectedProfile.user_id === currentUserId) {
            // Update own password using client auth
            const { error: passwordError } = await supabase.auth.updateUser({
              password: formData.password,
            });
            if (passwordError) throw passwordError;
          } else {
            // Update other admin's password using edge function
            const response = await supabase.functions.invoke("update-admin-password", {
              body: {
                target_user_id: selectedProfile.user_id,
                password: formData.password,
              },
            });

            if (response.error) {
              throw new Error(response.error.message || "Gagal mengubah password");
            }

            if (response.data?.error) {
              throw new Error(response.data.error);
            }
          }
        }

        toast({
          title: "Berhasil",
          description: "Akun berhasil diperbarui",
        });
      } else {
        // Create new admin using edge function
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error("Sesi tidak valid. Silakan login ulang.");
        }

        const response = await supabase.functions.invoke("create-admin", {
          body: {
            email: formData.email,
            password: formData.password,
            username: formData.username,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || "Gagal membuat akun admin");
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        toast({
          title: "Berhasil",
          description: "Akun admin baru berhasil dibuat",
        });
      }

      handleCloseDialog();
      fetchProfiles();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Gagal",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProfile) return;

    // Prevent deleting own account
    if (selectedProfile.user_id === currentUserId) {
      toast({
        title: "Gagal",
        description: "Anda tidak dapat menghapus akun sendiri",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      // Delete user role first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedProfile.user_id);

      // Then delete profile
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedProfile.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Akun berhasil dihapus",
      });

      setIsDeleteDialogOpen(false);
      setSelectedProfile(null);
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: error.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Pengaturan Akun</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Tambah Akun
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader>
                <DialogTitle>
                  {selectedProfile ? "Edit Akun" : "Tambah Akun Admin"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Masukkan username"
                  />
                </div>

                {!selectedProfile && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Masukkan email"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {selectedProfile ? "Password Baru (kosongkan jika tidak diubah)" : "Password"}
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!selectedProfile}
                    minLength={6}
                    placeholder={selectedProfile ? "Masukkan password baru" : "Masukkan password"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {selectedProfile ? "Konfirmasi Password Baru" : "Konfirmasi Password"}
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!selectedProfile || !!formData.password}
                    minLength={6}
                    placeholder="Konfirmasi password"
                  />
                </div>


                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Batal
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Daftar Akun Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Belum ada akun admin
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.username}
                        {profile.user_id === currentUserId && (
                          <span className="ml-2 text-xs text-muted-foreground">(Anda)</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(profile.created_at)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(profile)}
                            className="gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
                          {profile.user_id !== currentUserId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProfile(profile);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="gap-1 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin menghapus akun "{selectedProfile?.username}"? Tindakan
                ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default Accounts;
