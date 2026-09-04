"use client";

import { useActiveEntries, useStartServing, useCompleteService, useNoShow } from "@/features/queue-entries/hooks/useQueueEntries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlayCircle, CheckCircle2, UserX, Clock } from "lucide-react";

interface QueueEntriesTableProps {
  queueId: string;
}

export function QueueEntriesTable({ queueId }: QueueEntriesTableProps) {
  const { data: entries, isLoading, error } = useActiveEntries(queueId);
  const { mutate: startServing, isPending: isStarting } = useStartServing();
  const { mutate: completeService, isPending: isCompleting } = useCompleteService();
  const { mutate: handleNoShow, isPending: isSkipping } = useNoShow();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (error || !entries) {
    return (
      <div className="text-center p-8 text-red-500">
        Failed to load queue entries.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center p-12 text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
        <Clock className="mx-auto h-8 w-8 mb-3 opacity-50" />
        <p>No customers currently in the queue.</p>
      </div>
    );
  }

  // Sort entries: SERVING first, then CALLED, then WAITING (by sequence)
  const sortedEntries = [...entries].sort((a, b) => {
    const statusWeight = { SERVING: 0, CALLED: 1, WAITING: 2 };
    if (statusWeight[a.status as keyof typeof statusWeight] !== statusWeight[b.status as keyof typeof statusWeight]) {
      return statusWeight[a.status as keyof typeof statusWeight] - statusWeight[b.status as keyof typeof statusWeight];
    }
    return a.sequenceNumber - b.sequenceNumber;
  });

  return (
    <div className="space-y-3">
      {sortedEntries.map((entry: any) => (
        <div 
          key={entry.id} 
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg border transition-colors ${
            entry.status === 'SERVING' 
              ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 shadow-sm'
              : entry.status === 'CALLED'
              ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-lg font-bold text-zinc-900 dark:text-white shrink-0">
              #{entry.sequenceNumber}
            </div>
            
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                {entry.customerName || "Guest User"}
                {entry.priority === "VIP" && (
                  <span className="px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                    VIP
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-xs font-medium uppercase tracking-wider">
                <span className={`
                  ${entry.status === 'SERVING' ? 'text-blue-600 dark:text-blue-400' : ''}
                  ${entry.status === 'CALLED' ? 'text-green-600 dark:text-green-400' : ''}
                  ${entry.status === 'WAITING' ? 'text-zinc-500' : ''}
                `}>
                  {entry.status}
                </span>
                
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-zinc-500 normal-case tracking-normal">
                  Wait: {Math.floor((new Date().getTime() - new Date(entry.joinedAt).getTime()) / 60000)}m
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-2 w-full sm:w-auto">
            {entry.status === "CALLED" && (
              <Button 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                disabled={isStarting || isSkipping}
                onClick={() => startServing({ entryId: entry.id, queueId })}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Serving
              </Button>
            )}

            {entry.status === "SERVING" && (
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                disabled={isCompleting}
                onClick={() => completeService({ entryId: entry.id, queueId })}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}

            {(entry.status === "CALLED" || entry.status === "SERVING") && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                disabled={isSkipping || isStarting || isCompleting}
                onClick={() => handleNoShow({ entryId: entry.id, queueId })}
              >
                <UserX className="h-4 w-4 mr-2" />
                No-Show
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
