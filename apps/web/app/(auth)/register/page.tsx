"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@/features/auth/hooks/useRegister";
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
import { Eye, EyeOff, Loader2, MailCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { authApi } from "@/lib/api/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { mutate: registerOrganizer, isPending } = useRegister();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormValues) => {
    setServerError(null);
    registerOrganizer(data, {
      onError: (err: any) => {
        const errorMsg =
          err?.response?.data?.error?.message ||
          err?.message ||
          "Registration failed. Please check your details and try again.";
        setServerError(errorMsg);
      },
    });
  };

  const handleResend = async () => {
    if (!registeredEmail || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await authApi.resendVerification(registeredEmail);
      setResendStatus({
        type: "success",
        message: "Verification email resent! Please check your inbox and spam folder.",
      });
    } catch (err: any) {
      setResendStatus({
        type: "error",
        message:
          err?.response?.data?.error?.message ||
          "Could not resend verification email. Please try again in a few minutes.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-background p-4 sm:p-8 animate-sl-fade-in">
      <div className="w-full max-w-md flex flex-col items-center">
        
        {/* Logo Section */}
        <Link href="/" className="mb-8 hover:opacity-90 transition-opacity">
          <SkiplineLogo size="lg" />
        </Link>

        {registeredEmail ? (
          /* ================= VERIFICATION SENT STATE ================= */
          <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 animate-sl-fade-in">
            <CardHeader className="space-y-3 text-center pt-8 pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-sl-blue rounded-full flex items-center justify-center mb-1">
                <MailCheck className="w-8 h-8 text-sl-blue" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Check your email
              </CardTitle>
              <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Check your email to verify your Skipline account.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 pt-2 space-y-5 text-center">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sent to</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">
                  {registeredEmail}
                </p>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Click the confirmation link in the email to activate full organizer features. The link is valid for 24 hours.
              </p>

              {resendStatus && (
                <div
                  role="alert"
                  className={`p-3 text-sm font-medium rounded-xl flex items-center justify-center gap-2 ${
                    resendStatus.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
                      : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50"
                  }`}
                >
                  {resendStatus.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{resendStatus.message}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full h-11 font-semibold rounded-lg border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending email...
                    </>
                  ) : (
                    "Resend verification email"
                  )}
                </Button>

                <Link href="/organizer/dashboard" className="block w-full">
                  <Button
                    type="button"
                    className="w-full h-11 font-bold bg-sl-blue hover:bg-blue-700 text-white rounded-lg shadow-sm"
                  >
                    Continue to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>

            <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Wrong email address?{" "}
                <button
                  type="button"
                  onClick={() => setRegisteredEmail(null)}
                  className="text-sl-blue hover:underline font-semibold"
                >
                  Register with another email
                </button>
              </p>
            </div>
          </Card>
        ) : (
          <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="space-y-2 text-center pt-8 pb-4">
            <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Create your organizer account
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Start creating queues for your next event.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 pt-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              {/* Name Field */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="John Doe"
                  {...register("name")}
                  className={`h-11 ${errors.name ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" role="alert" className="text-[13px] font-medium text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  className={`h-11 ${errors.email ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="text-[13px] font-medium text-red-500 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("password")}
                    className={`h-11 pr-10 ${errors.password ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-sl-blue"}`}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sl-blue rounded-full p-1"
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
              
              {/* Server Error Alert */}
              {serverError && (
                <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg border border-red-100 dark:border-red-900/50 flex items-center">
                  {serverError}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-11 font-bold bg-sl-blue hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </CardContent>
          
          {/* Footer Link */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 text-center">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-sl-blue hover:text-blue-700 dark:hover:text-blue-400 hover:underline transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
        )}

      </div>
    </div>
  );
}
