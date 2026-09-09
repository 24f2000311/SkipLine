"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateEvent } from "@/features/events/hooks/useEvents";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const eventSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  venue: z.string().optional(),
  startAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date",
  }),
  endAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date",
  }),
}).refine((data) => new Date(data.startAt) < new Date(data.endAt), {
  message: "End date must be after start date",
  path: ["endAt"],
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const { mutate: createEvent, isPending } = useCreateEvent();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
  });

  const onSubmit = (data: EventFormValues) => {
    setServerError(null);
    createEvent(data, {
      onSuccess: (response) => {
        router.push(`/organizer/events/${response?.data?.id || response?.id}`);
      },
      onError: (err: any) => {
        setServerError(err.message || "An error occurred while creating the event.");
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto pb-12 animate-sl-fade-in">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/organizer/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Create Event
          </h1>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Form Intro */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center gap-3 mb-1">
            <CalendarPlus className="h-5 w-5 text-sl-blue" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Event Details</h2>
          </div>
          <p className="text-sm font-medium text-slate-500">
            Set up your event now. You can create queues after.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          
          {/* Section: Basic Details */}
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Event Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Tech Summit 2026"
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
                placeholder="Briefly describe what this event is about"
                {...register("description")}
                className="h-11 focus-visible:ring-sl-blue"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venue" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Venue
              </Label>
              <Input
                id="venue"
                placeholder="e.g. Main Auditorium"
                {...register("venue")}
                className="h-11 focus-visible:ring-sl-blue"
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Section: Schedule */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Schedule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="startAt" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Start Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  {...register("startAt")}
                  className={`h-11 ${errors.startAt ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                />
                {errors.startAt && (
                  <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.startAt.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endAt" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  End Date & Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  {...register("endAt")}
                  className={`h-11 ${errors.endAt ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                />
                {errors.endAt && (
                  <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.endAt.message}</p>
                )}
              </div>
            </div>
          </div>

          {serverError && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-900/50">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Link href="/organizer/dashboard">
              <Button variant="ghost" type="button" className="h-11 font-semibold text-slate-600 hover:text-slate-900">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isPending} className="h-11 px-8 font-bold bg-sl-blue hover:bg-blue-700 text-white shadow-sm">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating event...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
