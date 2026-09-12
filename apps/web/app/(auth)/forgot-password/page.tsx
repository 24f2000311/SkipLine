"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import { SkiplineLogo } from "@/components/skipline-logo";
import { Loader2, MailCheck, ArrowLeft, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await authApi.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
          "Failed to process your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background p-4 sm:p-8 animate-sl-fade-in">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo Section */}
        <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
          <SkiplineLogo size="lg" />
        </Link>

        <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
          {isSubmitted ? (
            /* ================= SUCCESS STATE ================= */
            <>
              <CardHeader className="space-y-3 text-center pt-8 pb-4">
                <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-sl-blue rounded-full flex items-center justify-center mb-1">
                  <MailCheck className="w-8 h-8 text-sl-blue" />
                </div>
                <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Check your inbox
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Password reset link sent
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-2 space-y-5 text-center">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Sent to
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">
                    {submittedEmail}
                  </p>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  If an account exists for this email, you will receive a link to choose a new password. The link will expire in 30 minutes.
                </p>

                <div className="space-y-3 pt-2">
                  <Link href="/login" className="block w-full">
                    <Button
                      type="button"
                      className="w-full h-11 font-bold bg-sl-blue hover:bg-blue-700 text-white rounded-lg shadow-sm"
                    >
                      Return to sign in
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsSubmitted(false)}
                    className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Try another email address
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            /* ================= REQUEST FORM ================= */
            <>
              <CardHeader className="space-y-2 text-center pt-8 pb-4">
                <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Forgot your password?
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Enter your email address and we will send you a reset link.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 pt-2">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      {...register("email")}
                      className={`h-11 ${
                        errors.email
                          ? "border-red-500 focus-visible:ring-red-500"
                          : "focus-visible:ring-sl-blue"
                      }`}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && (
                      <p
                        id="email-error"
                        role="alert"
                        className="text-[13px] font-medium text-red-500 mt-1"
                      >
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {errorMessage && (
                    <div
                      role="alert"
                      className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-900/50 flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 font-bold bg-sl-blue hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>
              </CardContent>

              <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sl-blue transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
