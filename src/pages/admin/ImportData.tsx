import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, Users, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";
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

interface AccountRow {
    email: string;
    username: string;
    password: string;
    role: "admin" | "viewer";
    npk?: string;
}

interface ImportResult {
    index: number;
    success: boolean;
    message: string;
}

// =============================================
// KOMPONEN UTAMA
// =============================================
const ImportData = () => {
    const queryClient = useQueryClient();

    // State Tab 1 - Import Nomor Batch
    const [batchFile, setBatchFile] = useState<File | null>(null);
    const [batchPreview, setBatchPreview] = useState<BatchRow[]>([]);
    const [batchImporting, setBatchImporting] = useState(false);
    const [batchResults, setBatchResults] = useState<ImportResult[]>([]);

    // State Tab 2 - Import Akun Internal
    const [accountFile, setAccountFile] = useState<File | null>(null);
    const [accountPreview, setAccountPreview] = useState<AccountRow[]>([]);
    const [accountImporting, setAccountImporting] = useState(false);
    const [accountResults, setAccountResults] = useState<ImportResult[]>([]);

    // =============================================
    // TAB 1: PARSE FILE NOMOR BATCH
    // =============================================
    const handleBatchFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setBatchFile(file);
        setBatchResults([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

                const parsed: BatchRow[] = jsonData
                    .map((row) => ({
                        nomor_induk: String(row["nomor_induk"] || row["Nomor Induk"] || row["NomorInduk"] || row["NPK"] || Object.values(row)[0] || "").trim(),
                        nama: String(row["nama"] || row["Nama"] || row["Name"] || Object.values(row)[1] || "").trim(),
                        unit_kerja: String(row["unit_kerja"] || row["Unit Kerja"] || row["UnitKerja"] || Object.values(row)[2] || "").trim(),
                    }))
                    .filter((r) => r.nomor_induk !== "");

                setBatchPreview(parsed);
                if (parsed.length === 0) {
                    toast.error("File tidak mengandung data yang valid");
                }
            } catch {
                toast.error("Gagal membaca file. Pastikan format file benar (xlsx/csv).");
                setBatchPreview([]);
            }
        };
        reader.readAsBinaryString(file);
    }, []);

    // =============================================
    // TAB 1: IMPORT NOMOR BATCH KE DATABASE
    // =============================================
    const handleBatchImport = async () => {
        if (batchPreview.length === 0) return;
        setBatchImporting(true);
        const results: ImportResult[] = [];

        try {
            // Upsert semua data ke members_batch
            const insertData = batchPreview.map((row) => ({
                nomor_induk: row.nomor_induk,
                nama: row.nama || null,
                unit_kerja: row.unit_kerja || null,
            }));

            const { error } = await supabase
                .from("members_batch")
                .upsert(insertData, { onConflict: "nomor_induk" });

            if (error) throw error;

            batchPreview.forEach((_, i) => {
                results.push({ index: i, success: true, message: "Berhasil diimport" });
            });

            toast.success(`${batchPreview.length} data berhasil diimport`);
            queryClient.invalidateQueries({ queryKey: ["members_batch"] });
        } catch (err: any) {
            batchPreview.forEach((_, i) => {
                results.push({ index: i, success: false, message: err.message || "Gagal" });
            });
            toast.error("Gagal mengimport data: " + (err.message || "Kesalahan tidak diketahui"));
        } finally {
            setBatchResults(results);
            setBatchImporting(false);
        }
    };

    // =============================================
    // TAB 2: PARSE FILE AKUN INTERNAL
    // =============================================
    const handleAccountFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAccountFile(file);
        setAccountResults([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

                const parsed: AccountRow[] = jsonData
                    .map((row) => ({
                        email: String(row["email"] || row["Email"] || "").trim(),
                        username: String(row["username"] || row["Username"] || row["Nama"] || "").trim(),
                        password: String(row["password"] || row["Password"] || "").trim(),
                        role: (String(row["role"] || row["Role"] || "admin").trim().toLowerCase() === "viewer" ? "viewer" : "admin") as "admin" | "viewer",
                        npk: String(row["npk"] || row["NPK"] || "").trim() || undefined,
                    }))
                    .filter((r) => r.email !== "" && r.username !== "" && r.password !== "");

                setAccountPreview(parsed);
                if (parsed.length === 0) {
                    toast.error("File tidak mengandung data akun yang valid. Pastikan kolom email, username, dan password terisi.");
                }
            } catch {
                toast.error("Gagal membaca file. Pastikan format file benar (xlsx/csv).");
                setAccountPreview([]);
            }
        };
        reader.readAsBinaryString(file);
    }, []);

    // =============================================
    // TAB 2: IMPORT AKUN VIA EDGE FUNCTION
    // =============================================
    const handleAccountImport = async () => {
        if (accountPreview.length === 0) return;
        setAccountImporting(true);
        const results: ImportResult[] = [];

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("Sesi habis. Silakan login kembali.");
                return;
            }

            const response = await supabase.functions.invoke("admin-create-user", {
                body: { users: accountPreview },
            });

            if (response.error) throw response.error;

            const resData = response.data;
            if (resData?.results) {
                resData.results.forEach((r: any, i: number) => {
                    results.push({
                        index: i,
                        success: r.success,
                        message: r.success ? "Akun berhasil dibuat" : (r.error || "Gagal membuat akun"),
                    });
                });
            }

            const successCount = results.filter((r) => r.success).length;
            const failCount = results.filter((r) => !r.success).length;

            if (failCount === 0) {
                toast.success(`Semua ${successCount} akun berhasil dibuat`);
            } else {
                toast.warning(`${successCount} berhasil, ${failCount} gagal`);
            }

            queryClient.invalidateQueries({ queryKey: ["accounts"] });
        } catch (err: any) {
            toast.error("Gagal membuat akun: " + (err.message || "Kesalahan tidak diketahui"));
            accountPreview.forEach((_, i) => {
                results.push({ index: i, success: false, message: err.message || "Gagal" });
            });
        } finally {
            setAccountResults(results);
            setAccountImporting(false);
        }
    };

    // =============================================
    // RESET
    // =============================================
    const resetBatch = () => {
        setBatchFile(null);
        setBatchPreview([]);
        setBatchResults([]);
    };

    const resetAccount = () => {
        setAccountFile(null);
        setAccountPreview([]);
        setAccountResults([]);
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Import Data</h1>
                    <p className="text-muted-foreground mt-1">Import data anggota atau akun internal secara massal</p>
                </div>

                <Tabs defaultValue="batch" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="batch" className="gap-2">
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="hidden sm:inline">Nomor Batch User</span>
                            <span className="sm:hidden">Batch</span>
                        </TabsTrigger>
                        <TabsTrigger value="accounts" className="gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Akun Internal</span>
                            <span className="sm:hidden">Akun</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* ========== TAB 1: NOMOR BATCH ========== */}
                    <TabsContent value="batch" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                                    Import Nomor Batch User
                                </CardTitle>
                                <CardDescription>
                                    Upload file Excel/CSV dengan kolom: <code>nomor_induk</code>, <code>nama</code>, <code>unit_kerja</code>.
                                    Data akan ditambahkan ke tabel anggota untuk validasi Portal Badge.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleBatchFileChange}
                                        className="flex-1"
                                    />
                                    {batchPreview.length > 0 && (
                                        <Button variant="ghost" onClick={resetBatch} className="gap-2">
                                            <Trash2 className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    )}
                                </div>

                                {/* Tabel Preview */}
                                {batchPreview.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Pratinjau: {batchPreview.length} baris data
                                            </p>
                                            <Badge variant="outline">{batchFile?.name}</Badge>
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
                                                        const result = batchResults[i];
                                                        return (
                                                            <TableRow key={i}>
                                                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                                <TableCell className="font-mono">{row.nomor_induk}</TableCell>
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
                                                                                <XCircle className="h-3 w-3" /> Gagal
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
                                                const result = batchResults[i];
                                                return (
                                                    <Card key={i} className="p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="space-y-1 min-w-0">
                                                                <p className="font-mono font-medium text-sm">{row.nomor_induk}</p>
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
                    </TabsContent>

                    {/* ========== TAB 2: AKUN INTERNAL ========== */}
                    <TabsContent value="accounts" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    Import Akun Internal
                                </CardTitle>
                                <CardDescription>
                                    Upload file Excel/CSV dengan kolom: <code>email</code>, <code>username</code>, <code>password</code>, <code>role</code> (admin/viewer).
                                    Akun akan dibuat secara aman melalui Edge Function.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleAccountFileChange}
                                        className="flex-1"
                                    />
                                    {accountPreview.length > 0 && (
                                        <Button variant="ghost" onClick={resetAccount} className="gap-2">
                                            <Trash2 className="h-4 w-4" />
                                            Reset
                                        </Button>
                                    )}
                                </div>

                                {accountPreview.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Pratinjau: {accountPreview.length} akun
                                            </p>
                                            <Badge variant="outline">{accountFile?.name}</Badge>
                                        </div>

                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3 flex gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                                Pastikan data sudah benar sebelum import. Password tidak dapat diubah setelah akun dibuat melalui import.
                                            </p>
                                        </div>

                                        {/* Desktop Table */}
                                        <div className="hidden md:block border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-12">#</TableHead>
                                                        <TableHead>Email</TableHead>
                                                        <TableHead>Username</TableHead>
                                                        <TableHead>Role</TableHead>
                                                        {accountResults.length > 0 && <TableHead>Status</TableHead>}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {accountPreview.map((row, i) => {
                                                        const result = accountResults[i];
                                                        return (
                                                            <TableRow key={i}>
                                                                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                                                                <TableCell className="font-mono text-sm">{row.email}</TableCell>
                                                                <TableCell>{row.username}</TableCell>
                                                                <TableCell>
                                                                    <Badge variant={row.role === "admin" ? "default" : "secondary"}>
                                                                        {row.role}
                                                                    </Badge>
                                                                </TableCell>
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
                                            {accountPreview.map((row, i) => {
                                                const result = accountResults[i];
                                                return (
                                                    <Card key={i} className="p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="space-y-1 min-w-0">
                                                                <p className="font-mono text-sm truncate">{row.email}</p>
                                                                <p className="text-sm text-muted-foreground">{row.username}</p>
                                                                <Badge variant={row.role === "admin" ? "default" : "secondary"} className="text-xs">
                                                                    {row.role}
                                                                </Badge>
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
                                            onClick={handleAccountImport}
                                            disabled={accountImporting}
                                            className="w-full sm:w-auto gap-2"
                                        >
                                            {accountImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                            {accountImporting ? "Membuat akun..." : `Buat ${accountPreview.length} Akun`}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminLayout>
    );
};

export default ImportData;
