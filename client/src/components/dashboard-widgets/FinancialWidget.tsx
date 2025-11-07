import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Table as TableIcon } from "lucide-react";
import type { ProjectWithRoads, PaymentCertificate } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import WidgetKebabMenu from "@/components/dashboard/widget-kebab-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface FinancialWidgetProps {
  project: ProjectWithRoads;
  widgetConfig?: { viewMode?: string };
  onConfigChange?: (config: { viewMode: string }) => void;
}

export default function FinancialWidget({ 
  project, 
  widgetConfig = {}, 
  onConfigChange 
}: FinancialWidgetProps) {
  const [viewMode, setViewMode] = useState(widgetConfig.viewMode || "chart");
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

  // Calculate progress percentage for circular chart
  const progressPercentage = contractAmount > 0 ? Math.round((totalPaid / contractAmount) * 100) : 0;

  const handleViewChange = (newView: string) => {
    setViewMode(newView);
    onConfigChange?.({ viewMode: newView });
  };

  const viewOptions = [
    { value: "chart", label: "Chart View", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "table", label: "IPC Table", icon: <TableIcon className="h-4 w-4" /> },
  ];

  return (
    <Card data-testid="widget-financial">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          {viewMode === "chart" ? "Financial Overview" : "Payment Certificates"}
        </CardTitle>
        <WidgetKebabMenu
          currentView={viewMode}
          viewOptions={viewOptions}
          onViewChange={handleViewChange}
        />
      </CardHeader>
      <CardContent>
        {viewMode === "chart" ? (
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
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {certificates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payment certificates yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IPC No.</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id} data-testid={`row-ipc-${cert.certificateNo}`}>
                      <TableCell className="font-medium">{cert.certificateNo}</TableCell>
                      <TableCell className="text-sm">
                        {cert.dateCertified && format(new Date(cert.dateCertified), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cert.amountPaid)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          cert.paymentStatus === "Paid" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}>
                          {cert.paymentStatus}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
