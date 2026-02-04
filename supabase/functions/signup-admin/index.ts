import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Validation helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_\-\s]+$/;

function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email wajib diisi" };
  }
  const trimmed = email.trim();
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Format email tidak valid" };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: "Email maksimal 255 karakter" };
  }
  return { valid: true };
}

function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username wajib diisi" };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 50) {
    return { valid: false, error: "Username harus 3-50 karakter" };
  }
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "Username hanya boleh huruf, angka, spasi, underscore dan dash" };
  }
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password wajib diisi" };
  }
  if (password.length < 6) {
    return { valid: false, error: "Password minimal 6 karakter" };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password maksimal 128 karakter" };
  }
  return { valid: true };
}

// Get allowed origins for CORS
function getAllowedOrigin(origin: string | null): string {
  const allowedOrigins = [
    Deno.env.get("SITE_URL"),
    "https://id-preview--3407bea8-a3a5-43b5-b1e9-e4a4ec9a4e04.lovable.app",
    "http://localhost:5173",
    "http://localhost:8080",
  ].filter(Boolean);
  
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return allowedOrigins[0] || "*";
}

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(origin),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Credentials": "true",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    let body: { email?: string; password?: string; username?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password, username } = body;

    // Comprehensive input validation
    const emailValidation = validateEmail(email || "");
    if (!emailValidation.valid) {
      return new Response(
        JSON.stringify({ error: emailValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const usernameValidation = validateUsername(username || "");
    if (!usernameValidation.valid) {
      return new Response(
        JSON.stringify({ error: usernameValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const passwordValidation = validatePassword(password || "");
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({ error: passwordValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for user creation
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email!.trim().toLowerCase()
    );
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "Email sudah terdaftar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the new user using admin API
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email!.trim(),
      password: password!,
      email_confirm: true, // Auto-confirm the email for now
    });

    if (createError) {
      console.error("Admin signup error:", createError);
      return new Response(
        JSON.stringify({ error: "Gagal membuat akun. Silakan coba lagi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUserData.user) {
      return new Response(
        JSON.stringify({ error: "Gagal membuat akun" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile for the new user with PENDING status
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: newUserData.user.id,
        username: username!.trim(),
        email: email!.trim(),
        status: "pending", // Needs admin approval
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Clean up the auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(newUserData.user.id);
      return new Response(
        JSON.stringify({ error: "Gagal membuat profil. Silakan coba lagi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add admin role (but user won't be able to login until approved)
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUserData.user.id,
        role: "admin",
      });

    if (roleInsertError) {
      console.error("Role creation error:", roleInsertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Pendaftaran berhasil. Menunggu aktivasi oleh admin utama.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan. Silakan coba lagi." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
