import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import type { Stage, DealWithRelations } from "@shared/schema";

interface StageMetrics {
  stageId: string;
  stageName: string;
  stageColor: string | null;
  count: number;
  totalAmount: number;
  weightedAmount: number;
}

interface PipelineMetrics {
  totalDeals: number;
  totalAmount: number;
  weightedAmount: number;
  wonCount: number;
  wonAmount: number;
  lostCount: number;
  lostAmount: number;
  stageMetrics: StageMetrics[];
}

export default function MetricsPage() {
  const { data: metrics, isLoading } = useQuery<PipelineMetrics>({
    queryKey: ["/api/metrics"],
  });

  const winRate = metrics && metrics.wonCount + metrics.lostCount > 0
    ? ((metrics.wonCount / (metrics.wonCount + metrics.lostCount)) * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pipeline Metrics</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="metric-total-deals">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Deals
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalDeals || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active in pipeline
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-total-value">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pipeline Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.totalAmount || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sum of all deals
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-weighted-value">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Weighted Pipeline
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(metrics?.weightedAmount || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Probability-adjusted forecast
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-win-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Win Rate
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{winRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.wonCount || 0} won / {metrics?.lostCount || 0} lost
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="metric-won-deals">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg">Won Deals</CardTitle>
                </div>
                <CardDescription>Closed won performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Won</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(metrics?.wonAmount || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Deals Closed</p>
                    <p className="text-2xl font-bold">{metrics?.wonCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="metric-lost-deals">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg">Lost Deals</CardTitle>
                </div>
                <CardDescription>Closed lost analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Lost</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(metrics?.lostAmount || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Deals Lost</p>
                    <p className="text-2xl font-bold">{metrics?.lostCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="metric-stage-breakdown">
            <CardHeader>
              <CardTitle>Stage Breakdown</CardTitle>
              <CardDescription>Deal distribution and value by stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.stageMetrics?.map((stage) => {
                  const percentage = metrics.totalAmount > 0
                    ? (stage.totalAmount / metrics.totalAmount) * 100
                    : 0;
                  
                  return (
                    <div key={stage.stageId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.stageColor || "hsl(var(--primary))" }}
                          />
                          <span className="font-medium">{stage.stageName}</span>
                          <span className="text-sm text-muted-foreground">({stage.count} deals)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{formatCurrency(stage.totalAmount)}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            / {formatCurrency(stage.weightedAmount)} weighted
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: stage.stageColor || "hsl(var(--primary))",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(!metrics?.stageMetrics || metrics.stageMetrics.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No stage data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
