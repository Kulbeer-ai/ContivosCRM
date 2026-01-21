import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate, formatRelativeTime, getInitials, getFullName } from "@/lib/format";
import type { DealWithRelations } from "@shared/schema";

interface DealsTableProps {
  deals: DealWithRelations[];
  onDealClick: (deal: DealWithRelations) => void;
}

export function DealsTable({ deals, onDealClick }: DealsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Deal Name</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Weighted</TableHead>
            <TableHead>Close Date</TableHead>
            <TableHead>Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => {
            const probability = deal.internal?.probabilityOverride ?? deal.stage?.probability ?? 0;
            const weightedAmount = parseFloat(deal.amount || "0") * (probability / 100);
            
            return (
              <TableRow 
                key={deal.id} 
                className="cursor-pointer hover-elevate"
                onClick={() => onDealClick(deal)}
                data-testid={`table-row-deal-${deal.id}`}
              >
                <TableCell className="font-medium">{deal.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {getInitials(deal.owner?.firstName, deal.owner?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {getFullName(deal.owner?.firstName, deal.owner?.lastName)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {deal.company?.name || "-"}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: deal.stage?.color ? `${deal.stage.color}20` : undefined,
                      color: deal.stage?.color || undefined 
                    }}
                  >
                    {deal.stage?.name || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(deal.amount)}
                </TableCell>
                <TableCell className="text-right text-primary font-medium">
                  {formatCurrency(weightedAmount)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(deal.closeDate)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRelativeTime(deal.lastActivityAt)}
                </TableCell>
              </TableRow>
            );
          })}
          {deals.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No deals found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
