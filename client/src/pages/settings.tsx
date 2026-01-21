import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, GripVertical, Save, Shield, Users, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Pipeline, Stage, CrmUser, SsoSettings } from "@shared/schema";

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

  const { data: ssoSettings } = useQuery<SsoSettings>({
    queryKey: ["/api/auth/sso-settings"],
    enabled: currentUser?.role === "admin",
  });

  const [ssoForm, setSsoForm] = useState({
    microsoftTenantId: "",
    allowedTenantIds: "",
    allowedEmailDomains: "",
    defaultRoleForSso: "sales",
    autoProvisionUsers: true,
    ssoOnly: false,
  });

  const updateSsoMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PATCH", "/api/auth/sso-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/sso-settings"] });
      toast({ title: "Success", description: "SSO settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update SSO settings", variant: "destructive" });
    },
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <div>
              <CardTitle>Authentication & SSO</CardTitle>
              <CardDescription>Configure Microsoft Azure AD Single Sign-On</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="microsoftTenantId">Microsoft Tenant ID</Label>
              <Input
                id="microsoftTenantId"
                placeholder="e.g., common or your-tenant-id"
                value={ssoForm.microsoftTenantId || ssoSettings?.microsoftTenantId || ""}
                onChange={(e) => setSsoForm({ ...ssoForm, microsoftTenantId: e.target.value })}
                data-testid="input-microsoft-tenant-id"
              />
              <p className="text-xs text-muted-foreground">
                Use "common" for multi-tenant or your specific tenant ID for single-tenant
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultRole">Default Role for SSO Users</Label>
              <Select
                value={ssoForm.defaultRoleForSso || ssoSettings?.defaultRoleForSso || "sales"}
                onValueChange={(value) => setSsoForm({ ...ssoForm, defaultRoleForSso: value })}
              >
                <SelectTrigger data-testid="select-default-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedTenantIds">Allowed Tenant IDs</Label>
            <Textarea
              id="allowedTenantIds"
              placeholder="Enter allowed tenant IDs, one per line"
              value={ssoForm.allowedTenantIds || ssoSettings?.allowedTenantIds?.join("\n") || ""}
              onChange={(e) => setSsoForm({ ...ssoForm, allowedTenantIds: e.target.value })}
              rows={3}
              data-testid="input-allowed-tenant-ids"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to allow all tenants, or specify specific tenant IDs
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedEmailDomains">Allowed Email Domains</Label>
            <Textarea
              id="allowedEmailDomains"
              placeholder="Enter allowed email domains, one per line (e.g., company.com)"
              value={ssoForm.allowedEmailDomains || ssoSettings?.allowedEmailDomains?.join("\n") || ""}
              onChange={(e) => setSsoForm({ ...ssoForm, allowedEmailDomains: e.target.value })}
              rows={3}
              data-testid="input-allowed-email-domains"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to allow all domains, or specify domains for auto-provisioning
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="autoProvision">Auto-provision SSO Users</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create user accounts when users sign in via SSO
                </p>
              </div>
              <Switch
                id="autoProvision"
                checked={ssoForm.autoProvisionUsers ?? ssoSettings?.autoProvisionUsers ?? true}
                onCheckedChange={(checked) => setSsoForm({ ...ssoForm, autoProvisionUsers: checked })}
                data-testid="switch-auto-provision"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="ssoOnly">SSO-Only Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Require SSO login for users from allowed email domains
                </p>
              </div>
              <Switch
                id="ssoOnly"
                checked={ssoForm.ssoOnly ?? ssoSettings?.ssoOnly ?? false}
                onCheckedChange={(checked) => setSsoForm({ ...ssoForm, ssoOnly: checked })}
                data-testid="switch-sso-only"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => {
                const data = {
                  microsoftTenantId: ssoForm.microsoftTenantId || ssoSettings?.microsoftTenantId,
                  allowedTenantIds: ssoForm.allowedTenantIds
                    ? ssoForm.allowedTenantIds.split("\n").filter((s: string) => s.trim())
                    : ssoSettings?.allowedTenantIds,
                  allowedEmailDomains: ssoForm.allowedEmailDomains
                    ? ssoForm.allowedEmailDomains.split("\n").filter((s: string) => s.trim())
                    : ssoSettings?.allowedEmailDomains,
                  defaultRoleForSso: ssoForm.defaultRoleForSso || ssoSettings?.defaultRoleForSso,
                  autoProvisionUsers: ssoForm.autoProvisionUsers ?? ssoSettings?.autoProvisionUsers,
                  ssoOnly: ssoForm.ssoOnly ?? ssoSettings?.ssoOnly,
                };
                updateSsoMutation.mutate(data);
              }}
              disabled={updateSsoMutation.isPending}
              data-testid="button-save-sso-settings"
            >
              {updateSsoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save SSO Settings
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Note:</strong> To enable Microsoft SSO, you need to configure the following environment variables:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>MICROSOFT_CLIENT_ID - Your Azure AD application client ID</li>
              <li>MICROSOFT_CLIENT_SECRET - Your Azure AD application client secret</li>
              <li>MICROSOFT_TENANT_ID (optional) - Can also be set above</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <UserManagement />

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

function UserManagement() {
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const disableUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/auth/users/${userId}/disable`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User disabled successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to disable user", variant: "destructive" });
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/auth/users/${userId}/enable`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "User enabled successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to enable user", variant: "destructive" });
    },
  });

  const unlinkMicrosoftMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/auth/users/${userId}/unlink-microsoft`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Microsoft account unlinked" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unlink Microsoft account", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and authentication methods</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg"
              data-testid={`user-row-${user.id}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <Badge variant="outline">{user.role}</Badge>
                  {user.isDisabled && (
                    <Badge variant="destructive">Disabled</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {user.authProvider === "microsoft" ? "Microsoft SSO" : 
                     user.authProvider === "local" ? "Email/Password" : "Replit"}
                  </Badge>
                  {user.microsoftUserId && (
                    <Badge variant="outline" className="text-xs">
                      <Key className="h-3 w-3 mr-1" />
                      MS Linked
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {user.microsoftUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unlinkMicrosoftMutation.mutate(user.authUserId)}
                    disabled={unlinkMicrosoftMutation.isPending}
                    data-testid={`button-unlink-microsoft-${user.id}`}
                  >
                    Unlink Microsoft
                  </Button>
                )}
                {user.isDisabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => enableUserMutation.mutate(user.authUserId)}
                    disabled={enableUserMutation.isPending}
                    data-testid={`button-enable-user-${user.id}`}
                  >
                    Enable
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => disableUserMutation.mutate(user.authUserId)}
                    disabled={disableUserMutation.isPending}
                    data-testid={`button-disable-user-${user.id}`}
                  >
                    Disable
                  </Button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No users found.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
