"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { User, Mail, ShieldAlert, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteAccountDialog } from "@/features/auth/components/DeleteAccountDialog";

export default function OrganizerSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <div className="space-y-8 animate-sl-fade-in max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Manage your organizer profile, verification status, and account lifecycle.
        </p>
      </div>

      {/* Profile Overview Card */}
      <Card className="border-border shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-sl-blue" />
            Organizer Profile
          </CardTitle>
          <CardDescription>
            Your account credentials and email verification status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Full Name
              </span>
              <p className="text-base font-semibold text-foreground">
                {user?.name || "Organizer"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-base font-semibold text-foreground truncate">
                  {user?.email || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                Email Status:
              </span>
              {user?.emailVerifiedAt ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Unverified
                </span>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              Account Status: <span className="font-semibold text-foreground capitalize">{user?.status?.toLowerCase() || "active"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-red-200 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10 shadow-xs overflow-hidden">
        <div className="h-1 bg-red-600 w-full" />
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-slate-600 dark:text-slate-300">
            Irreversible actions that will permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-red-200/80 dark:border-red-900/40">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Delete Account
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Permanently delete your organizer account along with all events, queues, active participant
                sessions, customer queue entries, and analytics. Once deleted, this action cannot be undone.
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="font-bold bg-red-600 hover:bg-red-700 text-white shrink-0 shadow-xs transition-micro"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Destructive Confirmation Modal */}
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
