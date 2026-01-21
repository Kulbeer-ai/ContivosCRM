import { Building2, Calendar, User, Mail, MessageSquare, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeTime, formatShortDate, getInitials } from "@/lib/format";
import type { DealWithRelations, Activity } from "@shared/schema";

interface DealCardProps {
  deal: DealWithRelations;
  onClick?: () => void;
  isDragging?: boolean;
}

function getActivityIcon(type?: string) {
  switch (type) {
    case "email": return <Mail className="h-3 w-3" />;
    case "call": return <MessageSquare className="h-3 w-3" />;
    case "meeting": return <Calendar className="h-3 w-3" />;
    case "note": return <MessageSquare className="h-3 w-3" />;
    default: return <MessageSquare className="h-3 w-3" />;
  }
}

export function DealCard({ deal, onClick, isDragging }: DealCardProps) {
  const latestActivity = deal.activities?.[0];

  return (
    <Card 
      className={`p-3 cursor-pointer transition-all hover-elevate ${
        isDragging ? "shadow-lg ring-2 ring-primary/20" : ""
      }`}
      onClick={onClick}
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm leading-tight line-clamp-2">
            {deal.name}
          </h4>
          <button 
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
            data-testid={`button-open-deal-${deal.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        <div className="text-lg font-semibold text-primary">
          {formatCurrency(deal.amount)}
        </div>

        {deal.company && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.company.name}</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            <span>{formatShortDate(deal.closeDate)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            {deal.owner && (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted">
                  {getInitials(deal.owner.firstName, deal.owner.lastName)}
                </AvatarFallback>
              </Avatar>
            )}
            {deal.tags && deal.tags.length > 0 && (
              <div className="flex gap-1">
                {deal.tags.slice(0, 2).map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {latestActivity && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {getActivityIcon(latestActivity.type)}
              <span>{formatRelativeTime(latestActivity.createdAt)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
