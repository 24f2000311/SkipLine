"use client";

import { useState } from "react";
import { useStartServing, useCompleteService, useNoShow } from "@/features/queue-entries/hooks/useQueueEntries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlayCircle, CheckCircle2, UserX, Clock, ArrowRight } from "lucide-react";

interface QueueEntriesTableProps {
  queueId: string;
  entries: any[];
  isLoading: boolean;
  error: any;
}

export function QueueEntriesTable({ queueId, entries, isLoading, error }: QueueEntriesTableProps) {
  const { mutate: startServing, isPending: isStarting } = useStartServing();
  const { mutate: completeService, isPending: isCompleting } = useCompleteService();
  const { mutate: handleNoShow, isPending: isSkipping } = useNoShow();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !entries) {
    return (
      <div className="text-center p-8 text-sl-error font-medium">
        Failed to load queue entries.
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-sl-fade-in flex flex-col items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-lg font-bold text-slate-900 dark:text-white">Queue is clear</p>
        <p className="text-sm font-medium mt-1">No customers are waiting right now.</p>
      </div>
    );
  }

  const activeEntries = [...entries]
    .filter(e => e.status === 'SERVING' || e.status === 'CALLED')
    .sort((a, b) => {
      const statusWeight = { SERVING: 0, CALLED: 1 };
      return statusWeight[a.status as keyof typeof statusWeight] - statusWeight[b.status as keyof typeof statusWeight];
    });

  const waitingEntries = [...entries]
    .filter(e => e.status === 'WAITING')
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  return (
    <div className="space-y-12">
      {/* ACTIVE CUSTOMERS */}
      {activeEntries.length > 0 && (
        <div className="space-y-4 animate-sl-fade-in">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            Active Customers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEntries.map((entry: any) => (
              <ActiveEntryCard 
                key={entry.id} 
                entry={entry} 
                queueId={queueId}
                startServing={startServing}
                completeService={completeService}
                handleNoShow={handleNoShow}
                isStarting={isStarting}
                isCompleting={isCompleting}
                isSkipping={isSkipping}
              />
            ))}
          </div>
        </div>
      )}

      {/* WAITING CUSTOMERS */}
      {waitingEntries.length > 0 && (
        <div className="space-y-4 animate-sl-fade-in">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            Waiting List <span className="text-slate-400 font-bold ml-1">{waitingEntries.length}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {waitingEntries.map((entry: any) => (
              <WaitingEntryCard 
                key={entry.id} 
                entry={entry} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ACTIVE CARD (CALLED or SERVING)
// -----------------------------------------------------------------------------
function ActiveEntryCard({ entry, queueId, startServing, completeService, handleNoShow, isStarting, isCompleting, isSkipping }: any) {
  const isCalled = entry.status === 'CALLED';
  const isServing = entry.status === 'SERVING';
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);

  const onNoShowConfirm = () => {
    handleNoShow({ entryId: entry.id, queueId });
    setShowNoShowConfirm(false);
  };

  return (
    <>
      <ConfirmDialog 
        isOpen={showNoShowConfirm}
        onOpenChange={setShowNoShowConfirm}
        title="Mark as No Show?"
        description={`Are you sure you want to mark customer #${entry.sequenceNumber} as a no-show? They may be requeued or skipped according to the queue rules.`}
        onConfirm={onNoShowConfirm}
        isPending={isSkipping}
        confirmText="Yes, mark as no-show"
      />
      <div className={`flex flex-col p-5 rounded-2xl border-2 transition-all shadow-sm ${
      isCalled 
        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-500 ring-4 ring-emerald-500/10'
        : 'bg-white dark:bg-slate-950 border-blue-500 shadow-blue-500/10'
    }`}>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded flex items-center gap-1.5 ${
              isCalled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
            }`}>
              {isCalled && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>}
              {entry.status}
            </span>
            {entry.priority === "VIP" && (
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">VIP</span>
            )}
          </div>
          <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            A-{String(entry.sequenceNumber).padStart(3, '0')}
          </h4>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">{entry.customerName || "Guest User"}</p>
        </div>
      </div>

      <div className="mt-auto pt-2 flex flex-col sm:flex-row items-stretch gap-2 w-full">
        {isCalled && (
          <>
            <Button 
              size="lg" 
              className="flex-1 font-bold text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              disabled={isStarting || isSkipping}
              onClick={() => startServing({ entryId: entry.id, queueId })}
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Start Serving
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-slate-200 dark:border-slate-800"
              disabled={isSkipping || isStarting || isCompleting}
              onClick={() => setShowNoShowConfirm(true)}
            >
              <UserX className="h-5 w-5 mr-2" />
              No Show
            </Button>
          </>
        )}

        {isServing && (
          <Button 
            size="lg" 
            className="w-full font-bold text-base bg-sl-blue hover:bg-blue-700 text-white shadow-sm"
            disabled={isCompleting}
            onClick={() => completeService({ entryId: entry.id, queueId })}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Complete Service
          </Button>
        )}
      </div>
    </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// WAITING CARD
// -----------------------------------------------------------------------------
function WaitingEntryCard({ entry }: any) {
  const waitTimeMins = Math.floor((new Date().getTime() - new Date(entry.joinedAt).getTime()) / 60000);
  
  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-black text-lg border border-slate-200 dark:border-slate-800">
          {entry.sequenceNumber}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h5 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{entry.customerName || "Guest User"}</h5>
            {entry.priority === "VIP" && (
              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">VIP</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-500">
            <Clock className="h-3 w-3" /> {waitTimeMins}m waiting
          </div>
        </div>
      </div>
    </div>
  );
}
