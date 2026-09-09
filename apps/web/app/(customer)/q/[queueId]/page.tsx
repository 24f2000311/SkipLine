"use client";

import { usePublicQueue } from "@/features/queues/hooks/useQueues";
import { useJoinQueue, useCustomerStatus, useLeaveQueue } from "@/features/customer/hooks/useCustomerQueue";
import { useCustomerStore } from "@/features/customer/stores/useCustomerStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SkiplineLogo } from "@/components/skipline-logo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Clock, Users, ArrowRight, XCircle, MapPin, Ticket, CheckCircle2, UserCircle2, AlertCircle } from "lucide-react";

export default function CustomerQueuePage() {
  const params = useParams();
  const queueId = params.queueId as string;
  
  useWebSocket(queueId);
  
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

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleLeaveConfirm = () => {
    if (!entryData) return;
    leaveQueue({ queueId, entryId: entryData.entryId, token: entryData.token });
    setShowLeaveConfirm(false);
  };

  if (isLoadingQueue) {
    return (
      <div className="min-h-screen bg-sl-surface flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-40 w-full rounded-[2rem]" />
          <Skeleton className="h-[400px] w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (queueError || !queue) {
    const isNotFound = (queueError as any)?.response?.status === 404 || !queue;
    
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 max-w-sm w-full animate-sl-fade-in flex flex-col items-center">
          {isNotFound ? (
            <>
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Queue Not Found</h2>
              <p className="text-sm font-medium text-slate-500">This queue doesn't exist or is currently unavailable.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
              <p className="text-sm font-medium text-slate-500 mb-6">We couldn't load this queue. Please try again.</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                Try Again
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans selection:bg-sl-blue selection:text-white">
      <div className="w-full max-w-[400px] bg-white dark:bg-slate-950 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800/60 relative">
        
        {/* ================= HEADER ================= */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 pb-8 rounded-b-[2rem] relative z-10 border-b border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <MapPin className="h-3.5 w-3.5 text-sl-cyan" />
              <span className="line-clamp-1">{queue.event.name}</span>
            </div>
            
            {status && (
              <Link href="/q" className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                <Ticket className="h-3.5 w-3.5" />
                Tickets
              </Link>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">{queue.name}</h1>
          
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded text-xs font-bold tracking-wide">
              <Users className="h-3.5 w-3.5 text-sl-cyan" />
              {queue._count.entries} Waiting
            </div>
            {queue.status === "PAUSED" && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">
                Paused
              </div>
            )}
            {queue.status === "CLOSED" && (
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">
                Closed
              </div>
            )}
          </div>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="p-6 sm:p-8 -mt-4 pt-10 relative z-0">
          {entryData && isLoadingStatus ? (
            <div className="text-center py-10 space-y-4 animate-sl-fade-in">
              <Skeleton className="h-12 w-12 rounded-full mx-auto" />
              <div className="space-y-2 flex flex-col items-center">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ) : !status ? (
            queue.status === "CLOSED" ? (
              /* CLOSED STATE */
              <div className="text-center py-6 space-y-4 animate-sl-fade-in">
                <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Queue Closed</h2>
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    No new customers can join this queue.
                  </p>
                </div>
              </div>
            ) : (
              /* JOIN FORM */
              <div className="space-y-6 animate-sl-fade-in">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Join the queue</h2>
                  <p className="text-sm font-semibold text-sl-blue dark:text-blue-400 mt-2">
                    Join now and move freely while you wait. We'll let you know when it's your turn.
                  </p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                  {joinError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 text-center">
                      {(joinError as any)?.message || "Couldn't join the queue. Please try again."}
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Your name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-14 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-base font-semibold focus-visible:ring-sl-blue"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                      <span>Phone</span>
                      <span className="text-slate-400">Optional</span>
                    </Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="For notifications" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-14 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-base font-semibold focus-visible:ring-sl-blue"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className={`w-full h-14 text-lg font-black rounded-xl mt-4 shadow-md transition-all ${queue.status === 'PAUSED' ? 'bg-slate-200 text-slate-500' : 'bg-sl-blue hover:bg-blue-700 text-white'}`}
                    disabled={isJoining || queue.status === 'PAUSED'}
                  >
                    {isJoining ? "Joining..." : queue.status === 'PAUSED' ? "Queue Paused" : "Join Queue"}
                  </Button>
                </form>
              </div>
            )
          ) : (
            /* ================= ACTIVE STATUS VIEWS ================= */
            <div className="space-y-6 flex flex-col items-center w-full">

              {/* CALLED STATE */}
              {status.entry.status === 'CALLED' && (
                <div className="w-full text-center animate-sl-fade-in" role="alert" aria-live="assertive">
                  <div className="mb-8">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-sm font-black uppercase tracking-widest mb-4 animate-sl-pulse-soft">
                      It's Your Turn
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">You're Up!</h2>
                    <p className="text-base font-semibold text-slate-500 mt-2">
                      Please proceed to the desk immediately.
                    </p>
                  </div>

                  <div className="text-center w-full py-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border-2 border-emerald-500/20 shadow-inner">
                    <p className="text-xs font-black text-emerald-600/70 dark:text-emerald-500/70 mb-3 uppercase tracking-widest">
                      Your Token
                    </p>
                    <span className="text-6xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
                      A-{String(status.entry.sequenceNumber).padStart(3, '0')}
                    </span>
                  </div>
                </div>
              )}

              {/* SERVING STATE */}
              {status.entry.status === 'SERVING' && (
                <div className="w-full text-center animate-sl-fade-in">
                  <div className="mb-8">
                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 text-sm font-black uppercase tracking-widest mb-4">
                      In Progress
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Being Served</h2>
                    <p className="text-base font-semibold text-slate-500 mt-2">
                      You are currently at the desk.
                    </p>
                  </div>

                  <div className="text-center w-full py-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">
                      Your Token
                    </p>
                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                      A-{String(status.entry.sequenceNumber).padStart(3, '0')}
                    </span>
                  </div>
                </div>
              )}

              {/* WAITING STATE */}
              {status.entry.status === 'WAITING' && (
                <div className="w-full text-center animate-sl-fade-in">
                  
                  <div className="text-center w-full py-8">
                    <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
                      Your Token
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-6xl sm:text-7xl font-black text-slate-900 dark:text-white tracking-tighter">
                        A-{String(status.entry.sequenceNumber).padStart(3, '0')}
                      </span>
                    </div>
                    
                    <p className="text-sm font-bold text-sl-blue dark:text-blue-400 mt-6">
                      You're in line. Move freely.
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      We'll let you know when it's your turn.
                    </p>
                  </div>

                  {/* Position & Wait Info */}
                  {(status.position > 0 || status.estimatedWaitTimeMinutes > 0) && (
                    <div className="w-full grid grid-cols-2 gap-3 mt-2">
                      {status.position > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {status.position}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Position</p>
                        </div>
                      )}
                      {status.estimatedWaitTimeMinutes > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
                          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            ~{status.estimatedWaitTimeMinutes}m
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Wait</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TERMINAL STATES (COMPLETED / CANCELLED / SKIPPED) */}
              {['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(status.entry.status) && (
                <div className="w-full text-center space-y-6 animate-sl-fade-in py-4">
                  {status.entry.status === 'COMPLETED' && (
                    <>
                      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">You're all set</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Your service is complete. Thank you!</p>
                      </div>
                    </>
                  )}
                  {status.entry.status === 'CANCELLED' && (
                    <>
                      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <UserCircle2 className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">You left</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-2">Your place in line has been cancelled.</p>
                      </div>
                    </>
                  )}
                  {status.entry.status === 'SKIPPED' && (
                    <>
                      <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <XCircle className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">You were skipped</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-2">You missed your turn and have been skipped.</p>
                      </div>
                    </>
                  )}
                  
                  <Button 
                    className="w-full h-14 text-base font-bold rounded-xl mt-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    onClick={() => useCustomerStore.getState().clearEntry(queueId)}
                  >
                    Done
                  </Button>
                </div>
              )}

              {/* SECONDARY ACTION: LEAVE QUEUE */}
              {['WAITING', 'CALLED'].includes(status.entry.status) && (
                <div className="pt-4 w-full">
                  <Button 
                    variant="ghost" 
                    className="w-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                    onClick={() => setShowLeaveConfirm(true)}
                    disabled={isLeaving}
                  >
                    Leave Queue
                  </Button>
                  <ConfirmDialog 
                    isOpen={showLeaveConfirm}
                    onOpenChange={setShowLeaveConfirm}
                    title="Leave this queue?"
                    description="You'll lose your current place and will need to join again if you change your mind."
                    onConfirm={handleLeaveConfirm}
                    isPending={isLeaving}
                    confirmText="Yes, leave queue"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center opacity-50 hover:opacity-100 transition-opacity">
        <SkiplineLogo size="sm" />
      </div>
    </div>
  );
}
