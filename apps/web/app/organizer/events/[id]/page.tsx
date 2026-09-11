"use client";

import { useEvent, useDeleteEvent, useUpdateEvent } from "@/features/events/hooks/useEvents";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Trash2, Play, CheckCircle2, XCircle, Plus, SearchX, AlertCircle, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueues } from "@/features/queues/hooks/useQueues";
import { CreateQueueDialog } from "@/features/queues/components/CreateQueueDialog";
import { EditQueueDialog } from "@/features/queues/components/EditQueueDialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useState } from "react";

import { EditEventDialog } from "@/features/events/components/EditEventDialog";

export default function EventDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: event, isLoading: isLoadingEvent, error: eventError } = useEvent(id);
  const { data: queues, isLoading: isLoadingQueues } = useQueues(id);
  const { mutate: deleteEvent, isPending: isDeleting } = useDeleteEvent();
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateEvent();

  const handleUpdateStatus = (newStatus: string) => {
    updateEvent({ id, data: { status: newStatus } }, {
      onError: () => {
        alert("Something went wrong while updating the event. Please try again.");
      }
    });
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleDeleteEvent = () => {
    deleteEvent(id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.push("/organizer/dashboard");
      },
      onError: (error: any) => {
        const message = error?.response?.data?.error?.message || "Something went wrong while deleting the event. Please try again.";
        alert(message);
      }
    });
  };

  if (isLoadingEvent) {
    return (
      <div className="space-y-6 animate-sl-fade-in max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (eventError || !event) {
    const isNotFound = (eventError as any)?.response?.status === 404 || !event;

    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-sl-fade-in">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${isNotFound ? 'bg-slate-100 dark:bg-slate-900 text-slate-400' : 'bg-red-50 dark:bg-red-900/20 text-sl-error'}`}>
          {isNotFound ? <SearchX className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">
          {isNotFound ? "Event not found" : "Something went wrong"}
        </h2>
        <p className="text-muted-foreground font-medium max-w-sm mb-4">
          {isNotFound 
            ? "That event may have been removed or you may not have access to it." 
            : "We couldn't load this event. Please try again."}
        </p>
        {isNotFound ? (
          <Link href="/organizer/dashboard">
            <Button className="font-bold">Back to Dashboard</Button>
          </Link>
        ) : (
          <Button variant="outline" className="font-bold" onClick={() => window.location.reload()}>Try Again</Button>
        )}
      </div>
    );
  }

  const isLive = event.status === 'LIVE';
  const isDraft = event.status === 'DRAFT';
  const now = new Date();
  const isEventEnded = new Date(event.endAt) <= now || event.status === 'COMPLETED';
  const isEventCancelled = event.status === 'CANCELLED';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-border">
        
        {/* Left: Metadata */}
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-3">
            <Link href="/organizer/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <span className="opacity-50">/</span>
            <span className="text-foreground line-clamp-1 max-w-[200px]">{event.name}</span>
          </nav>
          
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {event.name}
          </h1>
          
          <div className="flex flex-wrap items-center gap-4 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
              isLive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
              isDraft ? 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700' :
              'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}>
              {event.status}
            </span>

            {isEventCancelled && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/40 dark:text-red-400">
                Event Cancelled
              </span>
            )}
            {isEventEnded && !isEventCancelled && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300">
                Event Ended
              </span>
            )}

            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0" />
                {event.venueMapUrl ? (
                  <a href={event.venueMapUrl} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-sl-blue transition-colors">
                    {event.venue}
                  </a>
                ) : (
                  <span>{event.venue}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {new Date(event.startAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} 
                <span className="mx-1 opacity-50">→</span> 
                {new Date(event.endAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Right: Lifecycle Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isDraft && (
            <Button 
              onClick={() => handleUpdateStatus('LIVE')} 
              disabled={isUpdating}
              className="gap-2 bg-sl-blue hover:bg-blue-700 font-bold shadow-sm flex-1 md:flex-none"
            >
              <Play className="h-4 w-4" />
              {isUpdating ? "Updating..." : "Start Event"}
            </Button>
          )}
          
          {isLive && !isEventEnded && (
            <Button 
              onClick={() => handleUpdateStatus('COMPLETED')} 
              disabled={isUpdating}
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold flex-1 md:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete Event
            </Button>
          )}

          {/* Secondary Actions Menu/Group */}
          <div className="flex gap-2 w-full md:w-auto">
            {isLive && !isEventEnded && (
              <Button 
                variant="outline" 
                onClick={() => setShowCancelConfirm(true)}
                disabled={isUpdating}
                className="gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors flex-1 md:flex-none"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
            {(isDraft || event.status === 'SCHEDULED' || isLive || isEventEnded) && (
              <EditEventDialog event={event} />
            )}
            {(isDraft || event.status === 'SCHEDULED') && (
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteConfirm(true)} 
                disabled={isDeleting}
                className="gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors flex-1 md:flex-none"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <ConfirmDialog 
        isOpen={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Event"
        description="Are you sure you want to delete this event? All associated queues and entries will also be deleted. This cannot be undone."
        onConfirm={handleDeleteEvent}
        isPending={isDeleting}
        confirmText="Yes, delete event"
      />
      
      <ConfirmDialog 
        isOpen={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Cancel Event"
        description="Are you sure you want to cancel this event? Customers will no longer be able to join any queues."
        onConfirm={() => {
          handleUpdateStatus('CANCELLED');
          setShowCancelConfirm(false);
        }}
        isPending={isUpdating}
        confirmText="Yes, cancel event"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: Queues */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-foreground">Queues</h2>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">Manage the lines running at this event.</p>
            </div>
            {queues && queues.length > 0 && (
              <CreateQueueDialog eventId={id} />
            )}
          </div>
          
          {isLoadingQueues ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : !queues || queues.length === 0 ? (
            
            /* High-value Empty Queue State */
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center animate-sl-fade-in flex flex-col items-center">
              <div className="h-14 w-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                <Plus className="h-6 w-6 text-sl-blue" />
              </div>
              <h3 className="text-xl font-bold text-foreground">No queues yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto font-medium">
                Create a queue for this event to start accepting customers and managing wait times.
              </p>
              <div className="mt-6">
                <CreateQueueDialog eventId={id} />
              </div>
            </div>

          ) : (
            <div className="space-y-8">
              {['OPEN', 'PAUSED', 'CLOSED'].map((queueStatus) => {
                const filteredQueues = queues.filter((q: any) => q.status === queueStatus);
                if (filteredQueues.length === 0) return null;

                return (
                  <div key={queueStatus} className="space-y-3 animate-sl-fade-in">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      {queueStatus === 'OPEN' && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      {queueStatus} Queues
                    </h3>
                    
                    <div className="space-y-3">
                      {filteredQueues.map((queue: any) => {
                        const isOpen = queueStatus === 'OPEN';
                        const currentEntries = queue._count?.entries || 0;
                        
                        return (
                          <div 
                            key={queue.id} 
                            className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-xl border transition-all ${
                              isOpen 
                                ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md' 
                                : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800/50 opacity-80'
                            }`}
                          >
                            <div>
                              <h3 className={`font-bold text-lg mb-1 ${isOpen ? 'text-foreground' : 'text-slate-600 dark:text-slate-400'}`}>
                                {queue.name}
                              </h3>
                              <p className={`font-medium mb-2 ${isOpen ? 'text-sl-blue dark:text-blue-400' : 'text-slate-500'}`}>
                                {currentEntries} {queue.maxCapacity ? `/ ${queue.maxCapacity}` : ''} people in line
                              </p>
                              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                                <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-slate-600 dark:text-slate-300">
                                  {queue.priorityPolicy === "FIFO" ? "First Come, First Served" : "Priority Queue"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto">
                              <EditQueueDialog queue={queue} />
                              <Link href={`/organizer/events/${id}/queues/${queue.id}`} className="flex-1 sm:flex-none">
                                <Button variant={isOpen ? 'default' : 'secondary'} size="sm" className={`w-full font-bold h-9 ${isOpen ? 'bg-sl-blue text-white hover:bg-blue-700 shadow-sm' : ''}`}>
                                  {isOpen ? 'Open Queue' : 'Manage Queue'}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: About Section */}
        <div className="lg:col-span-1">
          <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">About this Event</h3>
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
              {event.description || "No description provided."}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
