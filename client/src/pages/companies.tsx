import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Building2, Globe, Briefcase, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company } from "@shared/schema";

export default function CompaniesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    industry: "",
    notes: "",
  });

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", "/api/companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Company created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create company", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("PATCH", `/api/companies/${selectedCompany?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Company updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update company", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/companies/${selectedCompany?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setDeleteDialogOpen(false);
      setSelectedCompany(null);
      toast({ title: "Success", description: "Company deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete company", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", website: "", industry: "", notes: "" });
    setSelectedCompany(null);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      website: company.website || "",
      industry: company.industry || "",
      notes: company.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (company: Company) => {
    setSelectedCompany(company);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedCompany) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-company">
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-companies"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p>No companies found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover-elevate group" data-testid={`card-company-${company.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{company.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(company)}
                      data-testid={`button-edit-company-${company.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(company)}
                      data-testid={`button-delete-company-${company.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {company.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                      {company.website}
                    </a>
                  </div>
                )}
                {company.industry && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    <span>{company.industry}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCompany ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
                data-testid="input-company-website"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Finance"
                data-testid="input-company-industry"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                data-testid="textarea-company-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-company"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCompany?.name}"? This action cannot be undone.
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
