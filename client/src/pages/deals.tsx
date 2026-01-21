import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { type DropResult } from "@hello-pangea/dnd";
import { DealsHeader } from "@/components/deals-header";
import { KanbanBoard } from "@/components/kanban-board";
import { DealsTable } from "@/components/deals-table";
import { DealDialog } from "@/components/deal-dialog";
import { FilterDialog, type FilterValues } from "@/components/filter-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Pipeline, Stage, DealWithRelations, StageWithDeals, Company, CrmUser } from "@shared/schema";

export default function DealsPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"board" | "table">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterValues>({});
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null);

  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  const { data: currentUser } = useQuery<{ id: string; role: string }>({
    queryKey: ["/api/users/me"],
  });

  const { data: stages = [], isLoading: stagesLoading } = useQuery<Stage[]>({
    queryKey: ["/api/stages", { pipelineId: selectedPipelineId }],
    queryFn: async () => {
      const res = await fetch(`/api/stages?pipelineId=${selectedPipelineId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stages");
      return res.json();
    },
    enabled: !!selectedPipelineId,
  });

  const { data: deals = [], isLoading: dealsLoading } = useQuery<DealWithRelations[]>({
    queryKey: ["/api/deals", { pipelineId: selectedPipelineId, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPipelineId) params.set("pipelineId", selectedPipelineId);
      if (filters.ownerId) params.set("ownerId", filters.ownerId);
      if (filters.stageId) params.set("stageId", filters.stageId);
      if (filters.companyId) params.set("companyId", filters.companyId);
      if (filters.amountMin) params.set("amountMin", filters.amountMin);
      if (filters.amountMax) params.set("amountMax", filters.amountMax);
      if (filters.closeDateStart) params.set("closeDateStart", filters.closeDateStart);
      if (filters.closeDateEnd) params.set("closeDateEnd", filters.closeDateEnd);
      
      const res = await fetch(`/api/deals?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deals");
      return res.json();
    },
    enabled: !!selectedPipelineId,
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: users = [] } = useQuery<CrmUser[]>({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      const defaultPipeline = pipelines.find((p) => p.isDefault) || pipelines[0];
      setSelectedPipelineId(defaultPipeline.id);
    }
  }, [pipelines, selectedPipelineId]);

  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      await apiRequest("PATCH", `/api/deals/${dealId}`, { stageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update deal stage",
        variant: "destructive",
      });
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/deals", {
        ...data,
        pipelineId: selectedPipelineId,
        companyId: data.companyId || null,
        tags: data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        closeDate: data.closeDate ? new Date(data.closeDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setDealDialogOpen(false);
      setSelectedDeal(null);
      toast({
        title: "Success",
        description: "Deal created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create deal",
        variant: "destructive",
      });
    },
  });

  const updateDealMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", `/api/deals/${selectedDeal?.id}`, {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        closeDate: data.closeDate ? new Date(data.closeDate).toISOString() : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
      setDealDialogOpen(false);
      setSelectedDeal(null);
      toast({
        title: "Success",
        description: "Deal updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update deal",
        variant: "destructive",
      });
    },
  });

  const stagesWithDeals = useMemo<StageWithDeals[]>(() => {
    const filtered = deals.filter((deal) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !deal.name.toLowerCase().includes(query) &&
          !deal.company?.name?.toLowerCase().includes(query) &&
          !deal.owner?.firstName?.toLowerCase().includes(query) &&
          !deal.owner?.lastName?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });

    return stages.map((stage) => ({
      ...stage,
      deals: filtered.filter((deal) => deal.stageId === stage.id),
    }));
  }, [stages, deals, searchQuery]);

  const allFilteredDeals = useMemo(() => {
    return stagesWithDeals.flatMap((stage) => 
      stage.deals.map((deal) => ({ ...deal, stage }))
    );
  }, [stagesWithDeals]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStageId = destination.droppableId;

    updateStageMutation.mutate({ dealId: draggableId, stageId: newStageId });
  };

  const handleDealClick = (deal: DealWithRelations) => {
    setSelectedDeal(deal);
    setDealDialogOpen(true);
  };

  const handleAddDeal = () => {
    setSelectedDeal(null);
    setDealDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/deals/export?pipelineId=${selectedPipelineId}`, {
        credentials: "include",
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "deals-export.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Error",
        description: "Failed to export deals",
        variant: "destructive",
      });
    }
  };

  const handleSaveDeal = (data: any) => {
    if (selectedDeal) {
      updateDealMutation.mutate(data);
    } else {
      createDealMutation.mutate(data);
    }
  };

  const isLoading = pipelinesLoading || stagesLoading || dealsLoading;

  return (
    <div className="flex flex-col h-full">
      <DealsHeader
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        onPipelineChange={setSelectedPipelineId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddDeal={handleAddDeal}
        onOpenFilters={() => setFilterDialogOpen(true)}
        onExport={handleExport}
      />

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex gap-4 p-4 h-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="min-w-[280px] max-w-[280px] space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : viewMode === "board" ? (
          <KanbanBoard
            stages={stagesWithDeals}
            onDragEnd={handleDragEnd}
            onDealClick={handleDealClick}
          />
        ) : (
          <div className="p-4 overflow-auto h-full">
            <DealsTable deals={allFilteredDeals} onDealClick={handleDealClick} />
          </div>
        )}
      </div>

      <DealDialog
        open={dealDialogOpen}
        onOpenChange={setDealDialogOpen}
        deal={selectedDeal}
        stages={stages}
        companies={companies}
        users={users}
        currentUserRole={currentUser?.role}
        onSave={handleSaveDeal}
        isLoading={createDealMutation.isPending || updateDealMutation.isPending}
      />

      <FilterDialog
        open={filterDialogOpen}
        onOpenChange={setFilterDialogOpen}
        stages={stages}
        users={users}
        companies={companies}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
