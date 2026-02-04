export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      complaints: {
        Row: {
          admin_note: string | null
          completed_at: string | null
          completion_photo_url: string | null
          created_at: string
          department: string
          description: string | null
          id: string
          item_name: string
          kompartemen: string | null
          photo_url: string | null
          processed_at: string | null
          quantity: number
          reported_at: string
          reporter_name: string
          status: Database["public"]["Enums"]["complaint_status"]
          ticket_number: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          completed_at?: string | null
          completion_photo_url?: string | null
          created_at?: string
          department: string
          description?: string | null
          id?: string
          item_name: string
          kompartemen?: string | null
          photo_url?: string | null
          processed_at?: string | null
          quantity?: number
          reported_at?: string
          reporter_name: string
          status?: Database["public"]["Enums"]["complaint_status"]
          ticket_number: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          completed_at?: string | null
          completion_photo_url?: string | null
          created_at?: string
          department?: string
          description?: string | null
          id?: string
          item_name?: string
          kompartemen?: string | null
          photo_url?: string | null
          processed_at?: string | null
          quantity?: number
          reported_at?: string
          reporter_name?: string
          status?: Database["public"]["Enums"]["complaint_status"]
          ticket_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      sipebaru_users: {
        Row: {
          created_at: string
          email: string | null
          fid: number
          nama: string
          npk: string
          password_hash: string
          rfid: string | null
          status: Database["public"]["Enums"]["user_status"]
          unit_kerja: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          fid?: number
          nama: string
          npk: string
          password_hash: string
          rfid?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          unit_kerja: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          fid?: number
          nama?: string
          npk?: string
          password_hash?: string
          rfid?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          unit_kerja?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_sipebaru_user: {
        Args: { login_identifier: string; login_password: string }
        Returns: {
          email: string
          error_message: string
          fid: number
          nama: string
          npk: string
          rfid: string
          status: Database["public"]["Enums"]["user_status"]
          unit_kerja: string
        }[]
      }
      generate_ticket_number: { Args: never; Returns: string }
      get_complaint_status: {
        Args: { ticket_num: string }
        Returns: {
          completed_at: string
          completion_photo_url: string
          department: string
          description: string
          item_name: string
          kompartemen: string
          processed_at: string
          reported_at: string
          status: string
          ticket_number: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: { Args: { password: string }; Returns: string }
      register_sipebaru_user: {
        Args: {
          _email: string
          _nama: string
          _npk: string
          _password: string
          _rfid: string
          _unit_kerja: string
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      setup_first_admin: {
        Args: { _user_id: string; _username: string }
        Returns: boolean
      }
      verify_password: {
        Args: { password: string; password_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "admin_utama"
      complaint_status: "pending" | "processing" | "completed"
      user_status: "pending" | "active" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "admin_utama"],
      complaint_status: ["pending", "processing", "completed"],
      user_status: ["pending", "active", "rejected"],
    },
  },
} as const
