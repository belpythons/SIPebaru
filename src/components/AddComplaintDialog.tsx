import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, CalendarIcon, Upload, X, Search } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Allowed MIME types and their corresponding extensions
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  npk: z
    .string()
    .trim()
    .min(1, "NPK wajib diisi")
    .max(50, "NPK maksimal 50 karakter"),
  reporter_name: z
    .string()
    .trim()
    .min(1, "Nama pemohon wajib diisi")
    .max(120, "Nama pemohon maksimal 120 karakter"),
  department: z
    .string()
    .trim()
    .min(1, "Departemen wajib diisi")
    .max(120, "Departemen maksimal 120 karakter"),
  item_name: z
    .string()
    .trim()
    .min(1, "Nama barang wajib diisi")
    .max(200, "Nama barang maksimal 200 karakter"),
  quantity: z
    .number()
    .min(1, "Jumlah minimal 1")
    .max(100000, "Jumlah maksimal 100000"),
  description: z
    .string()
    .max(2000, "Keterangan maksimal 2000 karakter")
    .optional(),
  reported_at: z.date({ required_error: "Tanggal lapor wajib diisi" }),
  status: z.enum(["pending", "processing", "completed"]),
});

type FormData = z.infer<typeof formSchema>;

interface AddComplaintDialogProps {
  onSuccess: () => void;
}

const AddComplaintDialog = ({ onSuccess }: AddComplaintDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);

  // Fetch departments from database
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
      item_name: "",
      quantity: 1,
      description: "",
      reported_at: new Date(),
      status: "pending",
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate MIME type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Format tidak valid",
          description: "Hanya file gambar yang diperbolehkan",
          variant: "destructive",
        });
        return;
      }
      if (!ALLOWED_IMAGE_TYPES[file.type]) {
        toast({
          title: "Format tidak valid",
          description: "Format gambar yang didukung: JPG, PNG, GIF, WEBP",
          variant: "destructive",
        });
        return;
      }
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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Generate ticket number
      const { data: ticketData, error: ticketError } = await supabase.rpc(
        "generate_ticket_number"
      );

      if (ticketError) throw ticketError;

      // Generate complaint code (5 alphanumeric characters)
      const { data: codeData, error: codeError } = await supabase.rpc(
        "generate_complaint_code" as any
      );

      if (codeError) throw codeError;

      let photoUrl: string | null = null;

      // Upload photo if exists
      if (photoFile) {
        // Use MIME type to determine extension (secure)
        const fileExt = ALLOWED_IMAGE_TYPES[photoFile.type] || 'jpg';
        const fileName = `${ticketData}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("complaint-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        // Use signed URL for secure access (1 hour expiry)
        const { data: urlData, error: urlError } = await supabase.storage
          .from("complaint-photos")
          .createSignedUrl(fileName, 3600);

        if (urlError) throw urlError;
        photoUrl = urlData.signedUrl;
      }

      const { error } = await supabase.from("complaints").insert({
        ticket_number: ticketData,
        complaint_code: codeData,
        npk: data.npk.trim(),
        reporter_name: data.reporter_name.trim(),
        department: data.department.trim(),
        item_name: data.item_name.trim(),
        quantity: data.quantity,
        description: data.description?.trim() || null,
        reported_at: data.reported_at.toISOString(),
        status: data.status,
        processed_at: data.status === "completed" ? new Date().toISOString() : null,
        photo_url: photoUrl,
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pengaduan baru berhasil ditambahkan",
      });

      form.reset();
      setPhotoFile(null);
      setPhotoPreview(null);
      setDepartmentSearch("");
      setIsDepartmentOpen(false);
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error adding complaint:", error);
      toast({
        title: "Gagal",
        description: error.message || "Gagal menambahkan pengaduan",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah Pengaduan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Pengaduan Baru</DialogTitle>
        </DialogHeader>
        
        {/* Info about complaint code */}
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Kode pengaduan unik (5 karakter) akan dibuat secara otomatis saat pengaduan disimpan.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="npk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPK</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan NPK" {...field} />
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
                   <FormLabel>Nama Pemohon</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama pemohon" {...field} />
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
                  <FormLabel>Departemen</FormLabel>
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
                  <FormLabel>Nama Barang</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama barang" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100000}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
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
                  <FormLabel>Keterangan (Opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Masukkan keterangan kerusakan"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reported_at"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Lapor</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd MMMM yyyy", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Belum Diproses</SelectItem>
                      <SelectItem value="processing">Sedang Diproses</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Upload Foto Barang Rusak (Opsional)</Label>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddComplaintDialog;
