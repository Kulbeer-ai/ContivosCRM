import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, User, Mail, Phone, Building2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials, getFullName } from "@/lib/format";
import type { Contact, Company } from "@shared/schema";

export default function ContactsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    companyId: "",
    notes: "",
  });

  const { data: contacts = [], isLoading } = useQuery<(Contact & { company?: Company })[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("POST", "/api/contacts", {
        ...data,
        companyId: data.companyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Contact created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create contact", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("PATCH", `/api/contacts/${selectedContact?.id}`, {
        ...data,
        companyId: data.companyId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Contact updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update contact", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contacts/${selectedContact?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDeleteDialogOpen(false);
      setSelectedContact(null);
      toast({ title: "Success", description: "Contact deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ firstName: "", lastName: "", email: "", phone: "", title: "", companyId: "", notes: "" });
    setSelectedContact(null);
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      title: contact.title || "",
      companyId: contact.companyId || "",
      notes: contact.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedContact) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const name = getFullName(contact.firstName, contact.lastName).toLowerCase();
    const email = contact.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-add-contact">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-contacts"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p>No contacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover-elevate group" data-testid={`card-contact-${contact.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(contact.firstName, contact.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {getFullName(contact.firstName, contact.lastName)}
                      </CardTitle>
                      {contact.title && (
                        <p className="text-sm text-muted-foreground">{contact.title}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(contact)}
                      data-testid={`button-edit-contact-${contact.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contact)}
                      data-testid={`button-delete-contact-${contact.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{contact.company.name}</span>
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
            <DialogTitle>{selectedContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-contact-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  data-testid="input-contact-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Sales Manager"
                data-testid="input-contact-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => setFormData({ ...formData, companyId: value })}
              >
                <SelectTrigger data-testid="select-contact-company">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                data-testid="textarea-contact-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.firstName || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-contact"
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
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
