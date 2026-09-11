"use client";

import { useEvents } from "@/features/events/hooks/useEvents";
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

export default function DashboardPage() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) {
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
        <h2 className="text-2xl font-black text-foreground tracking-tight">Something went wrong</h2>
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
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Your Events</h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">
            Create an event, set up a queue, and keep people moving.
          </p>
        </div>
        <Link href="/organizer/events/new">
          <Button className="gap-2 font-bold shadow-sm h-10">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {!events || events.length === 0 ? (
        
        /* Polished Empty State */
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl p-10 md:p-16 text-center animate-sl-fade-in flex flex-col items-center">
          <div className="h-16 w-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <CalendarDays className="h-8 w-8 text-sl-blue" />
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">Your first event starts here.</h3>
          <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed font-medium">
            Create a virtual queue for your next event and keep people moving instead of keeping them waiting.
          </p>
          <div className="mt-8">
            <Link href="/organizer/events/new">
              <Button size="lg" className="font-bold shadow-md hover:shadow-lg transition-all text-sm h-12 px-8">
                Create your first event
              </Button>
            </Link>
          </div>
        </div>

      ) : (
        <div className="space-y-12">
          {/* LIVE Events */}
          {events.some((e: any) => e.status === 'LIVE') && (
            <div className="space-y-4 animate-sl-fade-in">
              <h2 className="text-sm font-bold tracking-widest text-sl-success uppercase flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sl-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sl-success"></span>
                </span>
                Active Events
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.filter((e: any) => e.status === 'LIVE').map((event: any) => (
                  <EventCard key={event.id} event={event} primaryAction="Open Queue" />
                ))}
              </div>
            </div>
          )}

          {/* SCHEDULED Events (if we have them, fallback to draft logic if identical) */}
          {events.some((e: any) => e.status === 'SCHEDULED') && (
            <div className="space-y-4 animate-sl-fade-in">
              <h2 className="text-sm font-bold tracking-widest text-sl-blue uppercase">Scheduled</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.filter((e: any) => e.status === 'SCHEDULED').map((event: any) => (
                  <EventCard key={event.id} event={event} primaryAction="View Event" />
                ))}
              </div>
            </div>
          )}

          {/* DRAFT Events */}
          {events.some((e: any) => e.status === 'DRAFT') && (
            <div className="space-y-4 animate-sl-fade-in">
              <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Drafts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.filter((e: any) => e.status === 'DRAFT').map((event: any) => (
                  <EventCard key={event.id} event={event} primaryAction="Continue Setup" />
                ))}
              </div>
            </div>
          )}

          {/* PAST Events */}
          {events.some((e: any) => ['COMPLETED', 'CANCELLED'].includes(e.status)) && (
            <div className="space-y-4 animate-sl-fade-in opacity-80">
              <h2 className="text-sm font-bold tracking-widest text-muted-foreground uppercase">Past Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.filter((e: any) => ['COMPLETED', 'CANCELLED'].includes(e.status)).map((event: any) => (
                  <EventCard key={event.id} event={event} primaryAction="View Event" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, primaryAction }: { event: any, primaryAction: string }) {
  const isLive = event.status === 'LIVE';

  return (
    <Link href={`/organizer/events/${event.id}`} className="block group">
      <Card className="flex flex-col h-full hover:shadow-md transition-standard border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="flex justify-between items-start gap-4 mb-1">
            <CardTitle className="text-lg font-bold leading-tight group-hover:text-sl-blue transition-colors line-clamp-1" title={event.name}>
              {event.name}
            </CardTitle>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 ${
              isLive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
              event.status === 'DRAFT' ? 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700' :
              'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}>
              {event.status}
            </span>
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
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>
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
            className={`w-full h-9 text-xs font-bold shadow-none ${isLive ? 'bg-sl-blue hover:bg-blue-700' : ''}`}
          >
            {primaryAction}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
