"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SkiplineLogo } from "@/components/skipline-logo";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Clock } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";

type VerificationState = "loading" | "success" | "expired" | "invalid";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationState>("loading");

  // Resend form state
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);

  // Auto-fill resend email if current user is logged in
  useEffect(() => {
    if (currentUser?.email && !resendEmail) {
      setResendEmail(currentUser.email);
    }
  }, [currentUser, resendEmail]);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    let isMounted = true;

    const performVerification = async () => {
      try {
        const response: any = await authApi.verifyEmail(token);
        if (!isMounted) return;
        setStatus("success");

        const verifiedUser = response?.data?.user || response?.data?.data?.user || response?.data;
        const currentStore = useAuthStore.getState();

        // Immediately update local auth store so banner disappears and creation unlocks
        if (currentStore.user && verifiedUser?.id && currentStore.user.id === verifiedUser.id) {
          currentStore.updateUser({
            emailVerifiedAt: verifiedUser.emailVerifiedAt || new Date().toISOString(),
          });
        } else if (currentStore.user && currentStore.accessToken) {
          // If already logged in, reconcile with authoritative getMe
          authApi.getMe().then((meRes) => {
            const fresh = meRes.data?.data || meRes.data;
            if (fresh?.emailVerifiedAt) {
              currentStore.updateUser({ emailVerifiedAt: fresh.emailVerifiedAt });
            }
          }).catch(() => {});
        }
      } catch (err: any) {
        if (!isMounted) return;
        const errCode = err?.response?.data?.error?.code || err?.code;
        const errMsg = (err?.response?.data?.error?.message || err?.message || "").toLowerCase();

        if (errCode === "EXPIRED_VERIFICATION_TOKEN" || errMsg.includes("expired")) {
          setStatus("expired");
        } else if (errCode === "ALREADY_VERIFIED") {
          setStatus("success");
        } else if (errCode === "INVALID_VERIFICATION_TOKEN") {
          setStatus("invalid");
        } else {
          // Check if already verified in current session
          const currentStore = useAuthStore.getState();
          if (currentStore.user?.emailVerifiedAt) {
            setStatus("success");
            return;
          }
          setStatus("invalid");
        }
      }
    };

    performVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);


  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || isResending) return;

    setIsResending(true);
    setResendStatus(null);
    try {
      await authApi.resendVerification(resendEmail);
      setResendStatus({
        type: "success",
        message: "A fresh verification link has been sent if an unverified account exists.",
      });
    } catch (err: any) {
      setResendStatus({
        type: "error",
        message:
          err?.response?.data?.error?.message ||
          "Could not send verification email. Please try again later.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full shadow-lg border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
      {/* Top subtle brand blue accent */}
      <div className="h-1.5 w-full bg-[#1868F8]" />

      {/* 1. Loading State */}
      {status === "loading" && (
        <CardContent className="p-10 sm:p-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#1868F8] mx-auto" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Verifying your email...
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Please wait a moment while we confirm your account.
          </p>
        </CardContent>
      )}

      {/* 2. Success State */}
      {status === "success" && (
        <>
          <CardHeader className="space-y-3 text-center pt-8 pb-4">
            <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-1">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Your email is verified.
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Your Skipline organizer account is ready.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              You can now create events, configure queues, and welcome participants.
            </p>

            <div className="pt-3">
              <Link href="/organizer/dashboard" className="block w-full">
                <Button className="w-full h-11 font-bold bg-[#1868F8] hover:bg-blue-700 text-white rounded-lg shadow-sm">
                  Open dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </>
      )}

      {/* 3. Expired State */}
      {status === "expired" && (
        <>
          <CardHeader className="space-y-3 text-center pt-8 pb-4">
            <div className="mx-auto w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-1">
              <Clock className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              This verification link has expired.
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Verification links expire after 24 hours for your security.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-5">
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                Enter your email address to receive a fresh verification link:
              </p>
              <form onSubmit={handleResend} className="space-y-3">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  className="h-10 text-sm bg-white dark:bg-slate-950"
                />

                {resendStatus && (
                  <div
                    role="alert"
                    className={`p-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 ${
                      resendStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {resendStatus.type === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{resendStatus.message}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isResending}
                  className="w-full h-10 text-sm font-bold bg-[#1868F8] hover:bg-blue-700 text-white"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send a new verification email"
                  )}
                </Button>
              </form>
            </div>

            <div className="text-center pt-1">
              <Link href="/login" className="text-sm font-semibold text-[#1868F8] hover:underline">
                Return to sign in
              </Link>
            </div>
          </CardContent>
        </>
      )}

      {/* 4. Invalid State */}
      {status === "invalid" && (
        <>
          <CardHeader className="space-y-3 text-center pt-8 pb-4">
            <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mb-1">
              <XCircle className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              This verification link is invalid or no longer available.
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
              The link may have already been used or was formatted incorrectly.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-2 space-y-5">
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">
                Enter your email address to receive a fresh verification link:
              </p>
              <form onSubmit={handleResend} className="space-y-3">
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  className="h-10 text-sm bg-white dark:bg-slate-950"
                />

                {resendStatus && (
                  <div
                    role="alert"
                    className={`p-2.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 ${
                      resendStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {resendStatus.type === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>{resendStatus.message}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isResending}
                  className="w-full h-10 text-sm font-bold bg-[#1868F8] hover:bg-blue-700 text-white"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Request a new verification email"
                  )}
                </Button>
              </form>
            </div>

            <div className="text-center pt-1">
              <Link href="/login" className="text-sm font-semibold text-[#1868F8] hover:underline">
                Return to sign in
              </Link>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background p-4 sm:p-8 animate-sl-fade-in">
      <div className="w-full max-w-md flex flex-col items-center">
        <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
          <SkiplineLogo size="lg" />
        </Link>
        <Suspense
          fallback={
            <Card className="w-full p-8 text-center bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#1868F8]" />
            </Card>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
