import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Calendar, User, DollarSign, Tag, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import type { DealWithRelations, Stage, Company, CrmUser, Activity } from "@shared/schema";

const dealFormSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  amount: z.string().optional(),
  stageId: z.string().min(1, "Stage is required"),
  companyId: z.string().optional(),
  ownerId: z.string().min(1, "Owner is required"),
  closeDate: z.string().optional(),
  tags: z.string().optional(),
});

const internalFormSchema = z.object({
  probabilityOverride: z.number().min(0).max(100).optional(),
  costEstimate: z.string().optional(),
  expectedMargin: z.string().optional(),
  forecastCategory: z.enum(["pipeline", "best_case", "commit", "closed"]).optional(),
  internalScore: z.number().min(0).max(100).optional(),
  internalNotes: z.string().optional(),
  approvalStatus: z.enum(["draft", "needs_approval", "approved"]).optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;
type InternalFormValues = z.infer<typeof internalFormSchema>;

interface DealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: DealWithRelations | null;
  stages: Stage[];
  companies: Company[];
  users: CrmUser[];
  currentUserRole?: string;
  onSave: (data: DealFormValues) => void;
  onSaveInternal?: (data: InternalFormValues) => void;
  isLoading?: boolean;
}

export function DealDialog({
  open,
  onOpenChange,
  deal,
  stages,
  companies,
  users,
  currentUserRole,
  onSave,
  onSaveInternal,
  isLoading,
}: DealDialogProps) {
  const isAdmin = currentUserRole === "admin";
  const canEditInternal = isAdmin; // Only admins can view/edit internal fields
  const isEditing = !!deal;

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: deal?.name || "",
      amount: deal?.amount?.toString() || "",
      stageId: deal?.stageId || "",
      companyId: deal?.companyId || "",
      ownerId: deal?.ownerId || "",
      closeDate: deal?.closeDate ? new Date(deal.closeDate).toISOString().split("T")[0] : "",
      tags: deal?.tags?.join(", ") || "",
    },
  });

  const internalForm = useForm<InternalFormValues>({
    resolver: zodResolver(internalFormSchema),
    defaultValues: {
      probabilityOverride: deal?.internal?.probabilityOverride ?? undefined,
      costEstimate: deal?.internal?.costEstimate?.toString() || "",
      expectedMargin: deal?.internal?.expectedMargin?.toString() || "",
      forecastCategory: deal?.internal?.forecastCategory || "pipeline",
      internalScore: deal?.internal?.internalScore ?? undefined,
      internalNotes: deal?.internal?.internalNotes || "",
      approvalStatus: deal?.internal?.approvalStatus || "draft",
    },
  });

  const handleSubmit = (data: DealFormValues) => {
    onSave(data);
  };

  const handleInternalSubmit = (data: InternalFormValues) => {
    if (onSaveInternal) {
      onSaveInternal(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Deal" : "Create New Deal"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities">Activities</TabsTrigger>
            {canEditInternal && (
              <TabsTrigger value="internal" data-testid="tab-internal">
                <Lock className="h-3 w-3 mr-1" />
                Internal
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter deal name" {...field} data-testid="input-deal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="0" className="pl-9" {...field} data-testid="input-deal-amount" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stage</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deal-stage">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: stage.color || "hsl(var(--primary))" }}
                                  />
                                  {stage.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Owner</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deal-owner">
                              <SelectValue placeholder="Select owner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-deal-company">
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="closeDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Close Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-deal-close-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="enterprise, priority" {...field} data-testid="input-deal-tags" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} data-testid="button-save-deal">
                    {isLoading ? "Saving..." : isEditing ? "Update Deal" : "Create Deal"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="activities" className="mt-4">
            <div className="space-y-4">
              {deal?.activities && deal.activities.length > 0 ? (
                deal.activities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="secondary" className="mb-2">
                            {activity.type}
                          </Badge>
                          <p className="font-medium">{activity.summary}</p>
                          {activity.details && (
                            <p className="text-sm text-muted-foreground mt-1">{activity.details}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No activities recorded yet
                </div>
              )}
            </div>
          </TabsContent>

          {canEditInternal && (
            <TabsContent value="internal" className="mt-4">
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Lock className="h-4 w-4" />
                    Internal Fields (Admin Only)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...internalForm}>
                    <form onSubmit={internalForm.handleSubmit(handleInternalSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={internalForm.control}
                          name="probabilityOverride"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Probability Override (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  placeholder="Use stage default"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  data-testid="input-probability-override"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={internalForm.control}
                          name="internalScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deal Score (0-100)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  data-testid="input-internal-score"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={internalForm.control}
                          name="costEstimate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cost Estimate</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="0" className="pl-9" {...field} data-testid="input-cost-estimate" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={internalForm.control}
                          name="expectedMargin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Margin (%)</FormLabel>
                              <FormControl>
                                <Input placeholder="0" {...field} data-testid="input-expected-margin" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={internalForm.control}
                          name="forecastCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Forecast Category</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-forecast-category">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pipeline">Pipeline</SelectItem>
                                  <SelectItem value="best_case">Best Case</SelectItem>
                                  <SelectItem value="commit">Commit</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={internalForm.control}
                          name="approvalStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Approval Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-approval-status">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="needs_approval">Needs Approval</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={internalForm.control}
                        name="internalNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internal Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Private notes for internal use..."
                                className="min-h-[100px]"
                                {...field}
                                data-testid="textarea-internal-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isLoading} data-testid="button-save-internal">
                          {isLoading ? "Saving..." : "Save Internal Data"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
