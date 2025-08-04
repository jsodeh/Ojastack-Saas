import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  actionIcon?: LucideIcon;
  height?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  actionIcon: ActionIcon,
  height = "h-[300px]"
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${height} text-center`}>
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="font-medium text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description}
      </p>
      {actionText && actionHref && (
        <Button variant="outline" asChild>
          <Link to={actionHref}>
            {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
            {actionText}
          </Link>
        </Button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  height?: string;
}

export function LoadingState({ height = "h-[300px]" }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center ${height}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}