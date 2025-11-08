import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { ProjectWithRoads, PaymentCertificate } from "@shared/schema";

interface FinancialProgressWidgetProps {
  project: ProjectWithRoads;
}

export default function FinancialProgressWidget({ project }: FinancialProgressWidgetProps) {
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

  const totalPaid = certificates.reduce((sum, cert) => {
    return sum + parseFloat(cert.amountPaid || "0");
  }, 0);

  const contractAmount = parseFloat(project.contractAmount || "0");
  const balance = Math.max(0, contractAmount - totalPaid);
  const financialProgress = contractAmount > 0 ? Math.round((totalPaid / contractAmount) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Financial Progress</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Contract Amount</p>
            <p className="text-2xl font-bold text-green-600" data-testid="text-contract-amount">
              {formatCurrency(contractAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount Spent</p>
            <p className="text-xl font-semibold" data-testid="text-amount-spent">
              {formatCurrency(totalPaid)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-xl font-semibold" data-testid="text-balance">
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="pt-2">
            <div className="flex justify-center items-center">
              <div className="relative w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 56}
                    strokeDashoffset={2 * Math.PI * 56 * (1 - financialProgress / 100)}
                    className="text-green-600"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold" data-testid="text-financial-progress">{financialProgress}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
