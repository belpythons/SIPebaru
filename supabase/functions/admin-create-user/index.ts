import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =============================================
// Edge Function: admin-create-user
// Membuat satu atau banyak akun pengguna secara bulk
// menggunakan Admin API (service role key) untuk
// menghindari penimpaan sesi Super Admin.
// =============================================

// Validasi helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_-]+$/;

interface UserPayload {
    email: string;
    password: string;
    username: string;
    role: "admin" | "viewer";
    npk?: string;
}

interface BulkResult {
    index: number;
    email: string;
    username: string;
    success: boolean;
    error?: string;
    user_id?: string;
}

function validateUser(user: UserPayload, index: number): string | null {
    if (!user.email || !emailRegex.test(user.email.trim())) {
        return `Baris ${index + 1}: Format email tidak valid`;
    }
    if (user.email.trim().length > 255) {
        return `Baris ${index + 1}: Email harus kurang dari 255 karakter`;
    }
    if (!user.username || user.username.trim().length < 3 || user.username.trim().length > 50) {
        return `Baris ${index + 1}: Username harus 3-50 karakter`;
    }
    if (!usernameRegex.test(user.username.trim())) {
        return `Baris ${index + 1}: Username hanya boleh huruf, angka, underscore, dan strip`;
    }
    if (!user.password || user.password.length < 6) {
        return `Baris ${index + 1}: Password minimal 6 karakter`;
    }
    if (user.password.length > 128) {
        return `Baris ${index + 1}: Password harus kurang dari 128 karakter`;
    }
    if (!["admin", "viewer"].includes(user.role)) {
        return `Baris ${index + 1}: Role harus 'admin' atau 'viewer'`;
    }
    return null;
}

function mapErrorToSafeMessage(error: Error | { message?: string }): string {
    const message = error?.message?.toLowerCase() || "";
    if (message.includes("duplicate") || message.includes("already exists") || message.includes("already registered")) {
        return "Email sudah terdaftar";
    }
    if (message.includes("invalid email")) {
        return "Format email tidak valid";
    }
    if (message.includes("password")) {
        return "Password tidak memenuhi syarat";
    }
    return "Gagal membuat akun";
}

function getCorsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    };
}

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders();

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Autentikasi
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Autentikasi diperlukan" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Client pengguna untuk verifikasi caller adalah super_admin
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Autentikasi diperlukan" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verifikasi caller punya role super_admin
        const { data: roleData, error: roleError } = await userClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "super_admin")
            .maybeSingle();

        if (roleError || !roleData) {
            return new Response(
                JSON.stringify({ error: "Hanya Super Admin yang bisa membuat akun" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse body
        let body: { users: UserPayload[] };
        try {
            body = await req.json();
        } catch {
            return new Response(
                JSON.stringify({ error: "Body permintaan tidak valid" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { users } = body;

        if (!Array.isArray(users) || users.length === 0) {
            return new Response(
                JSON.stringify({ error: "Daftar pengguna kosong" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (users.length > 100) {
            return new Response(
                JSON.stringify({ error: "Maksimal 100 pengguna per batch" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validasi semua pengguna sebelum proses
        const validationErrors: string[] = [];
        for (let i = 0; i < users.length; i++) {
            const err = validateUser(users[i], i);
            if (err) validationErrors.push(err);
        }

        if (validationErrors.length > 0) {
            return new Response(
                JSON.stringify({ error: "Validasi gagal", details: validationErrors }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Admin client untuk membuat user menggunakan service role
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // Proses pembuatan akun secara berurutan
        const results: BulkResult[] = [];
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < users.length; i++) {
            const userData = users[i];
            try {
                // Buat auth user
                const { data: newUserData, error: createError } =
                    await adminClient.auth.admin.createUser({
                        email: userData.email.trim(),
                        password: userData.password,
                        email_confirm: true,
                    });

                if (createError || !newUserData.user) {
                    failCount++;
                    results.push({
                        index: i,
                        email: userData.email,
                        username: userData.username,
                        success: false,
                        error: createError ? mapErrorToSafeMessage(createError) : "Gagal membuat akun",
                    });
                    continue;
                }

                // Buat profile
                await adminClient.from("profiles").insert({
                    user_id: newUserData.user.id,
                    username: userData.username.trim(),
                    npk: userData.npk?.trim() || null,
                    email: userData.email.trim(),
                });

                // Assign role
                await adminClient.from("user_roles").insert({
                    user_id: newUserData.user.id,
                    role: userData.role,
                });

                successCount++;
                results.push({
                    index: i,
                    email: userData.email,
                    username: userData.username,
                    success: true,
                    user_id: newUserData.user.id,
                });
            } catch (err: unknown) {
                failCount++;
                const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
                results.push({
                    index: i,
                    email: userData.email,
                    username: userData.username,
                    success: false,
                    error: errorMsg,
                });
            }
        }

        // Log aktivitas
        await adminClient.from("activity_logs").insert({
            user_id: user.id,
            user_name: user.email,
            action: "BULK_CREATE_USERS",
            details: {
                total: users.length,
                success: successCount,
                failed: failCount,
            },
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: `${successCount} akun berhasil dibuat, ${failCount} gagal`,
                total: users.length,
                success_count: successCount,
                fail_count: failCount,
                results,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: unknown) {
        console.error("Kesalahan tidak terduga:", error);
        return new Response(
            JSON.stringify({ error: "Terjadi kesalahan tidak terduga" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
