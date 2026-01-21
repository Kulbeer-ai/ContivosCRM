import { formatDistanceToNow, format } from "date-fns";

export function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d");
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return first + last || "??";
}

export function getFullName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown";
}
