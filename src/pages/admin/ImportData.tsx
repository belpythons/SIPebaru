import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Upload,
    FileSpreadsheet,
    Download,
    Loader2,
    CheckCircle,
    XCircle,
    Trash2,
    FileUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

// =============================================
// TIPE DATA
// =============================================
interface BatchRow {
    nomor_induk: string;
    nama: string;
    unit_kerja: string;
}

interface ImportResult {
    index: number;
    nomor_induk: string;
    nama: string;
    success: boolean;
    message: string;
}

// =============================================
// KOMPONEN UTAMA
// =============================================
const ImportData = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [batchFile, setBatchFile] = useState<File | null>(null);
    const [batchPreview, setBatchPreview] = useState<BatchRow[]>([]);
    const [batchImporting, setBatchImporting] = useState(false);
    const [batchResults, setBatchResults] = useState<ImportResult[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);

    // =============================================
    // DOWNLOAD TEMPLATE EXCEL
    // =============================================
    const handleDownloadTemplate = () => {
        const templateData = [
            { nomor_induk: "123456", nama: "Contoh Nama", unit_kerja: "Bagian IT" },
            { nomor_induk: "789012", nama: "Nama Lengkap", unit_kerja: "Bagian Umum" },
        ];

        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

        // Atur lebar kolom
        worksheet["!cols"] = [
            { wch: 15 }, // nomor_induk
            { wch: 25 }, // nama
            { wch: 25 }, // unit_kerja
        ];

        XLSX.writeFile(workbook, "template_import_members.xlsx");
    };

    // =============================================
    // PARSE FILE EXCEL
    // =============================================
    const processFile = useCallback((file: File) => {
        setBatchFile(file);
        setBatchResults([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                if (!data) {
                    toast({
                        title: "Error",
                        description: "Format file tidak valid. Harap unggah file Excel yang benar.",
                        variant: "destructive",
                    });
                    return;
                }

                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

                const parsed: BatchRow[] = jsonData
                    .map((row) => ({
                        nomor_induk: String(
                            row["nomor_induk"] || row["Nomor Induk"] || row["NomorInduk"] || row["NPK"] || ""
                        ).trim(),
                        nama: String(
                            row["nama"] || row["Nama"] || row["Name"] || ""
                        ).trim(),
                        unit_kerja: String(
                            row["unit_kerja"] || row["Unit Kerja"] || row["UnitKerja"] || ""
                        ).trim(),
                    }))
                    .filter((r) => r.nomor_induk !== "" || r.nama !== "");

                setBatchPreview(parsed);
                if (parsed.length === 0) {
                    toast({
                        title: "Data Kosong",
                        description: "File tidak mengandung data yang valid. Pastikan kolom nomor_induk dan nama terisi.",
                        variant: "destructive",
                    });
                }
            } catch {
                toast({
                    title: "Error",
                    description: "Format file tidak valid. Harap unggah file Excel yang benar.",
                    variant: "destructive",
                });
                setBatchPreview([]);
            }
        };
        reader.readAsBinaryString(file);
    }, [toast]);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
        },
        [processFile]
    );

    // =============================================
    // DRAG & DROP
    // =============================================
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
                const ext = file.name.split(".").pop()?.toLowerCase();
                if (ext === "xlsx" || ext === "xls" || ext === "csv") {
                    processFile(file);
                } else {
                    toast({
                        title: "Format Salah",
                        description: "Hanya file .xlsx, .xls, atau .csv yang didukung.",
                        variant: "destructive",
                    });
                }
            }
        },
        [processFile, toast]
    );

    // =============================================
    // IMPORT KE DATABASE (dengan validasi per baris)
    // =============================================
    const handleBatchImport = async () => {
        if (batchPreview.length === 0) return;
        setBatchImporting(true);
        const results: ImportResult[] = [];

        try {
            // 1. Ambil daftar unit kerja valid dari database
            const { data: deptData } = await supabase
                .from("departments")
                .select("name")
                .is("deleted_at", null);

            const validDepartments = new Set(
                (deptData ?? []).map((d: { name: string }) => d.name)
            );

            // 2. Ambil daftar nomor_induk yang sudah ada di database
            const { data: existingData } = await supabase
                .from("members_batch")
                .select("nomor_induk")
                .is("deleted_at", null);

            const existingNpks = new Set(
                (existingData ?? []).map((m: { nomor_induk: string }) => m.nomor_induk)
            );

            // 3. Track NPK yang sudah diproses dalam batch ini (untuk cegah duplikat intra-file)
            const processedNpks = new Set<string>();

            // 4. Iterasi setiap baris
            const rowsToInsert: { nomor_induk: string; nama: string; unit_kerja: string | null }[] = [];

            for (let i = 0; i < batchPreview.length; i++) {
                const row = batchPreview[i];

                // Validasi: nomor_induk dan nama wajib
                if (!row.nomor_induk || !row.nama) {
                    results.push({
                        index: i,
                        nomor_induk: row.nomor_induk || "-",
                        nama: row.nama || "-",
                        success: false,
                        message: "Nomor induk atau nama kosong",
                    });
                    continue;
                }

                // Validasi: unit_kerja harus valid (jika diisi)
                if (row.unit_kerja && !validDepartments.has(row.unit_kerja)) {
                    results.push({
                        index: i,
                        nomor_induk: row.nomor_induk,
                        nama: row.nama,
                        success: false,
                        message: `Unit kerja "${row.unit_kerja}" tidak ditemukan`,
                    });
                    continue;
                }

                // Validasi: duplikat di database
                if (existingNpks.has(row.nomor_induk)) {
                    results.push({
                        index: i,
                        nomor_induk: row.nomor_induk,
                        nama: row.nama,
                        success: false,
                        message: "Nomor induk sudah terdaftar (duplikat)",
                    });
                    continue;
                }

                // Validasi: duplikat di file yang sama
                if (processedNpks.has(row.nomor_induk)) {
                    results.push({
                        index: i,
                        nomor_induk: row.nomor_induk,
                        nama: row.nama,
                        success: false,
                        message: "Duplikat dalam file yang sama",
                    });
                    continue;
                }

                // Lolos validasi
                processedNpks.add(row.nomor_induk);
                rowsToInsert.push({
                    nomor_induk: row.nomor_induk,
                    nama: row.nama,
                    unit_kerja: row.unit_kerja || null,
                });

                results.push({
                    index: i,
                    nomor_induk: row.nomor_induk,
                    nama: row.nama,
                    success: true,
                    message: "Siap diimport",
                });
            }

            // 5. Bulk insert data yang lolos validasi
            if (rowsToInsert.length > 0) {
                const { error } = await supabase
                    .from("members_batch")
                    .insert(rowsToInsert);

                if (error) {
                    // Jika bulk insert gagal, tandai semua sebagai gagal
                    for (const r of results) {
                        if (r.success) {
                            r.success = false;
                            r.message = error.message || "Gagal menyimpan ke database";
                        }
                    }
                }
            }

            // 6. Hitung rangkuman
            const successCount = results.filter((r) => r.success).length;
            const skipCount = results.filter((r) => !r.success).length;

            toast({
                title: "Proses Import Selesai",
                description: `Berhasil: ${successCount} data. Dilewati (Duplikat/Tidak Valid): ${skipCount} data.`,
                variant: successCount > 0 ? "default" : "destructive",
            });

            queryClient.invalidateQueries({ queryKey: ["members_batch"] });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Kesalahan tidak diketahui";
            toast({
                title: "Gagal",
                description: "Gagal mengimport data: " + msg,
                variant: "destructive",
            });

            // Tandai semua sebagai gagal
            batchPreview.forEach((row, i) => {
                if (!results[i]) {
                    results.push({
                        index: i,
                        nomor_induk: row.nomor_induk,
                        nama: row.nama,
                        success: false,
                        message: msg,
                    });
                }
            });
        } finally {
            setBatchResults(results);
            setBatchImporting(false);
        }
    };

    // =============================================
    // RESET
    // =============================================
    const resetBatch = () => {
        setBatchFile(null);
        setBatchPreview([]);
        setBatchResults([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Import Data</h1>
                    <p className="text-muted-foreground mt-1">Import data anggota secara massal via file Excel</p>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                                    Import Nomor Batch User
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Upload file Excel dengan kolom: <code className="bg-muted px-1 rounded">nomor_induk</code> (wajib),{" "}
                                    <code className="bg-muted px-1 rounded">nama</code> (wajib),{" "}
                                    <code className="bg-muted px-1 rounded">unit_kerja</code> (opsional).
                                </CardDescription>
                            </div>
                            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 shrink-0">
                                <Download className="h-4 w-4" />
                                Download Template
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Drag & Drop Zone */}
                        {batchPreview.length === 0 && (
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragOver
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                                    }
                `}
                            >
                                <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm font-medium text-foreground">
                                    Drag & drop file Excel di sini
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    atau klik untuk memilih file (.xlsx, .xls, .csv)
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        )}

                        {/* Preview Data */}
                        {batchPreview.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Pratinjau: {batchPreview.length} baris data
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{batchFile?.name}</Badge>
                                        <Button variant="ghost" size="sm" onClick={resetBatch} className="gap-1">
                                            <Trash2 className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    </div>
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden md:block border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Nomor Induk</TableHead>
                                                <TableHead>Nama</TableHead>
                                                <TableHead>Unit Kerja</TableHead>
                                                {batchResults.length > 0 && <TableHead>Status</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {batchPreview.map((row, i) => {
                                                const result = batchResults.find((r) => r.index === i);
                                                return (
                                                    <TableRow key={i}>
                                                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                        <TableCell className="font-mono">{row.nomor_induk || "-"}</TableCell>
                                                        <TableCell>{row.nama || "-"}</TableCell>
                                                        <TableCell>{row.unit_kerja || "-"}</TableCell>
                                                        {result && (
                                                            <TableCell>
                                                                {result.success ? (
                                                                    <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                        <CheckCircle className="h-3 w-3" /> Berhasil
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="destructive" className="gap-1">
                                                                        <XCircle className="h-3 w-3" /> {result.message}
                                                                    </Badge>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-2 max-h-[400px] overflow-y-auto">
                                    {batchPreview.map((row, i) => {
                                        const result = batchResults.find((r) => r.index === i);
                                        return (
                                            <Card key={i} className="p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="space-y-1 min-w-0">
                                                        <p className="font-mono font-medium text-sm">{row.nomor_induk || "-"}</p>
                                                        <p className="text-sm text-muted-foreground truncate">{row.nama || "-"}</p>
                                                        <p className="text-xs text-muted-foreground">{row.unit_kerja || "-"}</p>
                                                    </div>
                                                    {result && (
                                                        result.success ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                                        )
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <Button
                                    onClick={handleBatchImport}
                                    disabled={batchImporting}
                                    className="w-full sm:w-auto gap-2"
                                >
                                    {batchImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    {batchImporting ? "Mengimport..." : `Import ${batchPreview.length} Data`}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
};

export default ImportData;
