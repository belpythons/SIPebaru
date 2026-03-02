// =============================================================================
// Shared TypeScript types for SIPebaru
// =============================================================================

/** Status pengaduan */
export type ComplaintStatus = "pending" | "processing" | "completed";

/** Data pengaduan (minimal untuk listing) */
export interface Complaint {
  id: string;
  ticket_number: string;
  complaint_code: string;
  npk: string | null;
  reporter_name: string;
  department: string;
  item_name: string;
  quantity: number;
  description: string | null;
  kompartemen: string | null;
  status: ComplaintStatus;
  admin_note: string | null;
  photo_url: string | null;
  completion_photo_url: string | null;
  reported_at: string;
  processed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Profil admin/user */
export interface Profile {
  id: string;
  user_id: string;
  username: string;
  npk: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Department / Unit Kerja */
export interface Department {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
