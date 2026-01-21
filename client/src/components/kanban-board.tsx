import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./kanban-column";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { StageWithDeals, DealWithRelations } from "@shared/schema";

interface KanbanBoardProps {
  stages: StageWithDeals[];
  onDragEnd: (result: DropResult) => void;
  onDealClick?: (deal: DealWithRelations) => void;
}

export function KanbanBoard({ stages, onDragEnd, onDealClick }: KanbanBoardProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <ScrollArea className="flex-1 w-full">
        <div className="flex gap-4 p-4 h-full">
          {sortedStages.map((stage) => (
            <KanbanColumn 
              key={stage.id} 
              stage={stage} 
              onDealClick={onDealClick}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DragDropContext>
  );
}
