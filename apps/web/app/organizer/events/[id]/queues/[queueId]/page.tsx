"use client";

import { useQueue, useUpdateQueue } from "@/features/queues/hooks/useQueues";
import { useCallNext } from "@/features/queue-entries/hooks/useQueueEntries";
import { QueueEntriesTable } from "@/features/queue-entries/components/QueueEntriesTable";
import { ShareQrDialog } from "@/features/queues/components/ShareQrDialog";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Settings, Play, Pause, Square, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function QueueDetailsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const queueId = params.queueId as string;
  
  const { data: queue, isLoading, error } = useQueue(queueId);
  const { mutate: updateQueue, isPending: isUpdating } = useUpdateQueue();
  const { mutate: callNext, isPending: isCallingNext } = useCallNext();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !queue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <p className="text-red-500">Queue not found.</p>
        <Link href={`/organizer/events/${eventId}`}>
          <Button variant="outline">Back to Event</Button>
        </Link>
      </div>
    );
  }

  const handleStatusChange = (newStatus: "OPEN" | "PAUSED" | "CLOSED") => {
    updateQueue({ id: queueId, data: { status: newStatus } }, {
      onError: (err: any) => {
        alert(err.message || `Failed to update queue status to ${newStatus}`);
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/organizer/events/${eventId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
              {queue.name}
              <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium uppercase tracking-wider ${
                queue.status === 'OPEN' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                queue.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {queue.status}
              </span>
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {queue.priorityPolicy} Policy • {queue.maxCapacity ? `Max Cap: ${queue.maxCapacity}` : "Unlimited Capacity"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareQrDialog queueId={queueId} queueName={queue.name} />
          {queue.status !== "OPEN" && (
            <Button 
              variant="outline" 
              className="gap-2 text-green-600 hover:text-green-700"
              onClick={() => handleStatusChange("OPEN")}
              disabled={isUpdating}
            >
              <Play className="h-4 w-4" /> Open
            </Button>
          )}
          {queue.status === "OPEN" && (
            <Button 
              variant="outline" 
              className="gap-2 text-yellow-600 hover:text-yellow-700"
              onClick={() => handleStatusChange("PAUSED")}
              disabled={isUpdating}
            >
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {queue.status !== "CLOSED" && (
            <Button 
              variant="outline" 
              className="gap-2 text-red-600 hover:text-red-700"
              onClick={() => handleStatusChange("CLOSED")}
              disabled={isUpdating}
            >
              <Square className="h-4 w-4" /> Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-zinc-500" />
                Customers in Line
                {queue._count?.entries > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-medium">
                    {queue._count.entries} waiting
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto hidden sm:flex">Add Walk-in</Button>
                <Button 
                  className="bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 w-full sm:w-auto"
                  onClick={() => callNext(queueId)}
                  disabled={isCallingNext || queue.status !== 'OPEN'}
                >
                  <Megaphone className="h-4 w-4 mr-2" />
                  Call Next Customer
                </Button>
              </div>
            </div>
            
            <QueueEntriesTable queueId={queueId} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-500" />
                Algorithm Settings
              </h3>
            </div>
            
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <dt className="text-zinc-500">Estimated Service Time</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{queue.estimatedServiceTime} mins</dd>
              </div>
              
              {(queue.priorityPolicy === "WEIGHTED_PRIORITY") && (
                <>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <dt className="text-zinc-500">VIP Weight</dt>
                    <dd className="font-medium text-zinc-900 dark:text-white">{queue.vipWeight}x</dd>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <dt className="text-zinc-500">Normal Weight</dt>
                    <dd className="font-medium text-zinc-900 dark:text-white">{queue.normalWeight}x</dd>
                  </div>
                  <div className="flex justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <dt className="text-zinc-500">Max VIP Streak</dt>
                    <dd className="font-medium text-zinc-900 dark:text-white">{queue.maxVipStreak} people</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
