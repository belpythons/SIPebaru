import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Department {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const Departments = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editDepartmentName, setEditDepartmentName] = useState("");

  // Fetch departments
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Department[];
    },
  });

  // Add department mutation
  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("departments")
        .insert({ name: name.trim() });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departemen berhasil ditambahkan");
      setIsAddDialogOpen(false);
      setNewDepartmentName("");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Departemen dengan nama tersebut sudah ada");
      } else {
        toast.error("Gagal menambahkan departemen");
      }
    },
  });

  // Edit department mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("departments")
        .update({ name: name.trim() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departemen berhasil diperbarui");
      setIsEditDialogOpen(false);
      setDepartmentToEdit(null);
      setEditDepartmentName("");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Departemen dengan nama tersebut sudah ada");
      } else {
        toast.error("Gagal memperbarui departemen");
      }
    },
  });

  // Delete department mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Departemen berhasil dihapus");
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    },
    onError: () => {
      toast.error("Gagal menghapus departemen");
    },
  });

  const handleAddDepartment = () => {
    if (!newDepartmentName.trim()) {
      toast.error("Nama departemen tidak boleh kosong");
      return;
    }
    addMutation.mutate(newDepartmentName);
  };

  const handleDeleteClick = (dept: Department) => {
    setDepartmentToDelete(dept);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (dept: Department) => {
    setDepartmentToEdit(dept);
    setEditDepartmentName(dept.name);
    setIsEditDialogOpen(true);
  };

  const handleEditDepartment = () => {
    if (!editDepartmentName.trim()) {
      toast.error("Nama departemen tidak boleh kosong");
      return;
    }
    if (departmentToEdit) {
      editMutation.mutate({ id: departmentToEdit.id, name: editDepartmentName });
    }
  };

  const confirmDelete = () => {
    if (departmentToDelete) {
      deleteMutation.mutate(departmentToDelete.id);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Data Departemen</h1>
            <p className="text-muted-foreground">
              Kelola daftar departemen
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Departemen
          </Button>
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departemen</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Nama Departemen</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead className="w-24 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : departments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada data departemen
                    </TableCell>
                  </TableRow>
                ) : (
                  departments.map((dept, index) => (
                    <TableRow key={dept.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>
                        {format(new Date(dept.created_at), "dd MMM yyyy, HH:mm", {
                          locale: id,
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditClick(dept)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(dept)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Departemen Baru</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nama departemen"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDepartment()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleAddDepartment} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Departemen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nama departemen"
              value={editDepartmentName}
              onChange={(e) => setEditDepartmentName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditDepartment()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditDepartment} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Departemen?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus departemen "{departmentToDelete?.name}"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Departments;
