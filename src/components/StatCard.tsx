import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: "default" | "primary" | "warning" | "success" | "info";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary text-primary-foreground",
  warning: "bg-warning text-warning-foreground",
  success: "bg-success text-success-foreground",
  info: "bg-info text-info-foreground",
};

const StatCard = ({ title, value, icon: Icon, variant = "default" }: StatCardProps) => {
  const isPrimary = variant !== "default";
  
  return (
    <Card className={cn("shadow-card transition-shadow hover:shadow-soft", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={cn("text-sm font-medium", isPrimary ? "opacity-90" : "text-muted-foreground")}>
              {title}
            </p>
            <p className={cn("text-3xl font-bold mt-1", isPrimary ? "" : "text-foreground")}>
              {value}
            </p>
          </div>
          <div className={cn("p-3 rounded-lg", isPrimary ? "bg-white/20" : "bg-primary/10")}>
            <Icon className={cn("h-6 w-6", isPrimary ? "" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;