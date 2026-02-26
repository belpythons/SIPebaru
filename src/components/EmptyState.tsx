import { Inbox } from "lucide-react";

interface EmptyStateProps {
    icon?: React.ComponentType<{ className?: string }>;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

const EmptyState = ({
    icon: Icon = Inbox,
    title = "Tidak ada data",
    description = "Belum ada data yang tersedia saat ini.",
    action,
}: EmptyStateProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Icon className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};

export default EmptyState;
