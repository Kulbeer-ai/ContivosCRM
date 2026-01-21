import { Droppable, Draggable } from "@hello-pangea/dnd";
import { DealCard } from "./deal-card";
import { formatCurrency } from "@/lib/format";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { StageWithDeals, DealWithRelations } from "@shared/schema";

interface KanbanColumnProps {
  stage: StageWithDeals;
  onDealClick?: (deal: DealWithRelations) => void;
}

export function KanbanColumn({ stage, onDealClick }: KanbanColumnProps) {
  const deals = stage.deals || [];
  const totalAmount = deals.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0);
  const weightedAmount = deals.reduce((sum, d) => {
    const probability = d.internal?.probabilityOverride ?? stage.probability;
    return sum + (parseFloat(d.amount || "0") * (probability / 100));
  }, 0);

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[280px] bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stage.color || "hsl(var(--primary))" }}
          />
          <h3 className="font-medium text-sm">{stage.name}</h3>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {stage.probability}%
        </span>
      </div>

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-2 space-y-2 min-h-[200px] transition-colors ${
                snapshot.isDraggingOver ? "bg-primary/5" : ""
              }`}
            >
              {deals.map((deal, index) => (
                <Draggable key={deal.id} draggableId={deal.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="group"
                    >
                      <DealCard 
                        deal={deal} 
                        onClick={() => onDealClick?.(deal)}
                        isDragging={snapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              
              {deals.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border-2 border-dashed border-border/50 rounded-md">
                  Drop deals here
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>

      <div className="px-3 py-2 border-t border-border/50 bg-background/50 rounded-b-lg">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-muted-foreground">Weighted</span>
          <span className="font-medium text-primary">{formatCurrency(weightedAmount)}</span>
        </div>
      </div>
    </div>
  );
}
