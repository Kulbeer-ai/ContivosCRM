import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Pipeline, Stage, CrmUser } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pipelineDialogOpen, setPipelineDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "pipeline" | "stage"; item: Pipeline | Stage } | null>(null);
  
  const [pipelineForm, setPipelineForm] = useState({ name: "", isDefault: false });
  const [stageForm, setStageForm] = useState({ 
    name: "", 
    probability: 50, 
    color: "#3b82f6",
    order: 0,
    pipelineId: ""
  });

  const { data: currentUser } = useQuery<CrmUser & { role: string }>({
    queryKey: ["/api/users/me"],
  });

  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery<Pipeline[]>({
    queryKey: ["/api/pipelines"],
  });

  const { data: stages = [], isLoading: stagesLoading } = useQuery<Stage[]>({
    queryKey: ["/api/stages"],
  });

  const isAdmin = currentUser?.role === "admin";

  const createPipelineMutation = useMutation({
    mutationFn: async (data: typeof pipelineForm) => {
      await apiRequest("POST", "/api/pipelines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      setPipelineDialogOpen(false);
      setPipelineForm({ name: "", isDefault: false });
      toast({ title: "Success", description: "Pipeline created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create pipeline", variant: "destructive" });
    },
  });

  const updatePipelineMutation = useMutation({
    mutationFn: async (data: typeof pipelineForm) => {
      await apiRequest("PATCH", `/api/pipelines/${selectedPipeline?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      setPipelineDialogOpen(false);
      setSelectedPipeline(null);
      toast({ title: "Success", description: "Pipeline updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update pipeline", variant: "destructive" });
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async (data: typeof stageForm) => {
      await apiRequest("POST", "/api/stages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setStageDialogOpen(false);
      setStageForm({ name: "", probability: 50, color: "#3b82f6", order: 0, pipelineId: "" });
      toast({ title: "Success", description: "Stage created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create stage", variant: "destructive" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async (data: typeof stageForm) => {
      await apiRequest("PATCH", `/api/stages/${selectedStage?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setStageDialogOpen(false);
      setSelectedStage(null);
      toast({ title: "Success", description: "Stage updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update stage", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteTarget) return;
      const endpoint = deleteTarget.type === "pipeline" 
        ? `/api/pipelines/${deleteTarget.item.id}`
        : `/api/stages/${deleteTarget.item.id}`;
      await apiRequest("DELETE", endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stages"] });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      toast({ title: "Success", description: "Deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    },
  });

  const handleEditPipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setPipelineForm({ name: pipeline.name, isDefault: pipeline.isDefault || false });
    setPipelineDialogOpen(true);
  };

  const handleEditStage = (stage: Stage) => {
    setSelectedStage(stage);
    setStageForm({
      name: stage.name,
      probability: stage.probability,
      color: stage.color || "#3b82f6",
      order: stage.order,
      pipelineId: stage.pipelineId,
    });
    setStageDialogOpen(true);
  };

  const handleAddStage = (pipelineId: string) => {
    const pipelineStages = stages.filter(s => s.pipelineId === pipelineId);
    const maxOrder = pipelineStages.length > 0 ? Math.max(...pipelineStages.map(s => s.order)) : -1;
    setStageForm({
      name: "",
      probability: 50,
      color: "#3b82f6",
      order: maxOrder + 1,
      pipelineId,
    });
    setStageDialogOpen(true);
  };

  const handleDelete = (type: "pipeline" | "stage", item: Pipeline | Stage) => {
    setDeleteTarget({ type, item });
    setDeleteDialogOpen(true);
  };

  const handleSavePipeline = () => {
    if (selectedPipeline) {
      updatePipelineMutation.mutate(pipelineForm);
    } else {
      createPipelineMutation.mutate(pipelineForm);
    }
  };

  const handleSaveStage = () => {
    if (selectedStage) {
      updateStageMutation.mutate(stageForm);
    } else {
      createStageMutation.mutate(stageForm);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Only administrators can access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Pipelines & Stages</CardTitle>
            <CardDescription>Configure your sales pipelines and stage probabilities</CardDescription>
          </div>
          <Button 
            onClick={() => { 
              setSelectedPipeline(null); 
              setPipelineForm({ name: "", isDefault: false }); 
              setPipelineDialogOpen(true); 
            }}
            data-testid="button-add-pipeline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Pipeline
          </Button>
        </CardHeader>
        <CardContent>
          {pipelinesLoading || stagesLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {pipelines.map((pipeline) => {
                const pipelineStages = stages
                  .filter((s) => s.pipelineId === pipeline.id)
                  .sort((a, b) => a.order - b.order);

                return (
                  <div key={pipeline.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{pipeline.name}</h3>
                        {pipeline.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPipeline(pipeline)}
                          data-testid={`button-edit-pipeline-${pipeline.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete("pipeline", pipeline)}
                          data-testid={`button-delete-pipeline-${pipeline.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {pipelineStages.map((stage) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-md group"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color || "#3b82f6" }}
                          />
                          <span className="flex-1 font-medium">{stage.name}</span>
                          <Badge variant="outline">{stage.probability}%</Badge>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditStage(stage)}
                              data-testid={`button-edit-stage-${stage.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete("stage", stage)}
                              data-testid={`button-delete-stage-${stage.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddStage(pipeline.id)}
                      data-testid={`button-add-stage-${pipeline.id}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stage
                    </Button>
                  </div>
                );
              })}

              {pipelines.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No pipelines configured. Create one to get started.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pipelineDialogOpen} onOpenChange={setPipelineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPipeline ? "Edit Pipeline" : "Create Pipeline"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pipeline Name</Label>
              <Input
                value={pipelineForm.name}
                onChange={(e) => setPipelineForm({ ...pipelineForm, name: e.target.value })}
                placeholder="e.g., Sales Pipeline"
                data-testid="input-pipeline-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSavePipeline}
              disabled={!pipelineForm.name || createPipelineMutation.isPending || updatePipelineMutation.isPending}
              data-testid="button-save-pipeline"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStage ? "Edit Stage" : "Create Stage"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input
                value={stageForm.name}
                onChange={(e) => setStageForm({ ...stageForm, name: e.target.value })}
                placeholder="e.g., Discovery"
                data-testid="input-stage-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={stageForm.probability}
                  onChange={(e) => setStageForm({ ...stageForm, probability: parseInt(e.target.value) || 0 })}
                  data-testid="input-stage-probability"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={stageForm.color}
                  onChange={(e) => setStageForm({ ...stageForm, color: e.target.value })}
                  className="h-10"
                  data-testid="input-stage-color"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input
                type="number"
                min="0"
                value={stageForm.order}
                onChange={(e) => setStageForm({ ...stageForm, order: parseInt(e.target.value) || 0 })}
                data-testid="input-stage-order"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveStage}
              disabled={!stageForm.name || createStageMutation.isPending || updateStageMutation.isPending}
              data-testid="button-save-stage"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "pipeline" ? "Pipeline" : "Stage"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.item && 'name' in deleteTarget.item ? deleteTarget.item.name : ''}"?
              {deleteTarget?.type === "pipeline" && " This will also delete all stages in this pipeline."}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
