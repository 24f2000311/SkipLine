"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import Link from "next/link";
import { LogOut, CalendarDays, LayoutDashboard, Menu, X, User } from "lucide-react";
import { SkiplineLogo } from "@/components/skipline-logo";
import { Button } from "@/components/ui/button";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { accessToken, user, clearAuth } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    if (!accessToken) {
      router.push("/login");
    }
  }, [accessToken, router]);

  // Close menus when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  // Close user menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isMounted || !accessToken) {
    return null; // Prevent hydration mismatch and hide protected content
  }

  const handleLogout = async () => {
    try {
      const { refreshToken } = useAuthStore.getState();
      if (refreshToken) {
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

  const navLinks = [
    { name: "Dashboard", href: "/organizer/dashboard", icon: LayoutDashboard },
    { name: "Create Event", href: "/organizer/events/new", icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="border-b border-border bg-card shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Left side: Logo & Desktop Nav */}
            <div className="flex items-center gap-8">
              <Link href="/organizer/dashboard" aria-label="Skipline Dashboard">
                <SkiplineLogo size="sm" />
              </Link>
              
              <div className="hidden md:flex gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link 
                      key={link.href}
                      href={link.href} 
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-micro ${
                        isActive 
                          ? "bg-muted text-foreground" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side: User & Mobile Toggle */}
            <div className="flex items-center gap-2">
              {/* Desktop User Menu */}
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-micro focus:outline-none focus:ring-2 focus:ring-sl-blue"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-sl-blue text-white flex items-center justify-center font-bold text-xs uppercase">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.name}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-1 animate-sl-fade-in origin-top-right">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-sl-error hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-micro"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <div className="md:hidden flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-expanded={isMobileMenuOpen}
                  aria-label="Toggle mobile menu"
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card animate-sl-fade-in shadow-md absolute w-full left-0">
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg transition-micro ${
                      isActive 
                        ? "bg-muted text-foreground" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <link.icon className="h-5 w-5" />
                    {link.name}
                  </Link>
                );
              })}
              
              <div className="pt-4 mt-2 border-t border-border">
                <div className="px-3 flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-sl-blue text-white flex items-center justify-center font-bold text-sm uppercase">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-3 text-base font-medium rounded-lg text-sl-error hover:bg-red-50 dark:hover:bg-red-900/20 transition-micro"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Standardized main layout framing */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
