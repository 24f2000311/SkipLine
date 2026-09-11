"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateEvent } from "@/features/events/hooks/useEvents";
import { Loader2, Settings, AlertCircle, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const eventSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  venue: z.string().optional(),
  venueMapUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
}).refine((data) => {
  const start = new Date(`${data.startDate}T${data.startTime}`);
  const end = new Date(`${data.endDate}T${data.endTime}`);
  return start < end;
}, {
  message: "End date/time must be after start date/time",
  path: ["endDate"],
});

type EventFormValues = z.infer<typeof eventSchema>;

function formatTimeForInput(dateStr: string) {
  const d = new Date(dateStr);
  return d.toTimeString().slice(0, 5); // "HH:MM"
}

function formatDateForInput(dateStr: string) {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

export function EditEventDialog({ event }: { event: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { mutate: updateEvent, isPending } = useUpdateEvent();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event.name || "",
      description: event.description || "",
      venue: event.venue || "",
      venueMapUrl: event.venueMapUrl || "",
      startDate: event.startAt ? formatDateForInput(event.startAt) : "",
      startTime: event.startAt ? formatTimeForInput(event.startAt) : "",
      endDate: event.endAt ? formatDateForInput(event.endAt) : "",
      endTime: event.endAt ? formatTimeForInput(event.endAt) : "",
    },
  });

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setServerError(null);
      reset({
        name: event.name || "",
        description: event.description || "",
        venue: event.venue || "",
        venueMapUrl: event.venueMapUrl || "",
        startDate: event.startAt ? formatDateForInput(event.startAt) : "",
        startTime: event.startAt ? formatTimeForInput(event.startAt) : "",
        endDate: event.endAt ? formatDateForInput(event.endAt) : "",
        endTime: event.endAt ? formatTimeForInput(event.endAt) : "",
      });
    }
  };

  const onSubmit = (data: EventFormValues) => {
    setServerError(null);
    const startAt = new Date(`${data.startDate}T${data.startTime}`).toISOString();
    const endAt = new Date(`${data.endDate}T${data.endTime}`).toISOString();
    
    updateEvent({
      id: event.id,
      data: {
        name: data.name,
        description: data.description,
        venue: data.venue,
        venueMapUrl: data.venueMapUrl,
        startAt,
        endAt,
      }
    }, {
      onSuccess: () => {
        setIsOpen(false);
      },
      onError: (err: any) => {
        setServerError(err.message || "An error occurred while updating the event.");
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs gap-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900">
        <Edit2 className="h-4 w-4" /> Edit Event
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 p-0 border-slate-200 dark:border-slate-800 rounded-3xl gap-0 shadow-2xl">
        
        <DialogHeader className="px-6 py-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="mx-auto w-12 h-12 bg-sl-blue/10 text-sl-blue rounded-full flex items-center justify-center mb-2">
            <Settings className="w-6 h-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-slate-900 dark:text-white">Edit Event Details</DialogTitle>
          <DialogDescription className="text-center text-slate-500 font-medium">
            Update your event's details and schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Event Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Event Name"
                {...register("name")}
                className={`h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue ${errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p role="alert" className="text-[11px] font-bold text-red-500 mt-1 ml-1 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Description
              </Label>
              <Input
                id="description"
                placeholder="Optional description"
                {...register("description")}
                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="venue" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Venue Name
              </Label>
              <Input
                id="venue"
                placeholder="e.g. Main Auditorium"
                {...register("venue")}
                className="h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venueMapUrl" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                Google Maps URL
              </Label>
              <Input
                id="venueMapUrl"
                placeholder="https://maps.google.com/..."
                {...register("venueMapUrl")}
                className={`h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue ${errors.venueMapUrl ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                aria-invalid={!!errors.venueMapUrl}
              />
              {errors.venueMapUrl && (
                <p role="alert" className="text-[11px] font-bold text-red-500 mt-1 ml-1 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.venueMapUrl.message}
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 -mx-6" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                  className={`h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue ${errors.startDate ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime")}
                  className={`h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue ${errors.startTime ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="endDate" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  End Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register("endDate")}
                  className={`h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue ${errors.endDate ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                  End Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register("endTime")}
                  className={`h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-sl-blue ${errors.endTime ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
              </div>
            </div>
          </div>
          
          {(errors.startDate || errors.startTime || errors.endDate || errors.endTime) && (
            <p role="alert" className="text-[11px] font-bold text-red-500 mt-1 ml-1 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Please check your dates and times
            </p>
          )}

          {serverError && (
            <div role="alert" className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl border border-red-200 dark:border-red-900/50 flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {serverError}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 h-12 rounded-xl font-bold"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12 rounded-xl font-black bg-sl-blue hover:bg-blue-700 text-white"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
