import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import type { ProjectWithRoads } from "@shared/schema";

interface BudgetTabProps {
  project: ProjectWithRoads;
}

export default function BudgetTab({ project }: BudgetTabProps) {
  const totalBudget = project.totalBudget ? parseFloat(project.totalBudget) : 0;
  const spentAmount = project.spentAmount ? parseFloat(project.spentAmount) : 0;
  const remainingBudget = totalBudget - spentAmount;
  const utilizationPercentage = totalBudget > 0 ? Math.min(100, (spentAmount / totalBudget) * 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getUtilizationColor = () => {
    if (utilizationPercentage >= 90) return "text-red-600";
    if (utilizationPercentage >= 75) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-6">
      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-budget">
              {formatCurrency(totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Allocated for project</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-spent-amount">
              {formatCurrency(spentAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {utilizationPercentage.toFixed(1)}% of total budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getUtilizationColor()}`} data-testid="text-remaining-budget">
              {formatCurrency(remainingBudget)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Available to spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
          <CardDescription>Visual representation of budget usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Utilization</span>
              <span className={`text-sm font-bold ${getUtilizationColor()}`} data-testid="text-utilization-percentage">
                {utilizationPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={utilizationPercentage} 
              className="h-3"
              data-testid="progress-budget-utilization"
            />
          </div>

          {utilizationPercentage >= 90 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg" data-testid="alert-budget-warning">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Budget Alert</p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  You've used over 90% of your budget. Consider reviewing expenses.
                </p>
              </div>
            </div>
          )}

          {utilizationPercentage >= 75 && utilizationPercentage < 90 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg" data-testid="alert-budget-caution">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Budget Caution</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You've used over 75% of your budget. Monitor spending closely.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Spent</p>
              <p className="text-lg font-semibold">{formatCurrency(spentAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-lg font-semibold">{formatCurrency(remainingBudget)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Tracking - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Tracking</CardTitle>
          <CardDescription>Detailed expense records and tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Expense tracking coming soon</p>
            <p className="text-sm mt-1">
              This section will display detailed expense records and categories
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
