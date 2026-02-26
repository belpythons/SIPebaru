import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const PAGE_SIZE = 20;

const ActivityLogs = () => {
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");

    // Ambil data activity logs dengan pagination
    const { data, isLoading } = useQuery({
        queryKey: ["activity_logs", page, searchQuery, actionFilter],
        queryFn: async () => {
            let query = supabase
                .from("activity_logs")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (searchQuery.trim()) {
                query = query.or(
                    `user_name.ilike.%${searchQuery.trim()}%,action.ilike.%${searchQuery.trim()}%`
                );
            }

            if (actionFilter !== "all") {
                query = query.eq("action", actionFilter);
            }

            const { data, error, count } = await query;
            if (error) throw error;
            return { logs: data || [], total: count || 0 };
        },
    });

    const logs = data?.logs || [];
    const totalCount = data?.total || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Label aksi yang ramah pengguna
    const actionLabels: Record<string, string> = {
        portal_badge_login: "Login Portal Badge",
        bulk_user_create: "Buat Akun Massal",
        create_admin: "Buat Akun Admin",
        update_complaint: "Ubah Pengaduan",
        delete_complaint: "Hapus Pengaduan",
    };

    const getActionLabel = (action: string) => actionLabels[action] || action;

    const getActionBadgeVariant = (action: string) => {
        if (action.includes("delete")) return "destructive" as const;
        if (action.includes("create") || action.includes("bulk")) return "default" as const;
        return "secondary" as const;
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                        <ScrollText className="h-7 w-7 text-primary" />
                        Log Aktivitas
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Riwayat semua aktivitas yang terjadi di sistem
                    </p>
                </div>

                {/* Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari berdasarkan nama atau aksi..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                            className="pl-10"
                        />
                    </div>
                    <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filter Aksi" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua Aksi</SelectItem>
                            <SelectItem value="portal_badge_login">Login Portal Badge</SelectItem>
                            <SelectItem value="bulk_user_create">Buat Akun Massal</SelectItem>
                            <SelectItem value="create_admin">Buat Akun Admin</SelectItem>
                            <SelectItem value="update_complaint">Ubah Pengaduan</SelectItem>
                            <SelectItem value="delete_complaint">Hapus Pengaduan</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Loading Skeleton */}
                {isLoading && (
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                        ))}
                    </div>
                )}

                {/* Kosong */}
                {!isLoading && logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Inbox className="h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-semibold text-muted-foreground">Belum ada log aktivitas</h3>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            Log aktivitas akan muncul di sini setelah ada interaksi dalam sistem.
                        </p>
                    </div>
                )}

                {/* Desktop Table */}
                {!isLoading && logs.length > 0 && (
                    <>
                        <div className="hidden md:block border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Waktu</TableHead>
                                        <TableHead>Pengguna</TableHead>
                                        <TableHead>Aksi</TableHead>
                                        <TableHead>Detail</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                                            </TableCell>
                                            <TableCell className="font-medium">{log.user_name || "-"}</TableCell>
                                            <TableCell>
                                                <Badge variant={getActionBadgeVariant(log.action)}>
                                                    {getActionLabel(log.action)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                                                {log.details ? JSON.stringify(log.details).slice(0, 100) : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-2">
                            {logs.map((log) => (
                                <Card key={log.id} className="p-3">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-sm">{log.user_name || "Sistem"}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                                                </p>
                                            </div>
                                            <Badge variant={getActionBadgeVariant(log.action)} className="text-xs flex-shrink-0">
                                                {getActionLabel(log.action)}
                                            </Badge>
                                        </div>
                                        {log.details && (
                                            <p className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 truncate">
                                                {JSON.stringify(log.details).slice(0, 80)}
                                            </p>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-muted-foreground">
                                Menampilkan {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} dari {totalCount} log
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page >= totalPages - 1}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    );
};

export default ActivityLogs;
