"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateEvent } from "@/features/events/hooks/useEvents";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        // Redirect to the event details page
        router.push(`/organizer/events/${response?.data?.id || response?.id}`);
      },
      onError: (err: any) => {
        setServerError(err.message || "An error occurred while creating the event");
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/organizer/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Create Event
          </h1>
        </div>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Provide the basic information about your event. You can add queues after creating the event.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g. Tech Summit 2026"
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
                  placeholder="Briefly describe what this event is about"
                  {...register("description")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  placeholder="e.g. Main Auditorium"
                  {...register("venue")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Start Date & Time <span className="text-red-500">*</span></Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    {...register("startAt")}
                    className={errors.startAt ? "border-red-500" : ""}
                  />
                  {errors.startAt && (
                    <p className="text-sm text-red-500 font-medium">{errors.startAt.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endAt">End Date & Time <span className="text-red-500">*</span></Label>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    {...register("endAt")}
                    className={errors.endAt ? "border-red-500" : ""}
                  />
                  {errors.endAt && (
                    <p className="text-sm text-red-500 font-medium">{errors.endAt.message}</p>
                  )}
                </div>
              </div>
            </div>

            {serverError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 text-sm rounded-md border border-red-200 dark:border-red-900/50">
                {serverError}
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Link href="/organizer/dashboard">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
