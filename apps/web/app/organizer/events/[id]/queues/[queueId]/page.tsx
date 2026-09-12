"use client";

import { useQueue, useUpdateQueue, useDeleteQueue } from "@/features/queues/hooks/useQueues";
import { useActiveEntries, useCallNext } from "@/features/queue-entries/hooks/useQueueEntries";
import { QueueEntriesTable } from "@/features/queue-entries/components/QueueEntriesTable";
import { WalkInDialog } from "@/features/queue-entries/components/WalkInDialog";
import { ShareQrDialog } from "@/features/queues/components/ShareQrDialog";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, Square, Megaphone, Settings2, SearchX, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useState } from "react";

export default function QueueDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queueId = (params?.queueId as string) || "";
  const eventId = (params?.id as string) || "";
  
  useWebSocket(queueId);
  
  const { data: queue, isLoading: isLoadingQueue, isPending: isPendingQueue, error: queueError } = useQueue(queueId);
  const { data: entries = [], isLoading: isLoadingEntries } = useActiveEntries(queueId);
  
  const { mutate: updateQueue, isPending: isUpdating } = useUpdateQueue();
  const { mutate: callNext, isPending: isCallingNext } = useCallNext();
  const { mutate: deleteQueue, isPending: isDeletingQueue } = useDeleteQueue();

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteQueue = () => {
    setDeleteError(null);
    deleteQueue(queueId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.push(`/organizer/events/${eventId}`);
      },
      onError: (error: any) => {
        const msg = error?.response?.data?.error?.message || "Something went wrong while deleting the queue. Please try again.";
        setDeleteError(msg);
      }
    });
  };

  if (isLoadingQueue || isPendingQueue || !queueId) {
    return (
      <div className="space-y-6 animate-sl-fade-in max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (queueError || (!queue && !isPendingQueue)) {
    const isNotFound = (queueError as any)?.response?.status === 404 || (!queue && !queueError);

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-sl-fade-in">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${isNotFound ? 'bg-slate-100 dark:bg-slate-900 text-slate-400' : 'bg-red-50 dark:bg-red-900/20 text-sl-error'}`}>
          {isNotFound ? <SearchX className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
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
  
  const now = new Date();
  const isEventEnded = queue?.event ? (new Date(queue.event.endAt) <= now || queue.event.status === 'COMPLETED') : false;
  const isEventCancelled = queue?.event?.status === 'CANCELLED';
  const isHistorical = isEventEnded || isEventCancelled;

  const waitingCount = entries.filter((e: any) => e.status === 'WAITING').length;
  const calledCount = entries.filter((e: any) => e.status === 'CALLED').length;
  const servingCount = entries.filter((e: any) => e.status === 'SERVING').length;

  return (
    <div className="max-w-7xl mx-auto pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 mb-8 border-b border-border">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3">
            <Link href={`/organizer/events/${eventId}`} className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Event
            </Link>
            <span className="opacity-50">/</span>
            <span className="text-foreground line-clamp-1 max-w-[200px]">{queue.name}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3 mb-2">
            {queue.name}
          </h1>

          <div className="flex items-center gap-3 text-[13px] font-medium text-slate-500">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] flex items-center gap-1.5 ${
              isOpen ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
              isPaused ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
              'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}>
              {isOpen && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>}
              {queue.status}
            </span>
            {isEventEnded && !isEventCancelled && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Event Ended
              </span>
            )}
            {isEventCancelled && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                Event Cancelled
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <ShareQrDialog 
            queueId={queueId} 
            queueName={queue.name} 
            queueDescription={queue.description} 
            event={queue.event} 
          />
          
          {isPaused && !isHistorical && (
            <Button 
              onClick={() => handleStatusChange("OPEN")}
              disabled={isUpdating}
              className="gap-2 font-semibold tracking-[-0.01em] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex-1 md:flex-none"
            >
              <Play className="h-4 w-4" /> Resume Queue
            </Button>
          )}

          {isOpen && !isHistorical && (
            <Button 
              variant="outline"
              onClick={() => handleStatusChange("PAUSED")}
              disabled={isUpdating}
              className="gap-2 font-semibold tracking-[-0.01em] text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20 flex-1 md:flex-none"
            >
              <Pause className="h-4 w-4" /> Pause Queue
            </Button>
          )}

          {!isClosed && !isHistorical && (
            <Button 
              variant="outline" 
              onClick={() => setShowCloseConfirm(true)}
              disabled={isUpdating}
              className="gap-2 font-semibold tracking-[-0.01em] text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors flex-1 md:flex-none"
            >
              <Square className="h-4 w-4" /> Close
            </Button>
          )}

          <Button 
            variant="outline" 
            onClick={() => {
              setDeleteError(null);
              setShowDeleteConfirm(true);
            }}
            disabled={isDeletingQueue}
            className="gap-2 font-semibold tracking-[-0.01em] text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors flex-1 md:flex-none"
          >
            <Trash2 className="h-4 w-4" /> Delete Queue
          </Button>
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

      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setDeleteError(null);
        }}
        title="Delete Queue"
        description={
          deleteError 
            ? deleteError 
            : "Are you sure you want to delete this queue? Only non-operating queues without active or historical participants can be deleted. This cannot be undone."
        }
        onConfirm={handleDeleteQueue}
        isPending={isDeletingQueue}
        confirmText="Yes, delete queue"
      />

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Operations Controls & Summary */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          
          {/* PRIMARY CONTROL: CALL NEXT */}
          <div className={`border rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-6 transition-all ${
            isOpen ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-md' : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-90'
          }`}>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">Operations</h2>
              <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {isOpen && waitingCount > 0 && "Selects the next eligible customer according to the queue policy."}
                {isOpen && waitingCount === 0 && "No customers waiting."}
                {isPaused && "Resume the queue to call the next customer."}
                {isClosed && "Queue is closed."}
              </p>
            </div>
            
            <Button 
              size="lg"
              onClick={() => callNext(queueId)}
              disabled={isCallingNext || !isOpen || waitingCount === 0 || isHistorical}
              className={`w-full h-20 text-xl font-semibold tracking-[-0.01em] rounded-xl transition-all shadow-sm ${
                isOpen && waitingCount > 0 && !isHistorical
                  ? 'bg-sl-blue hover:bg-blue-700 text-white hover:shadow-lg hover:-translate-y-0.5 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2' 
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {isCallingNext ? (
                "Calling..."
              ) : (
                <>
                  <Megaphone className="h-7 w-7 mr-3" />
                  Call Next
                </>
              )}
            </Button>
          </div>

          {/* QUEUE SUMMARY METRICS */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden text-center">
            <div className="p-4 sm:p-5">
              <div className="text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white tracking-tight">{isLoadingEntries ? '-' : waitingCount}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mt-1">Waiting</div>
            </div>
            <div className="p-4 sm:p-5 bg-emerald-50/30 dark:bg-emerald-900/5">
              <div className="text-3xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight">{isLoadingEntries ? '-' : calledCount}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600/70 dark:text-emerald-400/70 mt-1">Called</div>
            </div>
            <div className="p-4 sm:p-5 bg-blue-50/30 dark:bg-blue-900/5">
              <div className="text-3xl font-extrabold tabular-nums text-sl-blue dark:text-blue-400 tracking-tight">{isLoadingEntries ? '-' : servingCount}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sl-blue/70 dark:text-blue-400/70 mt-1">Serving</div>
            </div>
          </div>

          {/* SECONDARY CONFIGURATION */}
          <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-[11px] font-semibold tracking-[0.08em] text-slate-600 dark:text-slate-400 mb-4 uppercase flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Algorithm Configuration
            </h3>
            
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-1">Service Time</dt>
                <dd className="font-semibold text-base tabular-nums text-slate-900 dark:text-white">{queue.estimatedServiceTime} mins</dd>
              </div>
              
              <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-1">Policy</dt>
                <dd className="font-semibold text-base text-slate-900 dark:text-white line-clamp-1">
                  {queue.priorityPolicy === "FIFO" ? "Standard" : "Priority"}
                </dd>
              </div>
              
              {(queue.priorityPolicy === "WEIGHTED_PRIORITY") && (
                <>
                  <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-1">Weights</dt>
                    <dd className="font-bold text-base text-slate-900 dark:text-white">{queue.vipWeight}x / {queue.normalWeight}x</dd>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em] mb-1">Max Streak</dt>
                    <dd className="font-bold text-base text-slate-900 dark:text-white">{queue.maxVipStreak} calls</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* RIGHT COLUMN: Waiting Line & Walk-ins */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold text-foreground">Waiting Line</h2>
            {!isHistorical && <WalkInDialog queueId={queueId} />}
          </div>
          
          <QueueEntriesTable queueId={queueId} entries={entries} isLoading={isLoadingEntries} error={queueError} isHistorical={isHistorical} />
        </div>
        
      </div>
    </div>
  );
}
