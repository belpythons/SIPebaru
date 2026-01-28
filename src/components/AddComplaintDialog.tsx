import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
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
  reporter_name: z
    .string()
    .trim()
    .min(1, "Nama pelapor wajib diisi")
    .max(120, "Nama pelapor maksimal 120 karakter"),
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

const departments = [
  "IT",
  "HR",
  "Finance",
  "Marketing",
  "Operasional",
  "Adkor",
];

const AddComplaintDialog = ({ onSuccess }: AddComplaintDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporter_name: "",
      department: "",
      item_name: "",
      quantity: 1,
      description: "",
      reported_at: new Date(),
      status: "pending",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Generate ticket number
      const { data: ticketData, error: ticketError } = await supabase.rpc(
        "generate_ticket_number"
      );

      if (ticketError) throw ticketError;

      const { error } = await supabase.from("complaints").insert({
        ticket_number: ticketData,
        reporter_name: data.reporter_name.trim(),
        department: data.department.trim(),
        item_name: data.item_name.trim(),
        quantity: data.quantity,
        description: data.description?.trim() || null,
        reported_at: data.reported_at.toISOString(),
        status: data.status,
        processed_at: data.status === "completed" ? new Date().toISOString() : null,
      });

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pengaduan baru berhasil ditambahkan",
      });

      form.reset();
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reporter_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pelapor</FormLabel>
                  <FormControl>
                    <Input placeholder="Masukkan nama pelapor" {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih departemen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
