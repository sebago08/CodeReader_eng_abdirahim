import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { BarChart3, FileText, TrendingUp, Calendar } from 'lucide-react';

export function ReportsPage() {
  const reportTypes = [
    {
      title: 'Project Progress Reports',
      description: 'Detailed progress reports for all active projects',
      icon: TrendingUp,
      color: '#3498db'
    },
    {
      title: 'Financial Reports',
      description: 'Budget tracking and financial summaries',
      icon: BarChart3,
      color: '#1a5276'
    },
    {
      title: 'Monthly Summary',
      description: 'Consolidated monthly project reports',
      icon: Calendar,
      color: '#3498db'
    },
    {
      title: 'Custom Reports',
      description: 'Generate custom reports based on specific criteria',
      icon: FileText,
      color: '#1a5276'
    }
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[#1a5276] mb-2">Reports</h1>
        <p className="text-muted-foreground">
          Generate and view various project reports and analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map((report, index) => {
          const Icon = report.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-lg" 
                    style={{ backgroundColor: `${report.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: report.color }} />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{report.title}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>View recently generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              No reports generated yet. Click on a report type above to get started.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
