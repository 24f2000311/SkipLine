"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateEvent } from "@/features/events/hooks/useEvents";
import { useAuthStore } from "@/stores/useAuthStore";
import { authApi } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CalendarPlus, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function CreateEventPage() {
  const { mutate: createEvent, isPending } = useCreateEvent();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    if (!user?.email || isResending) return;
    setIsResending(true);
    try {
      await authApi.resendVerification(user.email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (e) {
      // ignore
    } finally {
      setIsResending(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
  });

  if (user && !user.emailVerifiedAt) {
    return (
      <div className="max-w-2xl mx-auto pb-12 animate-sl-fade-in">
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
          <div className="h-1.5 w-full bg-[#1868F8]" />
          <div className="p-8 sm:p-10 space-y-6 text-center flex flex-col items-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1868F8] border border-blue-100 dark:border-blue-900/50 flex items-center justify-center">
              <Mail className="h-7 w-7" />
            </div>
            
            <div className="space-y-2 max-w-md">
              <div className="text-xs font-bold text-[#1868F8] uppercase tracking-wider">
                ✦ Account Setup
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Verify your email to create events
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Your account is ready, but you need to verify your email address before creating events or queues.
              </p>
            </div>

            {user.email && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400">
                Verification link sent to <span className="font-semibold text-slate-900 dark:text-white">{user.email}</span>
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Verification email sent! Please check your inbox.</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full max-w-xs">
              <Button
                onClick={handleResend}
                disabled={isResending}
                className="w-full h-11 font-bold bg-[#1868F8] hover:bg-blue-700 text-white rounded-lg shadow-sm"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  "Resend again"
                ) : (
                  "Resend verification email"
                )}
              </Button>

              <Link href="/organizer/dashboard" className="w-full">
                <Button variant="outline" className="w-full h-11 font-semibold rounded-lg">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (data: EventFormValues) => {
    setServerError(null);
    const startAt = new Date(`${data.startDate}T${data.startTime}`).toISOString();
    const endAt = new Date(`${data.endDate}T${data.endTime}`).toISOString();
    
    createEvent({
      name: data.name,
      description: data.description,
      venue: data.venue,
      venueMapUrl: data.venueMapUrl,
      startAt,
      endAt,
    }, {
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

          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Section: Location */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Location</h3>
            
            <div className="space-y-1.5">
              <Label htmlFor="venue" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Venue Name
              </Label>
              <Input
                id="venue"
                placeholder="e.g. Main Auditorium"
                {...register("venue")}
                className="h-11 focus-visible:ring-sl-blue"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="venueMapUrl" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Google Maps URL
              </Label>
              <Input
                id="venueMapUrl"
                placeholder="https://maps.google.com/..."
                {...register("venueMapUrl")}
                className={`h-11 ${errors.venueMapUrl ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                aria-invalid={!!errors.venueMapUrl}
              />
              {errors.venueMapUrl && (
                <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.venueMapUrl.message}</p>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Section: When */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">When</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register("startDate")}
                    className={`h-11 ${errors.startDate ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                  />
                  {errors.startDate && <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.startDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Start Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...register("startTime")}
                    className={`h-11 ${errors.startTime ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                  />
                  {errors.startTime && <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.startTime.message}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register("endDate")}
                    className={`h-11 ${errors.endDate ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                  />
                  {errors.endDate && <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.endDate.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    End Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...register("endTime")}
                    className={`h-11 ${errors.endTime ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                  />
                  {errors.endTime && <p role="alert" className="text-[13px] font-medium text-red-500 mt-1">{errors.endTime.message}</p>}
                </div>
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
