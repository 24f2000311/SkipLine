"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateQueue } from "@/features/queues/hooks/useQueues";
import { PlusCircle, Settings2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface CreateQueueDialogProps {
  eventId: string;
}

export function CreateQueueDialog({ eventId }: CreateQueueDialogProps) {
  const [open, setOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { mutate: createQueue, isPending } = useCreateQueue();
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
      priorityPolicy: "FIFO",
      vipWeight: "2",
      normalWeight: "1",
      estimatedServiceTime: "5",
      maxVipStreak: "2",
      agingIntervalSec: "300",
      agingScoreStep: "10",
    },
  });

  const selectedPolicy = watch("priorityPolicy");

  const onSubmit = (data: QueueFormValues) => {
    setServerError(null);
    
    const payload = {
      eventId,
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

    createQueue(payload, {
      onSuccess: () => {
        setOpen(false);
        reset();
        setShowAdvanced(false);
      },
      onError: (err: any) => {
        setServerError(err.message || "An error occurred while creating the queue");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Create Queue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Queue</DialogTitle>
          <DialogDescription>
            Add a new queue to this event. You can configure the priority algorithm below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Queue Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. VIP Entrance, Main Stage"
                {...register("name")}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional details about this queue"
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priorityPolicy">Priority Policy</Label>
                <Select 
                  value={selectedPolicy} 
                  onValueChange={(value: any) => setValue("priorityPolicy", value)}
                >
                  <SelectTrigger id="priorityPolicy">
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIFO">Standard (FIFO)</SelectItem>
                    <SelectItem value="WEIGHTED_PRIORITY">Weighted Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCapacity">Max Capacity</Label>
                <Input
                  id="maxCapacity"
                  type="number"
                  placeholder="Unlimited"
                  {...register("maxCapacity")}
                />
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings"}
              </button>
            </div>

            {/* Advanced Settings Panel */}
            {showAdvanced && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-4">
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Algorithm Configuration</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="estimatedServiceTime">Estimated Service Time (mins)</Label>
                  <Input
                    id="estimatedServiceTime"
                    type="number"
                    {...register("estimatedServiceTime")}
                  />
                  <p className="text-xs text-zinc-500">Used to calculate ETA for customers.</p>
                </div>

                {(selectedPolicy === "WEIGHTED_PRIORITY") && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vipWeight">VIP Weight</Label>
                      <Input id="vipWeight" type="number" {...register("vipWeight")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="normalWeight">Normal Weight</Label>
                      <Input id="normalWeight" type="number" {...register("normalWeight")} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="maxVipStreak">Max VIP Streak</Label>
                      <Input id="maxVipStreak" type="number" {...register("maxVipStreak")} />
                      <p className="text-xs text-zinc-500">Prevents normal users from starving.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {serverError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 text-sm rounded-md border border-red-200 dark:border-red-900/50">
              {serverError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Queue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
