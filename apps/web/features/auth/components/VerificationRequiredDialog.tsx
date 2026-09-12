"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { authApi } from "@/lib/api/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, CheckCircle2, Sparkles } from "lucide-react";

interface VerificationRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionContext?: "event" | "queue" | "general";
}

export function VerificationRequiredDialog({
  open,
  onOpenChange,
  actionContext = "general",
}: VerificationRequiredDialogProps) {
  const user = useAuthStore((state) => state.user);
  const [isResending, setIsResending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically dismiss dialog if verification happens in another tab or background
  useEffect(() => {
    if (open && user?.emailVerifiedAt) {
      onOpenChange(false);
    }
  }, [open, user?.emailVerifiedAt, onOpenChange]);


  const handleResend = async () => {
    if (!user?.email || isResending) return;
    setIsResending(true);
    setErrorMsg(null);
    try {
      await authApi.resendVerification(user.email);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 6000);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.error?.message ||
          "Could not send verification email. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const actionText =
    actionContext === "event"
      ? "before creating events"
      : actionContext === "queue"
      ? "before creating queues"
      : "before creating events or queues";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 gap-0 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 shadow-xl">
        {/* Subtle top branded flow accent */}
        <div className="h-1.5 w-full bg-[#1868F8]" />

        <div className="p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1868F8] border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1868F8] uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Account Setup
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                Verify your email
              </DialogTitle>
            </div>
          </div>

          <DialogDescription className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            Your account is ready, but you need to verify your email address{" "}
            {actionText}.
          </DialogDescription>

          {user?.email && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Sent to
              </span>
              <span className="text-slate-900 dark:text-white font-semibold truncate">
                {user.email}
              </span>
            </div>
          )}

          {sentSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Verification email sent! Please check your inbox.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-xl text-xs font-medium border border-red-200 dark:border-red-800/40">
              {errorMsg}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 sm:flex-row sm:justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 text-sm font-semibold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            I&apos;ll do this later
          </Button>

          <Button
            onClick={handleResend}
            disabled={isResending}
            className="h-10 text-sm font-bold bg-[#1868F8] hover:bg-blue-700 text-white rounded-lg shadow-sm"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : sentSuccess ? (
              "Resend again"
            ) : (
              "Resend verification email"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
