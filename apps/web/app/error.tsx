"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { SkiplineLogo } from "@/components/skipline-logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in the future
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-sl-blue selection:text-white font-sans">
      <div className="w-full max-w-[400px] bg-white dark:bg-slate-950 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none p-8 sm:p-10 border border-slate-100 dark:border-slate-800/60 text-center animate-sl-fade-in flex flex-col items-center">
        
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-sl-error rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          We couldn't load this page. Please try again or return to the dashboard if the issue persists.
        </p>
        
        <div className="flex flex-col gap-3 w-full">
          <Button 
            onClick={() => reset()} 
            className="w-full h-12 text-base font-bold rounded-xl bg-sl-blue hover:bg-blue-700 text-white shadow-sm"
          >
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="w-full h-12 text-base font-bold rounded-xl text-slate-600 dark:text-slate-400"
          >
            Go to Home
          </Button>
        </div>
      </div>
      
      <div className="mt-8 opacity-50 hover:opacity-100 transition-opacity">
        <SkiplineLogo size="sm" />
      </div>
    </div>
  );
}
