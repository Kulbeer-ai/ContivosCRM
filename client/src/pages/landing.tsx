import { ArrowRight, BarChart3, Target, Users, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Target,
    title: "Visual Deal Pipeline",
    description: "Drag-and-drop Kanban board to track deals through every stage of your sales process.",
  },
  {
    icon: BarChart3,
    title: "Weighted Forecasting",
    description: "Automatic probability-weighted pipeline values for accurate revenue forecasting.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Role-based access control for sales teams, managers, and administrators.",
  },
  {
    icon: Zap,
    title: "Activity Tracking",
    description: "Log emails, calls, meetings, and notes to maintain a complete history of every deal.",
  },
];

const benefits = [
  "Unlimited deals and contacts",
  "Customizable pipeline stages",
  "Real-time deal updates",
  "Export to CSV",
  "Mobile responsive",
  "Dark mode support",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                CRM
              </div>
              <span className="font-semibold text-lg">Deal Pipeline</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <a href="#features">Features</a>
              </Button>
              <Button asChild data-testid="button-get-started-nav">
                <a href="/api/login">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Close More Deals with{" "}
                <span className="text-primary">Visual Pipeline</span>{" "}
                Management
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
                A modern CRM built for sales teams who want to track deals, forecast revenue, 
                and close more business. HubSpot-style Kanban boards with powerful filtering and analytics.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild data-testid="button-get-started-hero">
                  <a href="/api/login">
                    Start Free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#features">Learn More</a>
                </Button>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                {benefits.slice(0, 3).map((benefit) => (
                  <div key={benefit} className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none z-10" />
              <div className="rounded-xl border border-border shadow-2xl overflow-hidden bg-card">
                <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-background rounded-md px-4 py-1 text-xs text-muted-foreground">
                      deal-pipeline.app
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted/30">
                  <div className="flex gap-4 overflow-hidden">
                    {["Discovery", "Proposal", "Negotiation", "Contract", "Won"].map((stage, i) => (
                      <div key={stage} className="min-w-[200px] bg-card rounded-lg border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{stage}</span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                            {Math.floor(Math.random() * 8) + 2}
                          </span>
                        </div>
                        {[1, 2].map((j) => (
                          <div key={j} className="bg-muted/50 rounded-md p-2 space-y-1">
                            <div className="h-3 bg-foreground/10 rounded w-3/4" />
                            <div className="h-2 bg-primary/20 rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Everything You Need to Manage Sales</h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed for modern sales teams
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-md bg-primary/10">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{feature.title}</h3>
                        <p className="mt-1 text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold">Ready to Streamline Your Sales?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of sales teams managing their pipeline with ease.
            </p>
            <div className="mt-8">
              <Button size="lg" asChild data-testid="button-get-started-cta">
                <a href="/api/login">
                  Get Started for Free
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs">
              CRM
            </div>
            <span className="text-sm text-muted-foreground">
              Deal Pipeline CRM
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built with modern technology for modern sales teams.
          </p>
        </div>
      </footer>
    </div>
  );
}
