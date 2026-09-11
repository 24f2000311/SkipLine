"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateQueue } from "@/features/queues/hooks/useQueues";
import { Settings2, Users, Star, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const queueSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  priorityPolicy: z.enum(["FIFO", "WEIGHTED_PRIORITY"]),
  maxCapacity: z.string().optional(),
  // Advanced fields
  vipWeight: z.string().optional(),
  normalWeight: z.string().optional(),
  estimatedServiceTime: z.string().optional(),
  maxVipStreak: z.string().optional(),
  agingIntervalSec: z.string().optional(),
  agingScoreStep: z.string().optional(),
});

type QueueFormValues = z.infer<typeof queueSchema>;

interface EditQueueDialogProps {
  queue: any;
}

export function EditQueueDialog({ queue }: EditQueueDialogProps) {
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { mutate: updateQueue, isPending } = useUpdateQueue();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QueueFormValues>({
    resolver: zodResolver(queueSchema),
    defaultValues: {
      name: queue.name || "",
      description: queue.description || "",
      priorityPolicy: queue.priorityPolicy || "FIFO",
      maxCapacity: queue.maxCapacity ? String(queue.maxCapacity) : "",
      vipWeight: queue.vipWeight ? String(queue.vipWeight) : "2",
      normalWeight: queue.normalWeight ? String(queue.normalWeight) : "1",
      estimatedServiceTime: queue.estimatedServiceTime ? String(queue.estimatedServiceTime) : "5",
      maxVipStreak: queue.maxVipStreak ? String(queue.maxVipStreak) : "2",
      agingIntervalSec: queue.agingIntervalSec ? String(queue.agingIntervalSec) : "300",
      agingScoreStep: queue.agingScoreStep ? String(queue.agingScoreStep) : "10",
    },
  });

  const selectedPolicy = watch("priorityPolicy");

  const onSubmit = (data: QueueFormValues) => {
    setServerError(null);
    
    const payload = {
      eventId: queue.eventId,
      name: data.name,
      description: data.description,
      priorityPolicy: data.priorityPolicy,
      maxCapacity: data.maxCapacity ? Number(data.maxCapacity) : undefined,
      vipWeight: data.vipWeight ? Number(data.vipWeight) : undefined,
      normalWeight: data.normalWeight ? Number(data.normalWeight) : undefined,
      estimatedServiceTime: data.estimatedServiceTime ? Number(data.estimatedServiceTime) : undefined,
      maxVipStreak: data.maxVipStreak ? Number(data.maxVipStreak) : undefined,
      agingIntervalSec: data.agingIntervalSec ? Number(data.agingIntervalSec) : undefined,
      agingScoreStep: data.agingScoreStep ? Number(data.agingScoreStep) : undefined,
    };

    updateQueue({ id: queue.id, data: payload }, {
      onSuccess: () => {
        setOpen(false);
        reset(data); // update defaults
      },
      onError: (err: any) => {
        setServerError(err.message || "An error occurred while updating the queue");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 border-slate-200" />}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200 dark:border-slate-800 rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
          <DialogTitle className="text-xl font-extrabold text-foreground">Edit queue settings</DialogTitle>
          <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Update the configuration for this queue.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          
          {/* Queue Details section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Queue Details</h3>
            
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Queue Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Main Entrance, VIP Access"
                {...register("name")}
                className={`h-11 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description
              </Label>
              <Input
                id="description"
                placeholder="Optional details about this queue"
                {...register("description")}
                className="h-11 focus-visible:ring-sl-blue"
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Capacity & Scheduling section */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">Rules & Capacity</h3>
            
            <div className="space-y-1.5">
              <Label htmlFor="maxCapacity" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Maximum people in queue
              </Label>
              <Input
                id="maxCapacity"
                type="number"
                placeholder="Unlimited"
                {...register("maxCapacity")}
                className="h-11 focus-visible:ring-sl-blue"
              />
              <p className="text-[13px] font-medium text-slate-500">
                Once the queue reaches this limit, new customers cannot join until space becomes available.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Priority Policy
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* FIFO Card */}
                <button
                  type="button"
                  onClick={() => {
                    setValue("priorityPolicy", "FIFO");
                    setShowAdvanced(false);
                  }}
                  className={`flex flex-col items-start p-4 border rounded-xl text-left transition-all ${
                    selectedPolicy === "FIFO" 
                      ? "bg-blue-50/50 border-sl-blue ring-1 ring-sl-blue dark:bg-blue-900/10 dark:border-blue-500 dark:ring-blue-500" 
                      : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Users className={`h-4 w-4 ${selectedPolicy === "FIFO" ? "text-sl-blue dark:text-blue-400" : "text-slate-500"}`} />
                    <span className={`font-bold text-sm ${selectedPolicy === "FIFO" ? "text-sl-blue dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                      First Come, First Served
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-slate-500 leading-tight">
                    Everyone is served based on when they joined.
                  </span>
                </button>

                {/* Weighted Priority Card */}
                <button
                  type="button"
                  onClick={() => setValue("priorityPolicy", "WEIGHTED_PRIORITY")}
                  className={`flex flex-col items-start p-4 border rounded-xl text-left transition-all ${
                    selectedPolicy === "WEIGHTED_PRIORITY" 
                      ? "bg-blue-50/50 border-sl-blue ring-1 ring-sl-blue dark:bg-blue-900/10 dark:border-blue-500 dark:ring-blue-500" 
                      : "bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Star className={`h-4 w-4 ${selectedPolicy === "WEIGHTED_PRIORITY" ? "text-sl-blue dark:text-blue-400" : "text-slate-500"}`} />
                    <span className={`font-bold text-sm ${selectedPolicy === "WEIGHTED_PRIORITY" ? "text-sl-blue dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}`}>
                      Priority Queue
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-slate-500 leading-tight">
                    Priority customers can move ahead while preventing starvation.
                  </span>
                </button>
              </div>
            </div>

            {/* Advanced Settings for Priority */}
            {(selectedPolicy === "WEIGHTED_PRIORITY") && (
              <div className="pt-2 animate-sl-fade-in">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Settings2 className="h-4 w-4" />
                  {showAdvanced ? "Hide Advanced Algorithm Configuration" : "Show Advanced Algorithm Configuration"}
                </button>

                {showAdvanced && (
                  <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800/60 space-y-5 animate-sl-fade-in">
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="estimatedServiceTime" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estimated Service Time (mins)</Label>
                      <Input id="estimatedServiceTime" type="number" className="h-10 bg-white dark:bg-slate-950" {...register("estimatedServiceTime")} />
                      <p className="text-[12px] font-medium text-slate-500">Used to calculate ETA for customers.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="vipWeight" className="text-sm font-semibold text-slate-700 dark:text-slate-300">VIP Weight</Label>
                        <Input id="vipWeight" type="number" className="h-10 bg-white dark:bg-slate-950" {...register("vipWeight")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="normalWeight" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Normal Weight</Label>
                        <Input id="normalWeight" type="number" className="h-10 bg-white dark:bg-slate-950" {...register("normalWeight")} />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label htmlFor="maxVipStreak" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Max VIP Streak</Label>
                        <Input id="maxVipStreak" type="number" className="h-10 bg-white dark:bg-slate-950" {...register("maxVipStreak")} />
                        <p className="text-[12px] font-medium text-slate-500">Forces normal queue progress after this many consecutive VIP calls.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {serverError && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-900/50">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="font-semibold text-slate-600 hover:text-slate-900">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="font-bold bg-sl-blue hover:bg-blue-700 text-white px-6">
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
