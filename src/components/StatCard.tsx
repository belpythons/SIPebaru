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
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs sm:text-sm font-medium truncate", isPrimary ? "opacity-90" : "text-muted-foreground")}>
              {title}
            </p>
            <p className={cn("text-xl sm:text-2xl lg:text-3xl font-bold mt-0.5 sm:mt-1", isPrimary ? "" : "text-foreground")}>
              {value}
            </p>
          </div>
          <div className={cn("p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2", isPrimary ? "bg-white/20" : "bg-primary/10")}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6", isPrimary ? "" : "text-primary")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;