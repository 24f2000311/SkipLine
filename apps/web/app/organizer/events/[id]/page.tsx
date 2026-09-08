"use client";

import { useEvent, useDeleteEvent, useUpdateEvent } from "@/features/events/hooks/useEvents";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, Clock, Trash2, Play, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { useQueues } from "@/features/queues/hooks/useQueues";
import { CreateQueueDialog } from "@/features/queues/components/CreateQueueDialog";

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
      onError: (err: any) => {
        alert(err.message || `Failed to update event status to ${newStatus}`);
      }
    });
  };

  const handleDeleteEvent = () => {
    if (confirm("Are you sure you want to delete this event? All associated queues and entries will also be deleted.")) {
      deleteEvent(id, {
        onSuccess: () => {
          router.push("/organizer/dashboard");
        },
        onError: (err: any) => {
          alert(err.message || "Failed to delete event");
        }
      });
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <p className="text-red-500">Event not found.</p>
        <Link href="/organizer/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/organizer/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                  event.status === 'LIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  event.status === 'DRAFT' ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {event.status}
                </span>
              </div>
              {event.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{event.venue}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                <span>
                  {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto mt-4 sm:mt-0">
          {event.status === 'DRAFT' && (
            <Button 
              variant="outline" 
              onClick={() => handleUpdateStatus('LIVE')} 
              disabled={isUpdating}
              className="gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400 dark:hover:bg-green-900/40"
            >
              <Play className="h-4 w-4" />
              {isUpdating ? "Updating..." : "Publish Event"}
            </Button>
          )}
          {event.status === 'LIVE' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleUpdateStatus('COMPLETED')} 
                disabled={isUpdating}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Event
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (confirm("Are you sure you want to cancel this event? Customers will no longer be able to join.")) {
                    handleUpdateStatus('CANCELLED');
                  }
                }} 
                disabled={isUpdating}
                className="gap-2 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              >
                <XCircle className="h-4 w-4" />
                Cancel Event
              </Button>
            </>
          )}
          <Button 
            variant="destructive" 
            onClick={handleDeleteEvent} 
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Event"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Queues</h2>
              <CreateQueueDialog eventId={id} />
            </div>
            
            {isLoadingQueues ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !queues || queues.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
                No queues created yet. Create one to start managing customers!
              </div>
            ) : (
              <div className="space-y-4">
                {queues.map((queue: any) => (
                  <div key={queue.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-white">{queue.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                        <span className={`font-medium ${
                          queue.status === 'OPEN' ? 'text-green-600 dark:text-green-400' :
                          queue.status === 'PAUSED' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {queue.status}
                        </span>
                        <span>•</span>
                        <span>{queue.priorityPolicy}</span>
                        {queue.maxCapacity && (
                          <>
                            <span>•</span>
                            <span>Cap: {queue.maxCapacity}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link href={`/organizer/events/${id}/queues/${queue.id}`} className="mt-4 sm:mt-0">
                      <Button variant="secondary" size="sm">Manage</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">About this Event</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {event.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
