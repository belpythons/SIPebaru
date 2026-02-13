import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Validation helpers
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_-]+$/;

function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }
  const trimmed = email.trim();
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }
  if (trimmed.length > 255) {
    return { valid: false, error: "Email must be less than 255 characters" };
  }
  return { valid: true };
}

function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 50) {
    return { valid: false, error: "Username must be 3-50 characters" };
  }
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, error: "Username can only contain letters, numbers, underscores and hyphens" };
  }
  return { valid: true };
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters" };
  }
  if (password.length > 128) {
    return { valid: false, error: "Password must be less than 128 characters" };
  }
  return { valid: true };
}

// Safe error mapping to prevent information leakage
function mapErrorToSafeMessage(error: Error | { message?: string }): string {
  const message = error?.message?.toLowerCase() || "";
  
  if (message.includes("duplicate") || message.includes("already exists") || message.includes("already registered")) {
    return "Email address is already in use";
  }
  if (message.includes("invalid email")) {
    return "Invalid email format";
  }
  if (message.includes("password")) {
    return "Password does not meet requirements";
  }
  
  // Return generic message for all other errors
  return "Failed to create admin account";
}

function getCorsHeaders(_origin: string | null) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to verify the caller is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is an admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    let body: { email?: string; password?: string; username?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
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

    // Admin client for creating users
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create the new user using admin API
    const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
      email: email!.trim(),
      password: password!,
      email_confirm: true, // Auto-confirm the email
    });

    if (createError) {
      console.error("Admin creation error:", createError);
      return new Response(
        JSON.stringify({ error: mapErrorToSafeMessage(createError) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUserData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create admin account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile for the new user
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        user_id: newUserData.user.id,
        username: username!.trim(),
        email: email!.trim(),
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail the request, profile can be created later
    }

    // Add admin role
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUserData.user.id,
        role: "admin",
      });

    if (roleInsertError) {
      console.error("Role creation error:", roleInsertError);
      // Don't fail the request, but log the error
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin account created successfully",
        user_id: newUserData.user.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
