import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Upload, X, CheckCircle, Search, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Allowed MIME types and their corresponding extensions
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const itemSchema = z.object({
  item_name: z
    .string()
    .trim()
    .min(5, "Nama item minimal 5 karakter")
    .max(200, "Nama item maksimal 200 karakter"),
  quantity: z
    .number()
    .min(1, "Jumlah minimal 1")
    .max(100000, "Jumlah maksimal 100000"),
});

const formSchema = z.object({
  npk: z
    .string()
    .trim()
    .min(3, "NPK minimal 3 karakter")
    .max(50, "NPK maksimal 50 karakter"),
  reporter_name: z
    .string()
    .trim()
    .min(3, "Nama pemohon minimal 3 karakter")
    .max(120, "Nama pemohon maksimal 120 karakter"),
  department: z
    .string()
    .trim()
    .min(1, "Unit kerja wajib dipilih")
    .max(120, "Unit kerja maksimal 120 karakter"),
  items: z
    .array(itemSchema)
    .min(1, "Minimal 1 item")
    .max(3, "Maksimal 3 item"),
  description: z
    .string()
    .trim()
    .min(10, "Deskripsi kerusakan minimal 10 karakter")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
});

type FormData = z.infer<typeof formSchema>;

interface ComplaintFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess?: (result: SubmissionResult) => void;
}

export interface SubmissionResult {
  ticketNumber: string;
  complaintCode: string;
  npk: string;
  reporterName: string;
  department: string;
  items: { itemName: string; quantity: number }[];
  description: string;
  submittedAt: string;
}

export function ComplaintFormDialog({ open, onOpenChange, onSubmitSuccess }: ComplaintFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);

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

  const filteredDepartments = useMemo(() => {
    if (!departmentSearch.trim()) return departments;
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
    );
  }, [departments, departmentSearch]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      npk: "",
      reporter_name: "",
      department: "",
      items: [{ item_name: "", quantity: 1 }],
      description: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Format tidak valid", description: "Hanya file gambar yang diperbolehkan", variant: "destructive" });
        return;
      }
      if (!ALLOWED_IMAGE_TYPES[file.type]) {
        toast({ title: "Format tidak valid", description: "Format gambar yang didukung: JPG, PNG, GIF, WEBP", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File terlalu besar", description: "Ukuran foto maksimal 5MB", variant: "destructive" });
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
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
    setDepartmentSearch("");
    setIsDepartmentOpen(false);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Generate ticket number based on reported date (today)
      const today = new Date();
      const reportDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const { data: ticketData, error: ticketError } = await supabase.rpc("generate_ticket_number" as any, { _report_date: reportDateStr });
      if (ticketError) throw ticketError;

      // Generate complaint code
      const { data: codeData, error: codeError } = await supabase.rpc("generate_complaint_code" as any);
      if (codeError) throw codeError;

      let photoUrl: string | null = null;

      if (photoFile) {
        const fileExt = ALLOWED_IMAGE_TYPES[photoFile.type] || 'jpg';
        const safeTicketNumber = ticketData.replace(/\//g, '-');
        const fileName = `${safeTicketNumber}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("complaint-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;
        photoUrl = fileName;
      }

      // Combine items into a single string for item_name and sum quantities
      const itemNames = data.items.map(i => `${i.item_name} (${i.quantity} unit)`).join(", ");
      const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);

      const { error } = await supabase.from("complaints").insert({
        ticket_number: ticketData,
        complaint_code: codeData,
        npk: data.npk.trim(),
        reporter_name: data.reporter_name.trim(),
        department: data.department.trim(),
        item_name: itemNames,
        quantity: totalQuantity,
        description: data.description.trim(),
        reported_at: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0, 0).toISOString(),
        status: "pending",
        photo_url: photoUrl,
      });

      if (error) throw error;

      setSubmissionResult({
        ticketNumber: ticketData,
        complaintCode: codeData,
        npk: data.npk.trim(),
        reporterName: data.reporter_name.trim(),
        department: data.department.trim(),
        items: data.items.map(i => ({ itemName: i.item_name.trim(), quantity: i.quantity })),
        description: data.description.trim(),
        submittedAt: new Date().toISOString(),
      });
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
    if (submissionResult && onSubmitSuccess) {
      onSubmitSuccess(submissionResult);
    }
    resetForm();
    onOpenChange(false);
  };

  if (submissionResult) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[92vw] sm:max-w-md mx-auto p-0 overflow-hidden">
          <div className="flex flex-col items-center text-center p-5 sm:p-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-fade-in">
              <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-green-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-1">Pengaduan Diterima!</h2>
            <p className="text-sm text-muted-foreground mb-4">Pengaduan Anda telah berhasil diajukan</p>

            <div className="w-full bg-muted/50 border border-border rounded-xl p-4 mb-3">
              <p className="text-xs text-muted-foreground mb-2">Kode Pengaduan Anda</p>
              <div className="bg-background border-2 border-primary/30 px-4 py-3 rounded-lg">
                <p className="text-2xl sm:text-3xl font-bold text-primary tracking-widest">
                  {submissionResult.complaintCode}
                </p>
              </div>
            </div>

            <div className="w-full bg-muted/30 border border-border rounded-lg p-3 mb-4">
              <p className="text-xs text-muted-foreground mb-1">Nomor Urut</p>
              <p className="text-sm font-medium text-foreground break-all">{submissionResult.ticketNumber}</p>
            </div>

            <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-left">
              <p className="text-xs sm:text-sm text-amber-800">
                <span className="font-semibold">📌 Penting:</span> Simpan kode pengaduan <strong>{submissionResult.complaintCode}</strong> untuk mengecek status pengaduan Anda kapan saja.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full h-10 sm:h-11">Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Ajukan Pengaduan Item Rusak</DialogTitle>
        </DialogHeader>

        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 sm:p-4 mb-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Setelah pengaduan dikirim, Anda akan menerima <strong className="text-primary">Kode Pengaduan</strong> unik (5 karakter) yang dapat digunakan untuk melacak status pengaduan Anda.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="npk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPK *</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan NPK Anda" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reporter_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pemohon *</FormLabel>
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
                  <FormLabel>Unit Kerja *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setIsDepartmentOpen(!isDepartmentOpen)}
                      >
                        <span className={field.value ? "text-foreground" : "text-muted-foreground"}>
                          {field.value || "Pilih unit kerja"}
                        </span>
                        <Search className="h-4 w-4 opacity-50" />
                      </div>

                      {isDepartmentOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Cari unit kerja..."
                              value={departmentSearch}
                              onChange={(e) => setDepartmentSearch(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                          </div>
                          <ScrollArea className="h-[200px]">
                            <div className="p-1">
                              {filteredDepartments.length === 0 ? (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Unit kerja tidak ditemukan
                                </div>
                              ) : (
                                filteredDepartments.map((dept) => (
                                  <div
                                    key={dept.id}
                                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${field.value === dept.name ? "bg-accent" : ""
                                      }`}
                                    onClick={() => {
                                      field.onChange(dept.name);
                                      setIsDepartmentOpen(false);
                                      setDepartmentSearch("");
                                    }}
                                  >
                                    {dept.name}
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dynamic Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Daftar Item Rusak *</Label>
                {fields.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8 text-xs"
                    onClick={() => append({ item_name: "", quantity: 1 })}
                  >
                    <Plus className="h-3 w-3" />
                    Tambah Item
                  </Button>
                )}
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.item_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Nama item" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="Jml"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Maksimal 3 item per pengaduan</p>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi Kerusakan *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Jelaskan kondisi kerusakan item secara detail"
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
              <Label>Upload Foto Item Rusak</Label>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removePhoto}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Klik untuk upload foto (maks. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                </label>
              )}
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tanggal Laporan:</strong>{" "}
                {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting} className="w-full sm:w-auto">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
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
