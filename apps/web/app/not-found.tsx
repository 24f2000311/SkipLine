import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { SkiplineLogo } from "@/components/skipline-logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-sl-blue selection:text-white font-sans">
      <div className="w-full max-w-[400px] bg-white dark:bg-slate-950 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none p-8 sm:p-10 border border-slate-100 dark:border-slate-800/60 text-center animate-sl-fade-in flex flex-col items-center">
        
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-full flex items-center justify-center mb-6">
          <SearchX className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Page not found
        </h2>
        
        <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <Link href="/" className="w-full">
          <Button 
            className="w-full h-12 text-base font-bold rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-sm"
          >
            Go to Home
          </Button>
        </Link>
      </div>
      
      <div className="mt-8 opacity-50 hover:opacity-100 transition-opacity">
        <SkiplineLogo size="sm" />
      </div>
    </div>
  );
}
