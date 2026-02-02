import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Building2, MapPin, Calendar, FileText } from "lucide-react";

interface Complaint {
  ticket_number: string;
  item_name: string;
  department: string;
  kompartemen: string | null;
  status: "pending" | "processing" | "completed";
  reported_at: string;
  description: string | null;
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

export function StatusSearchResult({ complaint }: StatusSearchResultProps) {
  const config = statusConfig[complaint.status];

  return (
    <Card className="w-full max-w-lg mx-auto mt-6 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {complaint.ticket_number}
          </CardTitle>
          <Badge className={config.color} variant="outline">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Nama Barang</p>
              <p className="font-medium">{complaint.item_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Departemen</p>
              <p className="font-medium">{complaint.department}</p>
            </div>
          </div>

          {complaint.kompartemen && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Kompartemen</p>
                <p className="font-medium">{complaint.kompartemen}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Lapor</p>
              <p className="font-medium">
                {new Date(complaint.reported_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {complaint.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Deskripsi</p>
                <p className="font-medium">{complaint.description}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{config.progress}%</span>
          </div>
          <Progress value={config.progress} className="h-3" />
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
