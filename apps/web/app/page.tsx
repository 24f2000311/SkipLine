"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SkiplineLogo } from "@/components/skipline-logo";
import { 
  ArrowRight, 
  Menu, 
  X, 
  QrCode, 
  UserPlus, 
  Footprints, 
  Bell, 
  Users, 
  CheckCircle2,
  Zap,
  MapPin,
  Calendar,
  Frown,
  XCircle,
  LayoutDashboard,
  Smartphone,
  GraduationCap,
  Store,
  Ticket
} from "lucide-react";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-background text-foreground font-sans overflow-x-hidden selection:bg-sl-blue/20">
      
      {/* --- NAVIGATION --- */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-background/90 backdrop-blur-md border-b border-border shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" aria-label="Skipline Home">
                <SkiplineLogo size="sm" />
              </Link>
            </div>

            {/* Desktop Nav Center */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#for-organizers" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                For Organizers
              </a>
              <a href="#for-customers" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                For Customers
              </a>
            </nav>

            {/* Desktop Nav Right */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/login" className="text-sm font-semibold text-foreground hover:text-sl-blue transition-colors">
                Log in
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-sl-blue text-white font-semibold text-sm hover:bg-blue-700 transition-standard shadow-sm">
                Create an Event
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-foreground p-2 -mr-2"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[100%] left-0 w-full bg-white dark:bg-background border-b border-border shadow-lg animate-sl-fade-in">
            <div className="px-4 py-6 flex flex-col gap-4">
              <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-foreground py-2 border-b border-border/50">
                How It Works
              </a>
              <a href="#for-organizers" onClick={() => setIsMobileMenuOpen(false)} className="text-base font-medium text-foreground py-2 border-b border-border/50">
                For Organizers
              </a>
              <Link href="/login" className="text-base font-medium text-foreground py-2 border-b border-border/50">
                Log in
              </Link>
              <Link href="/register" className="inline-flex items-center justify-center h-12 w-full mt-2 rounded-lg bg-sl-blue text-white font-semibold text-base shadow-sm">
                Create an Event
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="pt-24 md:pt-32 pb-20">
        
        {/* --- HERO SECTION --- */}
        <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
            
            {/* Hero Text */}
            <div className="flex flex-col space-y-6 text-center lg:text-left z-10 w-full lg:w-[50%]">
              <div className="inline-flex items-center mx-auto lg:mx-0 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-sl-blue text-xs font-bold tracking-wider uppercase border border-blue-100 dark:border-blue-800/50 w-max">
                For Events That Keep People Moving
              </div>
              
              <h1 className="text-5xl lg:text-[4rem] font-extrabold tracking-tight text-foreground leading-[1.05]">
                JOIN THE QUEUE.<br/>
                <span className="text-sl-blue">NOT THE CROWD.</span>
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                Skip the physical line. Join digitally, keep moving, and know exactly when it's your turn.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 justify-center lg:justify-start">
                <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-lg bg-sl-blue text-white font-bold text-base hover:bg-blue-700 hover:shadow-lg transition-all hover:-translate-y-0.5">
                  Create an Event
                </Link>
                <a href="#how-it-works" className="w-full sm:w-auto inline-flex items-center justify-center h-12 px-8 rounded-lg bg-white dark:bg-slate-800 text-foreground border border-border font-semibold text-base hover:bg-muted transition-colors shadow-sm">
                  See How It Works
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>

              {/* Quick Features */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-6 text-sm font-medium text-slate-500">
                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-sl-blue" /> Quick setup</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-sl-blue" /> No app for customers</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-sl-blue" /> Works for any event</div>
              </div>
            </div>

            {/* Hero Visual: Realistic Phone Mockup */}
            <div className="relative w-full lg:w-[45%] h-[500px] flex items-center justify-center lg:justify-end mt-10 lg:mt-0 hidden sm:flex">
              {/* Background abstract shape */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-blue-100 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/10 rounded-full blur-3xl -z-10" />

              {/* FLOATING STATUS CARDS */}
              {/* Left Card: QR */}
              <div className="absolute left-0 lg:-left-12 top-1/3 p-3 bg-white dark:bg-slate-800 border border-border shadow-xl rounded-2xl z-20 animate-[sl-float_4s_ease-in-out_infinite]">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 border border-slate-200 rounded-lg">
                    <QrCode className="h-10 w-10 text-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">Scan to Join</p>
                    <p className="text-[10px] text-muted-foreground">Join in seconds</p>
                  </div>
                </div>
              </div>

              {/* Right Card: You're up! */}
              <div className="absolute right-0 lg:-right-8 top-16 p-4 bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/50 shadow-xl rounded-2xl z-20 animate-[sl-float_5s_ease-in-out_infinite_reverse]">
                <div className="flex flex-col items-center gap-1">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full mb-1">You're Up!</span>
                  <p className="text-3xl font-black text-foreground tracking-tighter">A24</p>
                  <p className="text-[10px] font-medium text-muted-foreground text-center">Please proceed<br/>to the desk.</p>
                </div>
              </div>

              {/* Smaller floating tokens in background */}
              <div className="absolute right-12 bottom-24 p-2 px-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-border shadow-md rounded-xl z-0 scale-90">
                <p className="text-xs font-bold text-slate-400">A26 <span className="font-normal text-[10px]">Position 3</span></p>
              </div>
              <div className="absolute right-32 bottom-32 p-2 px-3 bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-border shadow-md rounded-xl z-0 scale-75">
                <p className="text-xs font-bold text-slate-400">A25 <span className="font-normal text-[10px]">Position 2</span></p>
              </div>

              {/* THE SMARTPHONE */}
              <div className="relative w-[260px] h-[520px] bg-slate-900 rounded-[2.5rem] border-[12px] border-slate-900 shadow-2xl overflow-hidden flex flex-col z-10 transform rotate-[-2deg]">
                {/* Screen */}
                <div className="w-full h-full bg-white dark:bg-slate-950 relative overflow-hidden flex flex-col">
                  {/* Dynamic Island */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-b-xl z-50" />
                  
                  {/* Status Bar */}
                  <div className="h-6 w-full flex justify-between items-center px-4 pt-1 text-[10px] font-medium text-slate-500">
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-2.5 bg-slate-500 rounded-sm" />
                    </div>
                  </div>

                  {/* App UI - Lifecycle Sequence */}
                  <div className="flex-1 flex flex-col items-center relative overflow-hidden bg-white dark:bg-slate-950">
                    
                    {/* Screen 1: SCAN */}
                    <div className="absolute inset-0 pt-8 pb-6 px-4 flex flex-col items-center animate-[sl-screen-1_12s_infinite]">
                      <SkiplineLogo size="sm" className="mb-8 scale-75 origin-top" />
                      <div className="w-full flex-1 flex flex-col items-center justify-center">
                        <div className="relative p-6 bg-slate-50 dark:bg-slate-900 border border-border rounded-3xl shadow-sm mb-6">
                          {/* Fake viewfinder corners */}
                          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-sl-blue rounded-tl-lg" />
                          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-sl-blue rounded-tr-lg" />
                          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-sl-blue rounded-bl-lg" />
                          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-sl-blue rounded-br-lg" />
                          
                          <QrCode className="h-24 w-24 text-foreground" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Scan QR Code</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Point camera to join queue</p>
                      </div>
                      {/* Fake dots indicator */}
                      <div className="mt-auto flex gap-1.5 pt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-sl-blue" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      </div>
                    </div>

                    {/* Screen 2: JOIN */}
                    <div className="absolute inset-0 pt-8 pb-6 px-4 flex flex-col items-center opacity-0 animate-[sl-screen-2_12s_infinite]">
                      <SkiplineLogo size="sm" className="mb-6 scale-75 origin-top" />
                      <div className="w-full flex-1 flex flex-col pt-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center mb-1">Tech Fest 2026</p>
                        <h2 className="text-2xl font-extrabold text-foreground text-center mb-6">Food Truck Line</h2>
                        
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-border space-y-4 mb-6">
                          <div className="flex justify-between text-sm font-bold">
                            <span>People waiting</span>
                            <span className="text-sl-blue">3</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>Est. time</span>
                            <span className="text-sl-blue">12 min</span>
                          </div>
                        </div>

                        <div className="w-full h-12 bg-sl-blue rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform scale-95 origin-center">
                          Join Queue
                        </div>
                      </div>
                      <div className="mt-auto flex gap-1.5 pt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-sl-blue" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      </div>
                    </div>

                    {/* Screen 3: MOVE */}
                    <div className="absolute inset-0 pt-8 pb-6 px-4 flex flex-col items-center opacity-0 animate-[sl-screen-3_12s_infinite]">
                      <SkiplineLogo size="sm" className="mb-6 scale-75 origin-top" />
                      <div className="w-full bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-3xl p-5 flex flex-col items-center shadow-sm relative overflow-hidden mb-4">
                        <p className="text-[10px] font-bold text-sl-blue uppercase tracking-wider mb-2">You're in the queue!</p>
                        <h2 className="text-6xl font-black text-sl-dark tracking-tighter mb-4">A27</h2>
                        <p className="text-sm font-bold text-foreground">Position 4</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">Est. wait ~ 12 min</p>

                        <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-100">
                          <div className="h-full bg-sl-blue w-1/4 rounded-r-full" />
                        </div>
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground px-2">
                        You can move freely. We'll notify you when it's your turn.
                      </p>
                      <div className="mt-auto flex gap-1.5 pt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <div className="w-1.5 h-1.5 rounded-full bg-sl-blue" />
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      </div>
                    </div>

                    {/* Screen 4: GET CALLED */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white opacity-0 animate-[sl-screen-4_12s_infinite] pt-6">
                      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full" />
                      
                      <Bell className="h-16 w-16 mb-6 animate-[sl-float_1s_ease-in-out_infinite]" />
                      <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                        It's your turn
                      </span>
                      <h2 className="text-6xl font-black tracking-tighter mb-2 text-white">A27</h2>
                      <p className="text-sm font-medium text-emerald-100 text-center px-6">
                        Please head to the counter to be served.
                      </p>
                      
                      <div className="mt-auto pb-8 flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Decorative flow line connecting the pieces */}
              <svg className="absolute w-[120%] h-40 bottom-10 -left-10 z-0 pointer-events-none text-blue-200 dark:text-blue-900/40" viewBox="0 0 500 100" fill="none" preserveAspectRatio="none">
                <path d="M0,80 C150,80 200,20 300,50 C400,80 450,40 500,40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
              </svg>

            </div>
            
          </div>
        </section>

        {/* --- HOW IT WORKS (COMPACT WORKFLOW) --- */}
        <section id="how-it-works" className="mt-12 mb-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-white dark:bg-slate-900 border border-border shadow-sm rounded-3xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div className="text-center md:text-left">
                  <h2 className="text-xs font-bold tracking-widest text-sl-blue uppercase mb-1">How It Works</h2>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-foreground">Four simple steps. Zero lines.</h3>
                </div>
                <a href="#" className="text-sm font-semibold text-sl-blue flex items-center hover:underline">
                  See it in action <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>

              <div className="flex flex-col md:flex-row justify-between relative">
                {/* Desktop connecting line */}
                <div className="hidden md:block absolute top-8 left-16 right-16 h-px bg-slate-200 dark:bg-slate-800" />
                
                {[
                  { step: "01", title: "Scan", desc: "Scan the event's QR code.", icon: QrCode },
                  { step: "02", title: "Join", desc: "Join the queue in seconds.", icon: UserPlus },
                  { step: "03", title: "Move", desc: "Walk around and enjoy the event.", icon: Footprints },
                  { step: "04", title: "Get Called", desc: "Return when it's your turn.", icon: Bell },
                ].map((s, i) => (
                  <div key={s.step} className="flex flex-col items-center text-center relative z-10 w-full md:w-1/4 px-2 mb-8 md:mb-0">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-sl-blue text-[10px] font-bold flex items-center justify-center border border-blue-100 dark:border-blue-800">
                        {s.step}
                      </span>
                      <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-border flex items-center justify-center transition-transform hover:-translate-y-1 hover:border-sl-blue text-foreground hover:text-sl-blue">
                        <s.icon className="h-6 w-6" />
                      </div>
                      {i < 3 && <ArrowRight className="hidden md:block absolute -right-3 top-8 text-slate-300 dark:text-slate-700 h-5 w-5 bg-white dark:bg-slate-900 px-1" />}
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-1">{s.title}</h4>
                    <p className="text-muted-foreground text-sm leading-snug">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* --- THE BIG DIFFERENCE (COMPACT COMPARISON) --- */}
        <section className="py-16 overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              
              {/* Old Way Card */}
              <div className="w-full lg:w-2/5 p-8 rounded-3xl bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-lg">The old way</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Standing in line. Wasting time.</p>
                  </div>
                  <Frown className="text-red-400 h-6 w-6" />
                </div>
                
                {/* Visual Crowd */}
                <div className="flex flex-wrap gap-1 mb-8 opacity-40">
                  {[...Array(11)].map((_, i) => <Users key={i} className="h-6 w-6 text-slate-400" />)}
                </div>

                <ul className="space-y-3">
                  {["Crowded and uncomfortable", "You can't leave the line", "Unpredictable wait times"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      <XCircle className="h-4 w-4 text-red-400" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Center Text */}
              <div className="w-full lg:w-1/5 text-center flex flex-col items-center">
                <h3 className="text-xl font-bold text-foreground mb-2">The difference is clear.</h3>
                <p className="text-sm text-muted-foreground">Your place is saved.<br/>You don't have to be.</p>
                <ArrowRight className="text-sl-blue h-6 w-6 mt-4 rotate-90 lg:rotate-0" />
              </div>

              {/* New Way Card */}
              <div className="w-full lg:w-2/5 p-8 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 relative">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-bold text-sl-blue text-lg">With Skipline</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Join digitally. Keep moving.</p>
                  </div>
                  <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                </div>
                
                {/* Visual Flow */}
                <div className="flex items-center gap-4 mb-8 text-emerald-600 dark:text-emerald-500">
                  <Footprints className="h-6 w-6 opacity-30" />
                  <Footprints className="h-6 w-6 opacity-60" />
                  <Footprints className="h-6 w-6 opacity-100" />
                </div>

                <ul className="space-y-3">
                  {["No physical crowding", "Move freely around the event", "Know exactly when it's your turn"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* --- ORGANIZER & CUSTOMER EXPERIENCES (COMPACT CARDS) --- */}
        <section id="for-organizers" className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Organizer Card */}
              <div className="bg-white dark:bg-slate-900 border border-border shadow-sm rounded-3xl p-8 md:p-10 flex flex-col justify-between h-full">
                <div className="mb-8">
                  <h2 className="text-xs font-bold tracking-widest text-sl-blue uppercase mb-2">For Organizers</h2>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">Total control, in minutes.</h3>
                  <p className="text-muted-foreground text-sm">
                    Create an event, generate a queue, and start managing in under 60 seconds. Call next, view live queue status, and keep things moving.
                  </p>
                  <Link href="/register" className="inline-flex items-center text-sm font-semibold text-sl-blue mt-4 hover:underline">
                    Learn more <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
                
                {/* Mini Organizer Dashboard UI */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-border p-4 w-full max-w-sm mx-auto shadow-sm">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                    <div className="flex items-center gap-2 font-bold text-sm"><Users className="h-4 w-4" /> Live Queue</div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">OPEN</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 border border-border rounded bg-white dark:bg-slate-900 shadow-sm">
                      <div>
                        <p className="font-bold text-sm">A24</p>
                        <p className="text-[10px] text-muted-foreground">Waiting: 2m</p>
                      </div>
                      <button className="px-3 py-1 bg-sl-blue text-white text-xs font-bold rounded">Call Next</button>
                    </div>
                    <div className="flex justify-between items-center p-2 border border-border rounded opacity-60">
                      <div>
                        <p className="font-bold text-sm">A25</p>
                        <p className="text-[10px] text-muted-foreground">Waiting: 5m</p>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">In Line</span>
                    </div>
                    <div className="flex justify-between items-center p-2 border border-border rounded opacity-40">
                      <div>
                        <p className="font-bold text-sm">A26</p>
                        <p className="text-[10px] text-muted-foreground">Waiting: 8m</p>
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">In Line</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Card */}
              <div id="for-customers" className="bg-white dark:bg-slate-900 border border-border shadow-sm rounded-3xl p-8 md:p-10 flex flex-col justify-between h-full">
                <div className="mb-8">
                  <h2 className="text-xs font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase mb-2">For Customers</h2>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">Join instantly. No app needed.</h3>
                  <p className="text-muted-foreground text-sm">
                    Scan the QR code, join the queue anonymously, and get real-time updates. Simple, fast, and stress-free.
                  </p>
                  <Link href="/" className="inline-flex items-center text-sm font-semibold text-sl-blue mt-4 hover:underline">
                    Learn more <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>

                {/* Mini Customer UI */}
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-border p-4 w-full max-w-[200px] mx-auto shadow-sm flex flex-col items-center text-center">
                  <div className="w-10 h-1 bg-slate-200 rounded-full mb-4" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase mb-1">You're Up!</span>
                  <h4 className="text-4xl font-black text-foreground mb-2">A24</h4>
                  <p className="text-[10px] text-muted-foreground mb-4">Please proceed<br/>to the desk.</p>
                  <div className="w-full h-8 bg-emerald-50 border border-emerald-100 rounded-md" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- BUILT FOR REAL EVENTS --- */}
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 border-y border-border py-6">
              <h4 className="text-sm font-bold text-foreground shrink-0">Built for real events</h4>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-sl-blue" /> College Fests</span>
                <span className="flex items-center gap-2"><Ticket className="h-4 w-4 text-sl-blue" /> Workshops</span>
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sl-blue" /> Exhibitions</span>
                <span className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4 text-sl-blue" /> Registrations</span>
                <span className="flex items-center gap-2"><Store className="h-4 w-4 text-sl-blue" /> Pop-up Shops</span>
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-sl-blue" /> Conferences</span>
              </div>
            </div>
          </div>
        </section>

        {/* --- FINAL CTA BANNER --- */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="bg-sl-blue rounded-[2rem] p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
              {/* Decorative shapes */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
              
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Ready to move people forward?</h2>
                <p className="text-blue-100 text-lg">Create your first event and experience a simpler way to manage queues.</p>
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 shrink-0">
                <Link href="/register" className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-white text-sl-blue font-bold text-base hover:bg-slate-50 transition-colors shadow-sm w-full sm:w-auto">
                  Create an Event
                </Link>
                <Link href="/login" className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-blue-700 text-white border border-blue-600 font-semibold text-base hover:bg-blue-800 transition-colors w-full sm:w-auto">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* --- POLISHED FOOTER --- */}
      <footer className="bg-white dark:bg-background border-t border-border pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
            
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <SkiplineLogo size="sm" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                Join the queue. Not the crowd.
              </p>
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap gap-x-12 gap-y-8">
              <div className="flex flex-col gap-3">
                <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground">How It Works</a>
                <a href="#for-organizers" className="text-sm font-medium text-muted-foreground hover:text-foreground">For Organizers</a>
                <a href="#for-customers" className="text-sm font-medium text-muted-foreground hover:text-foreground">For Customers</a>
              </div>
              <div className="flex flex-col gap-3">
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Log in</Link>
                <Link href="/register" className="text-sm font-medium text-muted-foreground hover:text-foreground">Create an Event</Link>
              </div>
            </div>

          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-border/50">
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
              <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Skipline. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Global CSS for subtle floating animations */}
      <style jsx global>{`
        @keyframes sl-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sl-screen-1 {
          0%, 20% { opacity: 1; transform: translateX(0); }
          25%, 100% { opacity: 0; transform: translateX(-20px); }
        }
        @keyframes sl-screen-2 {
          0%, 20% { opacity: 0; transform: translateX(20px); }
          25%, 45% { opacity: 1; transform: translateX(0); }
          50%, 100% { opacity: 0; transform: translateX(-20px); }
        }
        @keyframes sl-screen-3 {
          0%, 45% { opacity: 0; transform: translateX(20px); }
          50%, 70% { opacity: 1; transform: translateX(0); }
          75%, 100% { opacity: 0; transform: translateX(-20px); }
        }
        @keyframes sl-screen-4 {
          0%, 70% { opacity: 0; transform: translateX(20px); }
          75%, 95% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-20px); }
        }

        @media (prefers-reduced-motion) {
          .animate-\\[sl-float_4s_ease-in-out_infinite\\],
          .animate-\\[sl-float_5s_ease-in-out_infinite_reverse\\],
          .animate-\\[sl-float_1s_ease-in-out_infinite\\] {
            animation: none;
          }
          .animate-\\[sl-screen-1_12s_infinite\\],
          .animate-\\[sl-screen-2_12s_infinite\\],
          .animate-\\[sl-screen-4_12s_infinite\\] {
            display: none;
            animation: none;
          }
          .animate-\\[sl-screen-3_12s_infinite\\] {
            opacity: 1;
            transform: translateX(0);
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
