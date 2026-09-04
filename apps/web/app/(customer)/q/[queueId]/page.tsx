"use client";

import { usePublicQueue } from "@/features/queues/hooks/useQueues";
import { useJoinQueue, useCustomerStatus, useLeaveQueue } from "@/features/customer/hooks/useCustomerQueue";
import { useCustomerStore } from "@/features/customer/stores/useCustomerStore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Users, ArrowRight, XCircle, Activity, MapPin, Ticket } from "lucide-react";

export default function CustomerQueuePage() {
  const params = useParams();
  const queueId = params.queueId as string;
  
  const { data: queue, isLoading: isLoadingQueue, error: queueError } = usePublicQueue(queueId);
  const { data: status, isLoading: isLoadingStatus } = useCustomerStatus(queueId);
  
  const { mutate: joinQueue, isPending: isJoining, error: joinError } = useJoinQueue();
  const { mutate: leaveQueue, isPending: isLeaving } = useLeaveQueue();
  
  const entryData = useCustomerStore((state) => state.entries[queueId]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    joinQueue({ queueId, data: { customerName: name, customerPhone: phone } });
  };

  const handleLeave = () => {
    if (!entryData) return;
    if (confirm("Are you sure you want to leave the line? You will lose your spot.")) {
      leaveQueue({ queueId, entryId: entryData.entryId, token: entryData.token });
    }
  };

  if (isLoadingQueue) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
      </div>
    );
  }

  if (queueError || !queue) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 max-w-md w-full">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Queue Not Found</h2>
          <p className="text-zinc-500">The queue you are looking for does not exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  // If customer is joined but the status is CANCELLED, COMPLETED, or SKIPPED, we should probably clear it
  // Wait, let's just let them see the final status for a bit.

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
        
        {/* Header */}
        <div className="bg-black text-white p-6 pb-8 rounded-b-[2rem] shadow-md relative z-10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <MapPin className="h-4 w-4" />
              <span className="font-medium tracking-wide">{queue.event.name}</span>
            </div>
            
            {status && (
              <Link href="/q" className="flex items-center gap-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors">
                <Ticket className="h-3.5 w-3.5" />
                My Tickets
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-bold leading-tight">{queue.name}</h1>
          {queue.description && (
            <p className="text-zinc-400 mt-2 text-sm">{queue.description}</p>
          )}
          
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-sm font-medium">
              <Users className="h-4 w-4 text-blue-400" />
              {queue._count.entries} Waiting
            </div>
            {queue.status === "PAUSED" && (
              <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-full text-sm font-medium">
                PAUSED
              </div>
            )}
            {queue.status === "CLOSED" && (
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-300 px-3 py-1.5 rounded-full text-sm font-medium">
                CLOSED
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 -mt-4 pt-8 relative z-0">
          {!status ? (
            /* JOIN FORM */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Join the Line</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Enter your details to secure your spot. We'll estimate your wait time automatically.
                </p>
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                {joinError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {(joinError as any)?.message || "Failed to join queue. Please try again."}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input 
                    id="phone" 
                    type="tel"
                    placeholder="+1 234 567 890" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl mt-4"
                  disabled={isJoining || queue.status === "CLOSED"}
                >
                  {isJoining ? "Joining..." : queue.status === "CLOSED" ? "Queue Closed" : "Get in Line"}
                  {!isJoining && queue.status !== "CLOSED" && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            </div>
          ) : (
            /* STATUS VIEW */
            <div className="space-y-8 flex flex-col items-center">
              <div className="text-center w-full">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-widest">
                  Your Token
                </p>
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-zinc-100 dark:bg-zinc-800 border-4 border-zinc-200 dark:border-zinc-700 shadow-inner">
                  <span className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">
                    #{status.entry.sequenceNumber}
                  </span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                  <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {status.position > 0 ? status.position : "-"}
                  </p>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Position</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {status.estimatedWaitTimeMinutes > 0 ? `~${status.estimatedWaitTimeMinutes}m` : "-"}
                  </p>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Est. Wait</p>
                </div>
              </div>

              <div className={`w-full p-4 rounded-xl flex items-center justify-center gap-3 font-semibold text-lg
                ${status.entry.status === 'WAITING' ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' : ''}
                ${status.entry.status === 'CALLED' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 animate-pulse' : ''}
                ${status.entry.status === 'SERVING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : ''}
                ${['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(status.entry.status) ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800' : ''}
              `}>
                {status.entry.status === 'CALLED' && <Activity className="h-6 w-6" />}
                {status.entry.status}
              </div>

              {['WAITING', 'CALLED'].includes(status.entry.status) && (
                <Button 
                  variant="ghost" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 w-full"
                  onClick={handleLeave}
                  disabled={isLeaving}
                >
                  Leave Queue
                </Button>
              )}

              {['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(status.entry.status) && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => useCustomerStore.getState().clearEntry(queueId)}
                >
                  Done
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-xs font-medium text-zinc-400 tracking-wider">
          POWERED BY <span className="text-zinc-800 dark:text-zinc-200 font-bold">SKIPLINE</span>
        </p>
      </div>
    </div>
  );
}
