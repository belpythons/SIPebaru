import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";

const formSchema = z.object({
  reporter_name: z
    .string()
    .trim()
    .min(1, "Nama pelapor wajib diisi")
    .max(120, "Nama pelapor maksimal 120 karakter"),
  department: z
    .string()
    .trim()
    .min(1, "Departemen wajib dipilih")
    .max(120, "Departemen maksimal 120 karakter"),
  item_name: z
    .string()
    .trim()
    .min(1, "Nama barang wajib diisi")
    .max(200, "Nama barang maksimal 200 karakter"),
  description: z
    .string()
    .trim()
    .min(1, "Deskripsi kerusakan wajib diisi")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
});

type FormData = z.infer<typeof formSchema>;

interface ComplaintFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubmissionResult {
  ticketNumber: string;
}

export function ComplaintFormDialog({ open, onOpenChange }: ComplaintFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  const { data: departments = [] } = useQuery({
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

  const departmentOptions = departments.map((dept) => ({
    value: dept.name,
    label: dept.name,
  }));

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporter_name: "",
      department: "",
      item_name: "",
      description: "",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File terlalu besar",
          description: "Ukuran foto maksimal 5MB",
          variant: "destructive",
        });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const resetForm = () => {
    form.reset();
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmissionResult(null);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Generate ticket number
      const { data: ticketData, error: ticketError } = await supabase.rpc(
        "generate_ticket_number"
      );

      if (ticketError) throw ticketError;

      let photoUrl: string | null = null;

      // Upload photo if exists
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${ticketData}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("complaint-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("complaint-photos")
          .getPublicUrl(fileName);

        photoUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("complaints").insert({
        ticket_number: ticketData,
        reporter_name: data.reporter_name.trim(),
        department: data.department.trim(),
        item_name: data.item_name.trim(),
        quantity: 1,
        description: data.description.trim(),
        reported_at: new Date().toISOString(),
        status: "pending",
        photo_url: photoUrl,
      });

      if (error) throw error;

      setSubmissionResult({ ticketNumber: ticketData });
    } catch (error: any) {
      console.error("Error submitting complaint:", error);
      toast({
        title: "Gagal",
        description: error.message || "Gagal mengirim pengaduan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (submissionResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Pengaduan Berhasil Dikirim!</h2>
            <p className="text-muted-foreground mb-4">
              Nomor pengaduan Anda:
            </p>
            <div className="bg-muted px-6 py-3 rounded-lg mb-6">
              <span className="text-2xl font-bold text-primary">
                {submissionResult.ticketNumber}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Simpan nomor ini untuk mengecek status pengaduan Anda.
            </p>
            <Button onClick={handleClose} className="w-full">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajukan Pengaduan Barang Rusak</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reporter_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pelapor *</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama lengkap Anda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departemen *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={departmentOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Pilih departemen"
                      searchPlaceholder="Cari departemen..."
                      emptyText="Departemen tidak ditemukan"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="item_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Barang *</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama barang yang rusak" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Kerusakan *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan kondisi kerusakan barang secara detail"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Upload Foto Barang Rusak</Label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Klik untuk upload foto (maks. 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </label>
              )}
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tanggal Laporan:</strong>{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Pengaduan
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
