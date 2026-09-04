"use client";

import { useEvents } from "@/features/events/hooks/useEvents";
import Link from "next/link";
import { PlusCircle, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-zinc-500 animate-pulse">Loading your events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <p className="text-red-500">Failed to load events.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Events</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your events and queues.</p>
        </div>
        <Link href="/organizer/events/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
          <div className="mx-auto h-12 w-12 text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">No events yet</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            Get started by creating a new event. You can add queues to it later.
          </p>
          <div className="mt-6">
            <Link href="/organizer/events/new">
              <Button>Create your first event</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: any) => (
            <Card key={event.id} className="flex flex-col hover:shadow-md transition-shadow dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl line-clamp-1" title={event.name}>{event.name}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2 min-h-[2.5rem]">
                      {event.description || "No description provided."}
                    </CardDescription>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                    event.status === 'LIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    event.status === 'DRAFT' ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {event.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                {event.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{event.venue}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="line-clamp-1">
                    {new Date(event.startAt).toLocaleDateString()} - {new Date(event.endAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Link href={`/organizer/events/${event.id}`} className="w-full">
                  <Button variant="secondary" className="w-full">
                    Manage Event
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
