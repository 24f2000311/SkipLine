"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import Link from "next/link";
import { LogOut, CalendarDays, LayoutDashboard } from "lucide-react";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, user, clearAuth } = useAuthStore();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!accessToken) {
      router.push("/login");
    }
  }, [accessToken, router]);

  if (!isMounted || !accessToken) {
    return null; // Prevent hydration mismatch and hide protected content
  }

  const handleLogout = async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
        // We'll import authApi dynamically or just use fetch to avoid circular deps if any
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8123/api/v1"}/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (e) {
      // Ignore errors on logout
    } finally {
      clearAuth();
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <nav className="border-b bg-white dark:bg-zinc-900 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/organizer/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 bg-zinc-900 dark:bg-white rounded-md flex items-center justify-center">
                  <span className="text-white dark:text-zinc-900 font-bold tracking-tighter">SL</span>
                </div>
                <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">Skipline</span>
              </Link>
              
              <div className="hidden md:flex gap-4">
                <Link href="/organizer/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link href="/organizer/events/new" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <CalendarDays className="h-4 w-4" />
                  Create Event
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">Signed in as </span>
                <span className="font-semibold text-zinc-900 dark:text-white">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
