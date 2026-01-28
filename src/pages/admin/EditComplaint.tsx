import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Complaint {
  id: string;
  ticket_number: string;
  reporter_name: string;
  department: string;
  item_name: string;
  quantity: number;
  description: string | null;
  status: "pending" | "processing" | "completed";
  admin_note: string | null;
  reported_at: string;
  processed_at: string | null;
}

const EditComplaint = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [formData, setFormData] = useState({
    reporter_name: "",
    department: "",
    item_name: "",
    quantity: 1,
    description: "",
    status: "pending" as "pending" | "processing" | "completed",
    admin_note: "",
    processed_at: "",
  });

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  // Fetch departments from database
  const { data: departmentsList = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const fetchComplaint = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Pengaduan tidak ditemukan",
          variant: "destructive",
        });
        navigate("/admin/complaints");
        return;
      }

      setComplaint(data);
      setFormData({
        reporter_name: data.reporter_name,
        department: data.department,
        item_name: data.item_name,
        quantity: data.quantity,
        description: data.description || "",
        status: data.status,
        admin_note: data.admin_note || "",
        processed_at: data.processed_at
          ? new Date(data.processed_at).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error fetching complaint:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value,
    }));
  };

  const handleDepartmentChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      department: value,
    }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      status: value as "pending" | "processing" | "completed",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          reporter_name: formData.reporter_name,
          department: formData.department,
          item_name: formData.item_name,
          quantity: formData.quantity,
          description: formData.description || null,
          status: formData.status,
          admin_note: formData.admin_note || null,
          processed_at:
            formData.status !== "pending"
              ? new Date(formData.processed_at).toISOString()
              : null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pengaduan berhasil diperbarui",
      });

      navigate("/admin/complaints");
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Terjadi kesalahan saat menyimpan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
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

  if (!complaint) return null;

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/complaints")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Edit Pengaduan</h1>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">
              Detail Pengaduan - {complaint.ticket_number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Read-only Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nomor Pengaduan</Label>
                  <Input value={complaint.ticket_number} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Lapor</Label>
                  <Input
                    value={formatDate(complaint.reported_at)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-2">
                <Label htmlFor="reporter_name">Nama Pelapor</Label>
                <Input
                  id="reporter_name"
                  name="reporter_name"
                  value={formData.reporter_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departemen</Label>
                <Select value={formData.department} onValueChange={handleDepartmentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentsList.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name">Nama Barang</Label>
                  <Input
                    id="item_name"
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Jumlah Unit</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Keterangan Pelapor</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <hr className="my-6" />

              <h3 className="font-semibold text-foreground">Proses Admin</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="processed_at">Tanggal Diproses</Label>
                  <Input
                    id="processed_at"
                    name="processed_at"
                    type="date"
                    value={formData.processed_at}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="pending">Belum Diproses</SelectItem>
                      <SelectItem value="processing">Sedang Diproses</SelectItem>
                      <SelectItem value="completed">Selesai Diproses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_note">Keterangan Proses</Label>
                <Textarea
                  id="admin_note"
                  name="admin_note"
                  value={formData.admin_note}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Catatan dari admin mengenai proses pengaduan..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="gap-2" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/complaints")}
                >
                  Kembali
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default EditComplaint;