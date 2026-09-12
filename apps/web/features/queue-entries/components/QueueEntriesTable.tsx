"use client";

import { useState, useMemo } from "react";
import { useStartServing, useCompleteService, useNoShow, useAllEntries } from "@/features/queue-entries/hooks/useQueueEntries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PlayCircle, CheckCircle2, UserX, Clock, Users, Phone, Hash, Filter } from "lucide-react";

type TabKey = "ALL" | "WAITING" | "CALLED" | "SERVING" | "COMPLETED" | "SKIPPED";

const TABS: { key: TabKey; label: string; color: string; activeColor: string }[] = [
  { key: "ALL", label: "All", color: "text-slate-600 dark:text-slate-400", activeColor: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
  { key: "WAITING", label: "Waiting", color: "text-slate-600 dark:text-slate-400", activeColor: "bg-amber-500 text-white" },
  { key: "CALLED", label: "Called", color: "text-slate-600 dark:text-slate-400", activeColor: "bg-emerald-600 text-white" },
  { key: "SERVING", label: "Serving", color: "text-slate-600 dark:text-slate-400", activeColor: "bg-blue-600 text-white" },
  { key: "COMPLETED", label: "Completed", color: "text-slate-600 dark:text-slate-400", activeColor: "bg-slate-600 text-white dark:bg-slate-500" },
  { key: "SKIPPED", label: "No-Show", color: "text-slate-600 dark:text-slate-400", activeColor: "bg-red-500 text-white" },
];

interface QueueEntriesTableProps {
  queueId: string;
  entries: any[];
  isLoading: boolean;
  error: any;
  isHistorical?: boolean;
}

export function QueueEntriesTable({ queueId, entries, isLoading, error, isHistorical }: QueueEntriesTableProps) {
  const { mutate: startServing, isPending: isStarting } = useStartServing();
  const { mutate: completeService, isPending: isCompleting } = useCompleteService();
  const { mutate: handleNoShow, isPending: isSkipping } = useNoShow();
  
  // Fetch ALL entries for the full participant view
  const { data: allEntries = [] } = useAllEntries(queueId);
  
  const [activeTab, setActiveTab] = useState<TabKey>("ALL");

  // Merge active entries (more real-time) with allEntries (includes terminal states)
  const mergedEntries = useMemo(() => {
    const activeIds = new Set(entries.map((e: any) => e.id));
    const terminalEntries = allEntries.filter((e: any) => !activeIds.has(e.id));
    return [...entries, ...terminalEntries];
  }, [entries, allEntries]);

  // Count per status
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: 0, WAITING: 0, CALLED: 0, SERVING: 0, COMPLETED: 0, SKIPPED: 0, CANCELLED: 0 };
    mergedEntries.forEach((e: any) => {
      c[e.status] = (c[e.status] || 0) + 1;
      c.ALL++;
    });
    // Merge CANCELLED into SKIPPED for UI purposes
    c.SKIPPED = (c.SKIPPED || 0) + (c.CANCELLED || 0);
    return c;
  }, [mergedEntries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (activeTab === "ALL") return mergedEntries;
    if (activeTab === "SKIPPED") return mergedEntries.filter((e: any) => e.status === "SKIPPED" || e.status === "CANCELLED");
    return mergedEntries.filter((e: any) => e.status === activeTab);
  }, [mergedEntries, activeTab]);

  // Sort: Active statuses first (SERVING > CALLED > WAITING > rest), then by sequence
  const sortedEntries = useMemo(() => {
    const statusOrder: Record<string, number> = { SERVING: 0, CALLED: 1, WAITING: 2, COMPLETED: 3, SKIPPED: 4, CANCELLED: 5 };
    return [...filteredEntries].sort((a: any, b: any) => {
      const diff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
      if (diff !== 0) return diff;
      return a.sequenceNumber - b.sequenceNumber;
    });
  }, [filteredEntries]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-sl-error font-medium">
        Failed to load queue entries.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-sl-fade-in">
      {/* SUMMARY STATISTICS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={counts.ALL} icon={<Users className="h-4 w-4" />} className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
        <StatCard label="Waiting" value={counts.WAITING} icon={<Clock className="h-4 w-4" />} className="bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400" />
        <StatCard label="Active" value={counts.CALLED + counts.SERVING} icon={<PlayCircle className="h-4 w-4" />} className="bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400" />
        <StatCard label="Completed" value={counts.COMPLETED} icon={<CheckCircle2 className="h-4 w-4" />} className="bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400" />
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        <Filter className="h-4 w-4 text-slate-400 shrink-0 mr-1" />
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key 
                ? tab.activeColor + " shadow-sm" 
                : "hover:bg-slate-100 dark:hover:bg-slate-800 " + tab.color
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1.5 ${activeTab === tab.key ? "opacity-80" : "opacity-50"}`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ENTRIES LIST */}
      {sortedEntries.length === 0 ? (
        <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {activeTab === "ALL" ? "Queue is clear" : `No ${activeTab.toLowerCase()} entries`}
          </p>
          <p className="text-sm font-medium mt-1">
            {activeTab === "ALL" ? "No customers are waiting right now." : "No entries match this filter."}
          </p>
        </div>
      ) : (
        <>
          {/* Unified Card List for all screen sizes */}
          <div className="space-y-3">
            {sortedEntries.map((entry: any) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                queueId={queueId}
                startServing={startServing}
                completeService={completeService}
                handleNoShow={handleNoShow}
                isStarting={isStarting}
                isCompleting={isCompleting}
                isSkipping={isSkipping}
                isHistorical={isHistorical}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAT CARD
// -----------------------------------------------------------------------------
function StatCard({ label, value, icon, className }: { label: string; value: number; icon: React.ReactNode; className: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 ${className}`}>
      <div className="shrink-0 opacity-60">{icon}</div>
      <div>
        <div className="text-xl font-bold tabular-nums tracking-tight">{value}</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">{label}</div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STATUS BADGE
// -----------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    WAITING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    CALLED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    SERVING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    COMPLETED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
    SKIPPED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-[0.08em] ${styles[status] || styles.WAITING}`}>
      {(status === "CALLED" || status === "SERVING") && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === "CALLED" ? "bg-emerald-500" : "bg-blue-500"}`}></span>
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${status === "CALLED" ? "bg-emerald-500" : "bg-blue-500"}`}></span>
        </span>
      )}
      {status}
    </span>
  );
}

// -----------------------------------------------------------------------------
// WAIT TIME HELPER
// -----------------------------------------------------------------------------
function getWaitTime(entry: any): string {
  const start = new Date(entry.joinedAt).getTime();
  const end = entry.completedAt
    ? new Date(entry.completedAt).getTime()
    : entry.cancelledAt
    ? new Date(entry.cancelledAt).getTime()
    : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 1) return "<1m";
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}



// -----------------------------------------------------------------------------
// MOBILE CARD
// -----------------------------------------------------------------------------
function EntryCard({ entry, queueId, startServing, completeService, handleNoShow, isStarting, isCompleting, isSkipping, isHistorical }: any) {
  const [showNoShowConfirm, setShowNoShowConfirm] = useState(false);
  const isActive = entry.status === "CALLED" || entry.status === "SERVING";

  return (
    <>
      <ConfirmDialog 
        isOpen={showNoShowConfirm}
        onOpenChange={setShowNoShowConfirm}
        title="Mark as No Show?"
        description={`Are you sure you want to mark customer #${entry.sequenceNumber} as a no-show?`}
        onConfirm={() => { handleNoShow({ entryId: entry.id, queueId }); setShowNoShowConfirm(false); }}
        isPending={isSkipping}
        confirmText="Yes, mark as no-show"
      />
      <div className={`p-4 rounded-xl border transition-all ${
        isActive 
          ? entry.status === "CALLED" 
            ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-300 dark:border-emerald-800 shadow-sm" 
            : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-800 shadow-sm"
          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-bold tabular-nums text-base border border-slate-200 dark:border-slate-800">
              {entry.sequenceNumber}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h5 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {entry.customerName || "Guest"}
                </h5>
                {entry.priority === "VIP" && (
                  <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">VIP</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium tabular-nums">
                  <Clock className="h-3 w-3" /> {getWaitTime(entry)}
                </span>
                {entry.customerPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {entry.customerPhone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={entry.status} />
        </div>

        {/* Action Buttons */}
        {!isHistorical && entry.status === "CALLED" && (
          <div className="flex items-stretch gap-2 mt-2">
            <Button 
              size="sm" 
              className="flex-1 h-9 font-semibold tracking-[-0.01em] text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isStarting}
              onClick={() => startServing({ entryId: entry.id, queueId })}
            >
              <PlayCircle className="h-4 w-4 mr-1.5" /> Start Serving
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="h-9 font-semibold tracking-[-0.01em] text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
              disabled={isSkipping}
              onClick={() => setShowNoShowConfirm(true)}
            >
              <UserX className="h-4 w-4 mr-1.5" /> No Show
            </Button>
          </div>
        )}
        {!isHistorical && entry.status === "SERVING" && (
          <Button 
            size="sm" 
            className="w-full h-9 font-semibold tracking-[-0.01em] text-xs bg-sl-blue hover:bg-blue-700 text-white mt-2"
            disabled={isCompleting}
            onClick={() => completeService({ entryId: entry.id, queueId })}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Complete Service
          </Button>
        )}
      </div>
    </>
  );
}
