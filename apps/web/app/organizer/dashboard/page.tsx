"use client";

import { useState } from "react";
import { useEvents } from "@/features/events/hooks/useEvents";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, CalendarDays, MapPin, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VerificationRequiredDialog } from "@/features/auth/components/VerificationRequiredDialog";
import { authApi } from "@/lib/api/auth";

export default function DashboardPage() {
  const { data: events, isLoading, isPending, error } = useEvents();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);

  const handleCreateEventClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    const current = useAuthStore.getState().user;
    if (current?.emailVerifiedAt) {
      router.push("/organizer/events/new");
      return;
    }

    // Pre-flight check with backend in case user verified in another tab/window
    try {
      const res = await authApi.getMe();
      const freshUser = res.data?.data || res.data;
      if (freshUser?.emailVerifiedAt) {
        useAuthStore.getState().updateUser({ emailVerifiedAt: freshUser.emailVerifiedAt });
        router.push("/organizer/events/new");
        return;
      }
    } catch {
      // safe ignore
    }

    setVerificationDialogOpen(true);
  };


  if (isLoading || isPending) {
    return (
      <div className="space-y-8 animate-sl-fade-in max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 animate-sl-fade-in">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-sl-error rounded-full flex items-center justify-center">
          <CalendarDays className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Something went wrong</h2>
        <p className="text-muted-foreground font-medium max-w-sm">We couldn't load your events. Please try again.</p>
        <Button variant="outline" className="font-bold mt-2" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Events</h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-normal">
            Create an event, set up a queue, and keep people moving.
          </p>
        </div>
        <Button onClick={handleCreateEventClick} className="gap-2 font-semibold tracking-[-0.01em] shadow-sm h-10">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      {!events || events.length === 0 ? (
        
        /* Polished Empty State */
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl p-10 md:p-16 text-center animate-sl-fade-in flex flex-col items-center">
          <div className="h-16 w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <CalendarDays className="h-8 w-8 text-sl-blue" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Your first event starts here.</h3>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed font-normal">
            Create a virtual queue for your next event and keep people moving instead of keeping them waiting.
          </p>
          <div className="mt-8">
            <Button onClick={handleCreateEventClick} size="lg" className="font-semibold tracking-[-0.01em] shadow-md hover:shadow-lg transition-all text-sm h-12 px-8">
              Create your first event
            </Button>
          </div>
        </div>

      ) : (
        <div className="space-y-12">
          {(() => {
            const now = new Date();
            const isEndedByTime = (e: any) => e.endAt ? new Date(e.endAt).getTime() <= now.getTime() : false;
            const isCancelled = (e: any) => e.status === 'CANCELLED';
            const isCompleted = (e: any) => !isCancelled(e) && (e.status === 'COMPLETED' || isEndedByTime(e));

            const activeEvents = events.filter((e: any) => e.status === 'LIVE' && !isCompleted(e) && !isCancelled(e));
            const scheduledEvents = events.filter((e: any) => e.status === 'SCHEDULED' && !isCompleted(e) && !isCancelled(e));
            const draftEvents = events.filter((e: any) => e.status === 'DRAFT' && !isCompleted(e) && !isCancelled(e));
            const completedEvents = events.filter(isCompleted);
            const cancelledEvents = events.filter(isCancelled);

            return (
              <>
                {/* ACTIVE LIVE EVENTS */}
                {activeEvents.length > 0 && (
                  <div className="space-y-4 animate-sl-fade-in">
                    <h2 className="text-[11px] font-semibold tracking-[0.08em] text-sl-success uppercase flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sl-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-sl-success"></span>
                      </span>
                      Active Events ({activeEvents.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {activeEvents.map((event: any) => (
                        <EventCard key={event.id} event={event} primaryAction="Open Queue" />
                      ))}
                    </div>
                  </div>
                )}

                {/* SCHEDULED EVENTS */}
                {scheduledEvents.length > 0 && (
                  <div className="space-y-4 animate-sl-fade-in">
                    <h2 className="text-[11px] font-semibold tracking-[0.08em] text-sl-blue uppercase flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Scheduled Events ({scheduledEvents.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {scheduledEvents.map((event: any) => (
                        <EventCard key={event.id} event={event} primaryAction="View Event" />
                      ))}
                    </div>
                  </div>
                )}

                {/* DRAFT EVENTS */}
                {draftEvents.length > 0 && (
                  <div className="space-y-4 animate-sl-fade-in">
                    <h2 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Drafts ({draftEvents.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {draftEvents.map((event: any) => (
                        <EventCard key={event.id} event={event} primaryAction="Continue Setup" />
                      ))}
                    </div>
                  </div>
                )}

                {/* COMPLETED / HISTORICAL EVENTS */}
                {completedEvents.length > 0 && (
                  <div className="space-y-4 animate-sl-fade-in">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h2 className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        Completed Events ({completedEvents.length})
                      </h2>
                      <span className="text-xs text-muted-foreground font-normal">Historical records & analytics preserved</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-90 hover:opacity-100 transition-opacity">
                      {completedEvents.map((event: any) => (
                        <EventCard 
                          key={event.id} 
                          event={event} 
                          primaryAction="View Analytics & History" 
                          isCompletedSection={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* CANCELLED EVENTS */}
                {cancelledEvents.length > 0 && (
                  <div className="space-y-4 animate-sl-fade-in opacity-75 hover:opacity-90 transition-opacity">
                    <h2 className="text-[11px] font-semibold tracking-[0.08em] text-red-500 uppercase">
                      Cancelled Events ({cancelledEvents.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {cancelledEvents.map((event: any) => (
                        <EventCard key={event.id} event={event} primaryAction="View Event" />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Verification Required Dialog */}
      <VerificationRequiredDialog
        open={verificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        actionContext="event"
      />
    </div>
  );
}

function EventCard({ 
  event, 
  primaryAction,
  isCompletedSection = false,
}: { 
  event: any; 
  primaryAction: string;
  isCompletedSection?: boolean;
}) {
  const isLive = event.status === 'LIVE' && !isCompletedSection;
  const isCancelled = event.status === 'CANCELLED';
  const isEndedByTime = event.endAt ? new Date(event.endAt).getTime() <= Date.now() : false;
  const isCompleted = event.status === 'COMPLETED' || (isEndedByTime && !isCancelled);

  let statusBadge = (
    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
      {event.status}
    </span>
  );

  if (isCancelled) {
    statusBadge = (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400">
        Cancelled
      </span>
    );
  } else if (isCompleted) {
    statusBadge = (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
        {event.status === 'COMPLETED' ? 'Completed' : 'Ended'}
      </span>
    );
  } else if (isLive) {
    statusBadge = (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">
        Live
      </span>
    );
  } else if (event.status === 'SCHEDULED') {
    statusBadge = (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-blue-50 text-sl-blue border border-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400">
        Scheduled
      </span>
    );
  } else if (event.status === 'DRAFT') {
    statusBadge = (
      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
        Draft
      </span>
    );
  }

  return (
    <Link href={`/organizer/events/${event.id}`} className="block group">
      <Card className="flex flex-col h-full hover:shadow-md transition-standard border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex justify-between items-start gap-4 mb-1">
            <CardTitle className="text-lg font-bold tracking-tight leading-tight group-hover:text-sl-blue transition-colors line-clamp-1" title={event.name}>
              {event.name}
            </CardTitle>
            <div className="shrink-0">{statusBadge}</div>
          </div>
          
          <div className="flex flex-col gap-1.5 mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            {event.venue && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{event.venue}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">
                {new Date(event.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {' → '}
                {new Date(event.endAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="tabular-nums">
                {event.queues?.length || 0} {(event.queues?.length === 1) ? 'queue' : 'queues'}
                {' • '}
                {event.queues?.reduce((sum: number, q: any) => sum + (q._count?.entries || 0), 0) || 0} participants
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardFooter className="pt-3 pb-4 px-5 border-t border-slate-100 dark:border-slate-900 mt-auto bg-slate-50/50 dark:bg-slate-900/20">
          <Button 
            variant={isLive ? 'default' : 'secondary'} 
            className={`w-full h-9 text-xs font-semibold tracking-[-0.01em] shadow-none ${isLive ? 'bg-sl-blue hover:bg-blue-700' : ''}`}
          >
            {primaryAction}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
