import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Loader2, ShieldCheck, ArrowRight } from "lucide-react";

const PortalBadge = () => {
    const navigate = useNavigate();
    const [nomorInduk, setNomorInduk] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    const handleValidate = async () => {
        const trimmed = nomorInduk.trim();
        if (!trimmed) {
            toast({
                title: "Nomor Induk diperlukan",
                description: "Silakan masukkan Nomor Induk Anda untuk melanjutkan",
                variant: "destructive",
            });
            return;
        }

        setIsValidating(true);
        try {
            // Cek apakah nomor induk terdaftar di members_batch
            const { data, error } = await supabase
                .from("members_batch")
                .select("id, nomor_induk, nama, unit_kerja")
                .eq("nomor_induk", trimmed)
                .is("deleted_at", null)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                toast({
                    title: "Nomor Induk tidak ditemukan",
                    description: "Nomor Induk Anda tidak terdaftar dalam sistem. Silakan hubungi administrator.",
                    variant: "destructive",
                });
                return;
            }

            // Simpan sesi ke sessionStorage
            sessionStorage.setItem("portal_badge_valid", "true");
            sessionStorage.setItem("portal_badge_nomor", trimmed);
            sessionStorage.setItem("portal_badge_nama", data.nama || "");
            sessionStorage.setItem("portal_badge_unit", data.unit_kerja || "");

            // Catat entri ke activity_logs
            await supabase.from("activity_logs").insert({
                action: "portal_badge_login",
                user_name: data.nama || trimmed,
                details: {
                    nomor_induk: trimmed,
                    nama: data.nama,
                    unit_kerja: data.unit_kerja,
                },
            });

            toast({
                title: "Verifikasi berhasil",
                description: `Selamat datang, ${data.nama || trimmed}!`,
            });

            navigate("/pengaduan");
        } catch (error: any) {
            console.error("Error validating nomor induk:", error);
            toast({
                title: "Terjadi kesalahan",
                description: "Tidak dapat memverifikasi Nomor Induk. Silakan coba lagi.",
                variant: "destructive",
            });
        } finally {
            setIsValidating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleValidate();
    };

    return (
        <div className="min-h-screen relative flex flex-col overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-400/10 to-cyan-300/5" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-blue-300/15 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                    <div className="container max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="flex h-14 sm:h-16 items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <img src="/icon.png" alt="SIPebaru" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-base sm:text-lg text-foreground leading-tight">SIPebaru</span>
                                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Sistem Informasi Pengaduan Barang Rusak</span>
                                </div>
                            </div>
                            <Button variant="outline" onClick={() => navigate("/login")} className="gap-2" size="sm">
                                <LogIn className="h-4 w-4" />
                                <span className="hidden sm:inline">Masuk Admin</span>
                                <span className="sm:hidden">Masuk</span>
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Konten Utama */}
                <main className="flex-1 flex items-center justify-center container max-w-lg mx-auto px-4 sm:px-6 py-8 sm:py-12">
                    <Card className="w-full shadow-xl border-0 bg-card/80 backdrop-blur-sm animate-fade-in">
                        <CardHeader className="text-center pb-4 sm:pb-6 px-6 sm:px-8 pt-6 sm:pt-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 mb-4 mx-auto">
                                <img src="/icon.png" alt="SIPebaru" className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
                            </div>
                            <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent pb-1">
                                Portal Badge
                            </CardTitle>
                            <p className="text-sm sm:text-base text-muted-foreground mt-2">
                                Masukkan Nomor Induk Anda untuk mengakses layanan pengaduan barang rusak
                            </p>
                        </CardHeader>
                        <CardContent className="px-6 sm:px-8 pb-6 sm:pb-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        id="nomor-induk"
                                        placeholder="Masukkan Nomor Induk"
                                        value={nomorInduk}
                                        onChange={(e) => setNomorInduk(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="h-12 sm:h-14 text-center text-lg sm:text-xl font-medium tracking-wider bg-background"
                                        autoComplete="off"
                                    />
                                </div>
                                <Button
                                    onClick={handleValidate}
                                    disabled={isValidating}
                                    className="w-full gap-2 h-12 sm:h-14 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all"
                                >
                                    {isValidating ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-5 w-5" />
                                    )}
                                    {isValidating ? "Memverifikasi..." : "Verifikasi & Lanjutkan"}
                                </Button>

                                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground justify-center pt-2">
                                    <ArrowRight className="h-3 w-3" />
                                    <span>Nomor Induk Anda akan diverifikasi secara otomatis</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </main>

                {/* Footer */}
                <footer className="bg-card/50 backdrop-blur-sm border-t mt-auto">
                    <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-5">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                            <div className="flex items-center gap-2">
                                <img src="/icon.png" alt="SIPebaru" className="w-6 h-6 rounded-md object-contain" />
                                <span className="font-medium text-foreground text-sm">SIPebaru</span>
                            </div>
                            <span className="hidden sm:inline text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground text-center">© {new Date().getFullYear()} Sistem Informasi Pengaduan Barang Rusak</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PortalBadge;
