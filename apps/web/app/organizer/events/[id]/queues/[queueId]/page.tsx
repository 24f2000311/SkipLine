"use client";

import { useQueue, useUpdateQueue } from "@/features/queues/hooks/useQueues";
import { useActiveEntries, useCallNext } from "@/features/queue-entries/hooks/useQueueEntries";
import { QueueEntriesTable } from "@/features/queue-entries/components/QueueEntriesTable";
import { ShareQrDialog } from "@/features/queues/components/ShareQrDialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Square, Megaphone, Settings2, SearchX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useState } from "react";

export default function QueueDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const queueId = params.queueId as string;
  
  useWebSocket(queueId);
  
  const { data: queue, isLoading: isLoadingQueue, error: queueError } = useQueue(queueId);
  const { data: entries = [], isLoading: isLoadingEntries } = useActiveEntries(queueId);
  
  const { mutate: updateQueue, isPending: isUpdating } = useUpdateQueue();
  const { mutate: callNext, isPending: isCallingNext } = useCallNext();

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  if (isLoadingQueue) {
    return (
      <div className="space-y-6 animate-sl-fade-in max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (queueError || !queue) {
    const isNotFound = (queueError as any)?.response?.status === 404 || !queue;

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-sl-fade-in">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${isNotFound ? 'bg-slate-100 dark:bg-slate-900 text-slate-400' : 'bg-red-50 dark:bg-red-900/20 text-sl-error'}`}>
          {isNotFound ? <SearchX className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">
          {isNotFound ? "Queue not found" : "Something went wrong"}
        </h2>
        <p className="text-muted-foreground font-medium max-w-sm mb-4">
          {isNotFound 
            ? "That queue may have been removed or you may not have access to it." 
            : "We couldn't load this queue. Please try again."}
        </p>
        {isNotFound ? (
          <Link href={`/organizer/events/${eventId}`}>
            <Button className="font-bold">Back to Event</Button>
          </Link>
        ) : (
          <Button variant="outline" className="font-bold" onClick={() => window.location.reload()}>Try Again</Button>
        )}
      </div>
    );
  }


  const handleStatusChange = (newStatus: "OPEN" | "PAUSED" | "CLOSED") => {
    updateQueue({ id: queueId, data: { status: newStatus } }, {
      onError: () => {
        alert("Something went wrong while updating the queue. Please try again.");
      }
    });
  };

  const isOpen = queue.status === 'OPEN';
  const isPaused = queue.status === 'PAUSED';
  const isClosed = queue.status === 'CLOSED';

  const waitingCount = entries.filter((e: any) => e.status === 'WAITING').length;
  const calledCount = entries.filter((e: any) => e.status === 'CALLED').length;
  const servingCount = entries.filter((e: any) => e.status === 'SERVING').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3">
            <Link href={`/organizer/events/${eventId}`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Event
            </Link>
            <span className="opacity-50">/</span>
            <span className="text-foreground line-clamp-1 max-w-[200px]">{queue.name}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3 mb-2">
            {queue.name}
          </h1>

          <div className="flex items-center gap-3 text-[13px] font-medium text-slate-500">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
              isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
              isPaused ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
              'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}>
              {isOpen && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>}
              {queue.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <ShareQrDialog queueId={queueId} queueName={queue.name} />
          
          {isPaused && (
            <Button 
              onClick={() => handleStatusChange("OPEN")}
              disabled={isUpdating}
              className="gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 md:flex-none"
            >
              <Play className="h-4 w-4" /> Resume Queue
            </Button>
          )}

          {isOpen && (
            <Button 
              variant="outline"
              onClick={() => handleStatusChange("PAUSED")}
              disabled={isUpdating}
              className="gap-2 font-bold text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20 flex-1 md:flex-none"
            >
              <Pause className="h-4 w-4" /> Pause Queue
            </Button>
          )}

          {!isClosed && (
            <Button 
              variant="outline" 
              onClick={() => setShowCloseConfirm(true)}
              disabled={isUpdating}
              className="gap-2 font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors flex-1 md:flex-none"
            >
              <Square className="h-4 w-4" /> Close
            </Button>
          )}
        </div>
      </div>
      
      <ConfirmDialog 
        isOpen={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        title="Close Queue"
        description="Are you sure you want to close this queue? Customers will no longer be able to join."
        onConfirm={() => {
          handleStatusChange("CLOSED");
          setShowCloseConfirm(false);
        }}
        isPending={isUpdating}
        confirmText="Yes, close queue"
      />

      {/* 2. QUEUE SUMMARY METRICS */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-center">
        <div className="p-4 sm:p-5">
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{isLoadingEntries ? '-' : waitingCount}</div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Waiting</div>
        </div>
        <div className="p-4 sm:p-5 bg-emerald-50/30 dark:bg-emerald-900/5">
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">{isLoadingEntries ? '-' : calledCount}</div>
          <div className="text-[10px] sm:text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mt-1">Called</div>
        </div>
        <div className="p-4 sm:p-5 bg-blue-50/30 dark:bg-blue-900/5">
          <div className="text-3xl sm:text-4xl font-black text-sl-blue dark:text-blue-400 tracking-tight">{isLoadingEntries ? '-' : servingCount}</div>
          <div className="text-[10px] sm:text-xs font-bold text-sl-blue/70 dark:text-blue-400/70 uppercase tracking-widest mt-1">Serving</div>
        </div>
      </div>

      {/* 3. PRIMARY CONTROL AREA: CALL NEXT */}
      <div className={`border rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${
        isOpen ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-md' : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-90'
      }`}>
        <div className="text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">Call Next Customer</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {isOpen && waitingCount > 0 && "Selects the next eligible customer according to the queue policy."}
            {isOpen && waitingCount === 0 && "No customers waiting."}
            {isPaused && "Resume the queue to call the next customer."}
            {isClosed && "Queue is closed."}
          </p>
        </div>
        
        <Button 
          size="lg"
          onClick={() => callNext(queueId)}
          disabled={isCallingNext || !isOpen || waitingCount === 0}
          className={`w-full sm:w-auto sm:min-w-[240px] h-16 sm:h-20 text-xl font-black rounded-xl transition-all shadow-sm ${
            isOpen && waitingCount > 0 
              ? 'bg-sl-blue hover:bg-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' 
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          {isCallingNext ? (
            "Calling..."
          ) : (
            <>
              <Megaphone className="h-6 w-6 sm:h-7 sm:w-7 mr-3" />
              Call Next
            </>
          )}
        </Button>
      </div>

      {/* 4. ACTIVE CUSTOMERS & WAITING LIST */}
      <QueueEntriesTable queueId={queueId} entries={entries} isLoading={isLoadingEntries} error={queueError} />

      {/* 5. SECONDARY CONFIGURATION */}
      <div className="pt-12">
        <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Algorithm Configuration
          </h3>
          
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Service Time</dt>
              <dd className="font-bold text-lg text-slate-900 dark:text-white">{queue.estimatedServiceTime} mins</dd>
            </div>
            
            <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Policy</dt>
              <dd className="font-bold text-lg text-slate-900 dark:text-white">
                {queue.priorityPolicy === "FIFO" ? "Standard" : "Priority"}
              </dd>
            </div>
            
            {(queue.priorityPolicy === "WEIGHTED_PRIORITY") && (
              <>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Weights</dt>
                  <dd className="font-bold text-lg text-slate-900 dark:text-white">{queue.vipWeight}x VIP / {queue.normalWeight}x N</dd>
                </div>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Max Streak</dt>
                  <dd className="font-bold text-lg text-slate-900 dark:text-white">{queue.maxVipStreak} calls</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
