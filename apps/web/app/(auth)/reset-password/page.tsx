"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { authApi } from "@/lib/api/auth";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mb-1">
            <AlertCircle className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Missing Reset Token
          </CardTitle>
          <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
            This password reset link is invalid or incomplete.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please request a new password reset link from the forgot password page.
          </p>
          <Link href="/forgot-password" className="block w-full">
            <Button className="w-full h-11 font-bold bg-sl-blue hover:bg-blue-700 text-white rounded-lg shadow-sm">
              Request new link
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await authApi.resetPassword({
        token,
        password: data.password,
      });
      setIsSuccess(true);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        "Could not reset password. The link may have expired.";
      setServerError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-1">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Password updated!
          </CardTitle>
          <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Your Skipline account password has been changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-5 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            All previous sessions have been signed out. You can now sign in with your new password.
          </p>
          <Link href="/login" className="block w-full">
            <Button className="w-full h-11 font-bold bg-sl-blue hover:bg-blue-700 text-white rounded-lg shadow-sm">
              Sign in to Skipline
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
      <CardHeader className="space-y-2 text-center pt-8 pb-4">
        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Create new password
        </CardTitle>
        <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Enter your new password below.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-2">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              New password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("password")}
                className={`h-11 pr-10 ${
                  errors.password
                    ? "border-red-500 focus-visible:ring-red-500"
                    : "focus-visible:ring-sl-blue"
                }`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none rounded-full p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" role="alert" className="text-[13px] font-medium text-red-500 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Confirm new password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                className={`h-11 pr-10 ${
                  errors.confirmPassword
                    ? "border-red-500 focus-visible:ring-red-500"
                    : "focus-visible:ring-sl-blue"
                }`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none rounded-full p-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p
                id="confirmPassword-error"
                role="alert"
                className="text-[13px] font-medium text-red-500 mt-1"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-900/50 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
              <Link
                href="/forgot-password"
                className="text-xs text-sl-blue underline font-semibold mt-1 self-start"
              >
                Request a new reset link
              </Link>
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
                Updating password...
              </>
            ) : (
              "Update password"
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
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background p-4 sm:p-8 animate-sl-fade-in">
      <div className="w-full max-w-md flex flex-col items-center">
        <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
          <SkiplineLogo size="lg" />
        </Link>
        <Suspense
          fallback={
            <Card className="w-full p-8 text-center bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-sl-blue" />
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
