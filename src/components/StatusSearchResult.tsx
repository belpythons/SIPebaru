import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, Calendar, FileText, Clock, CheckCircle, Camera } from "lucide-react";

interface Complaint {
  ticket_number: string;
  item_name: string;
  department: string;
  kompartemen: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
  processed_at?: string | null;
  completed_at?: string | null;
  description: string | null;
  reporter_name?: string; // Optional - not exposed in public search
  admin_note?: string | null; // Optional - not exposed in public search
  completion_photo_url?: string | null;
}

interface StatusSearchResultProps {
  complaint: Complaint;
}

const statusConfig = {
  pending: {
    label: "Diajukan",
    color: "bg-yellow-100 text-yellow-800 border-yellow-300",
    progress: 33,
  },
  processing: {
    label: "Diproses",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    progress: 66,
  },
  completed: {
    label: "Selesai",
    color: "bg-green-100 text-green-800 border-green-300",
    progress: 100,
  },
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export function StatusSearchResult({ complaint }: StatusSearchResultProps) {
  const config = statusConfig[complaint.status];

  return (
    <Card className="w-full max-w-lg mx-auto mt-4 sm:mt-6 shadow-lg">
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold truncate">
            {complaint.ticket_number}
          </CardTitle>
          <Badge className={config.color} variant="outline">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-start gap-2 sm:gap-3">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">Nama Barang</p>
              <p className="font-medium text-sm sm:text-base truncate">{complaint.item_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-3">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground">Departemen</p>
              <p className="font-medium text-sm sm:text-base truncate">{complaint.department}</p>
            </div>
          </div>

          {/* Timeline Dates */}
          <div className="bg-muted/30 rounded-lg p-2 sm:p-3 space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Calendar className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Tanggal Lapor</p>
                <p className="text-xs sm:text-sm font-medium">{formatDate(complaint.reported_at)}</p>
              </div>
            </div>
            
            {complaint.processed_at && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Tanggal Diproses</p>
                  <p className="text-xs sm:text-sm font-medium">{formatDate(complaint.processed_at)}</p>
                </div>
              </div>
            )}
            
            {complaint.completed_at && (
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Tanggal Selesai</p>
                  <p className="text-xs sm:text-sm font-medium">{formatDate(complaint.completed_at)}</p>
                </div>
              </div>
            )}
          </div>

          {complaint.description && (
            <div className="flex items-start gap-2 sm:gap-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Deskripsi</p>
                <p className="font-medium text-sm sm:text-base break-words">{complaint.description}</p>
              </div>
            </div>
          )}

          {/* Completion Photo - shown when status is completed */}
          {complaint.status === "completed" && complaint.completion_photo_url && (
            <div className="flex items-start gap-2 sm:gap-3">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Foto Bukti Penyelesaian</p>
                <img 
                  src={complaint.completion_photo_url} 
                  alt="Foto bukti penyelesaian" 
                  className="mt-2 w-full max-w-xs rounded-lg border shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-1 sm:pt-2">
          <div className="flex justify-between text-xs sm:text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{config.progress}%</span>
          </div>
          <Progress value={config.progress} className="h-2 sm:h-3" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Diajukan</span>
            <span>Diproses</span>
            <span>Selesai</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
