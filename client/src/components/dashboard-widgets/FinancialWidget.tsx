import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectWithRoads, PaymentCertificate } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface FinancialWidgetProps {
  project: ProjectWithRoads;
}

export default function FinancialWidget({ project }: FinancialWidgetProps) {
  // Fetch payment certificates for financial progress
  const { data: certificates = [] } = useQuery<PaymentCertificate[]>({
    queryKey: [`/api/projects/${project.id}/payment-certificates`],
    enabled: !!project.id,
  });

  const formatCurrency = (value: string | number | null | undefined) => {
    if (!value) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Calculate actual amount paid from certificates
  const totalPaid = certificates.reduce((sum, cert) => {
    return sum + parseFloat(cert.amountPaid || "0");
  }, 0);

  // Calculate balance
  const contractAmount = parseFloat(project.contractAmount || "0");
  const balance = Math.max(0, contractAmount - totalPaid);

  // Calculate progress percentage for circular chart (35% as per mockup)
  const progressPercentage = contractAmount > 0 ? Math.round((totalPaid / contractAmount) * 100) : 0;

  return (
    <Card data-testid="widget-financial">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Financial Overview</CardTitle>
        <Button variant="ghost" size="icon" data-testid="button-widget-menu">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6">
          {/* Left side - Circular Progress */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
                  className="text-blue-600 dark:text-blue-400"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" data-testid="text-financial-progress">
                  {progressPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Right side - Financial Details */}
          <div className="flex-1 space-y-3">
            {/* Contract Amount */}
            <div>
              <p className="text-xs text-muted-foreground font-medium">Contract Amount</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400" data-testid="text-contract-amount">
                {formatCurrency(contractAmount)}
              </p>
            </div>

            {/* Amount Spent */}
            <div>
              <p className="text-xs text-muted-foreground font-medium">Amount Spent</p>
              <p className="text-lg font-bold" data-testid="text-amount-spent">
                {formatCurrency(totalPaid)}
              </p>
            </div>

            {/* Balance */}
            <div>
              <p className="text-xs text-muted-foreground font-medium">Balance</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400" data-testid="text-balance">
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
