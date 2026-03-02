// =============================================================================
// Shared constants for SIPebaru
// =============================================================================

import type { ComplaintStatus } from "@/lib/types";

/** Label status pengaduan (Bahasa Indonesia) */
export const STATUS_LABELS: Record<ComplaintStatus, string> = {
    pending: "Belum Diproses",
    processing: "Sedang Diproses",
    completed: "Selesai",
};

/** Badge variant per status */
export const STATUS_VARIANTS: Record<ComplaintStatus, "destructive" | "default" | "info" | "success"> = {
    pending: "destructive",
    processing: "info",
    completed: "success",
};

/** Items per page for paginated lists */
export const ITEMS_PER_PAGE = 10;
