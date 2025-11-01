import { Sidebar } from "@/components/sidebar";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <Construction className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3" data-testid="heading-coming-soon">
              {title}
            </h1>
            <p className="text-lg text-gray-600 mb-2" data-testid="text-coming-soon">
              Coming Soon
            </p>
            {description && (
              <p className="text-sm text-gray-500 max-w-md mx-auto" data-testid="text-description">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
