"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { teardownOrganizerSession } from "@/lib/auth-session";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    // Prevent accidental backdrop or esc dismiss while deletion is running
    if (isSubmitting) return;
    if (!nextOpen) {
      setPassword("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await authApi.deleteAccount(password);

      // CRITICAL: Fully isolate and tear down client state before redirecting
      await teardownOrganizerSession();

      onOpenChange(false);
      router.replace("/");
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to delete account. Please verify your password and try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-red-200 dark:border-red-900/50">
        <div className="h-1.5 w-full bg-red-600" />
        <form onSubmit={handleDelete} className="p-6 sm:p-7 space-y-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Irreversible Action
                </div>
                <DialogTitle className="font-heading text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  Delete your Skipline account?
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              This will permanently delete your organizer account along with all of your
              events, queues, active participants, historical entries, and analytics.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 text-xs text-red-800 dark:text-red-300 font-medium">
            ⚠️ <strong>Warning:</strong> This action cannot be undone. Once deleted, any
            public queue links or QR codes will immediately become unavailable.
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="delete-account-password"
              className="text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Enter your password to confirm:
            </Label>
            <Input
              id="delete-account-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className="h-10 text-sm"
              required
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 p-2.5 rounded-lg"
            >
              {error}
            </div>
          )}

          <DialogFooter className="pt-2 sm:justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password.trim() || isSubmitting}
              className="h-10 font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-micro"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting account...
                </>
              ) : (
                "Delete my account permanently"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
