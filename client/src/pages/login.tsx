import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, isLoggingIn, microsoftSsoEnabled } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const errorParam = urlParams.get("error");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login({ email, password });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const handleMicrosoftLogin = () => {
    window.location.href = "/api/auth/microsoft";
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" data-testid="text-login-title">Sign In</CardTitle>
          <CardDescription>Sign in to access your CRM dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorParam && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md" data-testid="text-login-error">
              {decodeURIComponent(errorParam)}
            </div>
          )}
          
          {microsoftSsoEnabled && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleMicrosoftLogin}
                data-testid="button-microsoft-login"
              >
                <MicrosoftIcon className="mr-2 h-4 w-4" />
                Sign in with Microsoft
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  data-testid="input-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  data-testid="input-password"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoggingIn}
              data-testid="button-login"
            >
              {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <Button
            type="button"
            variant="link"
            className="w-full"
            onClick={() => setShowForgotPassword(true)}
            data-testid="link-forgot-password"
          >
            Forgot your password?
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button 
              variant="link" 
              className="p-0 h-auto" 
              onClick={() => setLocation("/register")}
              data-testid="link-register"
            >
              Sign up
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { forgotPassword, isSendingReset } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await forgotPassword(email);
      setSubmitted(true);
      if (result.token) {
        setResetToken(result.token);
      }
      toast({
        title: "Reset Email Sent",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle data-testid="text-reset-sent-title">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists with the email you provided, you'll receive a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetToken && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium mb-2">Reset Token (for development):</p>
                <code className="text-xs break-all" data-testid="text-reset-token">{resetToken}</code>
                <p className="text-xs text-muted-foreground mt-2">
                  Use this token at: /reset-password?token={resetToken}
                </p>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={onBack} data-testid="button-back-to-login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle data-testid="text-forgot-title">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-reset-email"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSendingReset}
              data-testid="button-send-reset"
            >
              {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={onBack} data-testid="button-back-to-login-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
