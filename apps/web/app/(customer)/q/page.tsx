"use client";

import { useCustomerStore } from "@/features/customer/stores/useCustomerStore";
import { useCustomerStatus } from "@/features/customer/hooks/useCustomerQueue";
import { usePublicQueue } from "@/features/queues/hooks/useQueues";
import Link from "next/link";
import { ArrowRight, Clock, Users, Ticket, QrCode } from "lucide-react";

function QueueCard({ queueId }: { queueId: string }) {
  const { data: queue } = usePublicQueue(queueId);
  const { data: status } = useCustomerStatus(queueId);

  if (!queue || !status) return null;

  return (
    <Link href={`/q/${queueId}`}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-blue-500 transition-colors shadow-sm cursor-pointer group">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{queue.event.name}</p>
            <h3 className="font-bold text-lg leading-tight group-hover:text-blue-600 transition-colors">{queue.name}</h3>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-1.5 rounded-lg font-black text-lg shadow-inner">
            #{status.entry.sequenceNumber}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Pos: {status.position > 0 ? status.position : "-"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-lg">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="font-medium">Wait: {status.estimatedWaitTimeMinutes > 0 ? `${status.estimatedWaitTimeMinutes}m` : "-"}</span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase
            ${status.entry.status === 'WAITING' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' : ''}
            ${status.entry.status === 'CALLED' ? 'bg-green-100 text-green-700 dark:bg-green-900/40' : ''}
            ${status.entry.status === 'SERVING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40' : ''}
            ${['COMPLETED', 'CANCELLED', 'SKIPPED'].includes(status.entry.status) ? 'bg-zinc-100 text-zinc-400' : ''}
          `}>
            {status.entry.status}
          </div>
          <ArrowRight className="h-5 w-5 text-zinc-300 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function MyQueuesPage() {
  const entries = useCustomerStore((state) => state.entries);
  const activeQueueIds = Object.keys(entries);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-md mt-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white flex items-center gap-3">
            <Ticket className="h-8 w-8 text-blue-600" />
            My Tickets
          </h1>
          <p className="text-zinc-500 mt-2">Track all your active spots in line.</p>
        </div>

        {activeQueueIds.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center shadow-xl border border-zinc-100 dark:border-zinc-800">
            <div className="bg-zinc-50 dark:bg-zinc-950 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-zinc-400" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">No Active Tickets</h2>
            <p className="text-zinc-500 text-sm">
              Scan a queue's QR code or visit its link to get in line. They will automatically appear here!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeQueueIds.map((qId) => (
              <QueueCard key={qId} queueId={qId} />
            ))}
          </div>
        )}

      </div>
      
      <div className="mt-auto pt-12 pb-4 text-center">
        <p className="text-xs font-medium text-zinc-400 tracking-wider">
          POWERED BY <span className="text-zinc-800 dark:text-zinc-200 font-bold">SKIPLINE</span>
        </p>
      </div>
    </div>
  );
}
