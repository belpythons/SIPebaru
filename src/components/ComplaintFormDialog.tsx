import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ticket } from "lucide-react";
import { Loader2, Upload, X, CheckCircle, Search, Ticket as TicketIcon } from "lucide-react";
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
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [nextTicketNumber, setNextTicketNumber] = useState<string | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // Fetch next ticket number when dialog opens
  useEffect(() => {
    const fetchNextTicketNumber = async () => {
      if (open && !submissionResult) {
        setIsLoadingTicket(true);
        try {
          // Get current max ticket number to preview next one
          const { data, error } = await supabase
            .from("complaints")
            .select("ticket_number")
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (error) throw error;
          
          let nextNumber = 1;
          if (data && data.length > 0) {
            const lastTicket = data[0].ticket_number;
            const match = lastTicket.match(/BR-(\d+)/);
            if (match) {
              nextNumber = parseInt(match[1], 10) + 1;
            }
          }
          
          setNextTicketNumber(`BR-${String(nextNumber).padStart(4, '0')}`);
        } catch (error) {
          console.error("Error fetching next ticket number:", error);
          setNextTicketNumber(null);
        } finally {
          setIsLoadingTicket(false);
        }
      }
    };

    fetchNextTicketNumber();
  }, [open, submissionResult]);

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
    setDepartmentSearch("");
    setIsDepartmentOpen(false);
    setNextTicketNumber(null);
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
        <DialogContent className="max-w-[90vw] sm:max-w-md mx-auto">
          <div className="flex flex-col items-center text-center py-4 sm:py-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/20 flex items-center justify-center mb-4 sm:mb-5 animate-fade-in">
              <CheckCircle className="h-9 w-9 sm:h-11 sm:w-11 text-success" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              Pengaduan Diterima!
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Pengaduan Anda telah berhasil diajukan dan akan segera diproses oleh tim kami.
            </p>
            
            <div className="w-full bg-muted/50 border border-border rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
              <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                Nomor Pengaduan Anda
              </p>
              <div className="bg-background border-2 border-primary/30 px-4 sm:px-6 py-3 sm:py-4 rounded-lg">
                <span className="text-2xl sm:text-3xl font-bold text-primary tracking-wide">
                  {submissionResult.ticketNumber}
                </span>
              </div>
            </div>

            <div className="w-full bg-amber-100 border border-amber-400 rounded-lg p-3 mb-5 text-left">
              <p className="text-xs sm:text-sm text-amber-900 font-medium">
                <strong>📌 Penting:</strong> Simpan nomor pengaduan ini untuk mengecek status pengaduan Anda kapan saja melalui menu "Cek Status Pengaduan".
              </p>
            </div>
            
            <Button onClick={handleClose} className="w-full" size="lg">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Ajukan Pengaduan Barang Rusak</DialogTitle>
        </DialogHeader>
        
        {/* Display next ticket number */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 sm:p-4 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <TicketIcon className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm text-muted-foreground">Nomor Pengaduan Anda</span>
          </div>
          {isLoadingTicket ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Memuat...</span>
            </div>
          ) : (
            <span className="text-xl sm:text-2xl font-bold text-primary tracking-wide">
              {nextTicketNumber || "BR-XXXX"}
            </span>
          )}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
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
                    <div className="relative">
                      <div
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setIsDepartmentOpen(!isDepartmentOpen)}
                      >
                        <span className={field.value ? "text-foreground" : "text-muted-foreground"}>
                          {field.value || "Pilih departemen"}
                        </span>
                        <Search className="h-4 w-4 opacity-50" />
                      </div>
                      
                      {isDepartmentOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Cari departemen..."
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
                                  Departemen tidak ditemukan
                                </div>
                              ) : (
                                filteredDepartments.map((dept) => (
                                  <div
                                    key={dept.id}
                                    className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
                                      field.value === dept.name ? "bg-accent" : ""
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

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
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
