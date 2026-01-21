import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";
import { apiRequest } from "@/lib/queryClient";

interface AuthStatus {
  authenticated: boolean;
  user: User | null;
  microsoftSsoEnabled: boolean;
}

async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await fetch("/api/auth/status", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function loginLocal(email: string, password: string): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/login", { email, password });
  const data = await response.json();
  return data.user;
}

async function registerLocal(data: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User> {
  const response = await apiRequest("POST", "/api/auth/register", data);
  const result = await response.json();
  return result.user;
}

async function logoutApi(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout", {});
}

async function forgotPassword(email: string): Promise<{ message: string; token?: string }> {
  const response = await apiRequest("POST", "/api/auth/forgot-password", { email });
  return response.json();
}

async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const response = await apiRequest("POST", "/api/auth/reset-password", { token, password });
  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: authStatus, isLoading } = useQuery<AuthStatus>({
    queryKey: ["/api/auth/status"],
    queryFn: fetchAuthStatus,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      loginLocal(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { email: string; password: string; firstName?: string; lastName?: string }) => 
      registerLocal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/status"], { authenticated: false, user: null, microsoftSsoEnabled: false });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/status"] });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      resetPassword(token, password),
  });

  return {
    user: authStatus?.user || null,
    isLoading,
    isAuthenticated: authStatus?.authenticated || false,
    microsoftSsoEnabled: authStatus?.microsoftSsoEnabled || false,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isSendingReset: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
  };
}
