"use client";

import { useState, useRef } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Download,
  Printer,
  Share2,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { getCustomerQueueUrl, getGoogleMapsUrl } from "@/lib/url";

interface ShareQrDialogProps {
  queueId: string;
  queueName: string;
  queueDescription?: string | null;
  event?: {
    name?: string;
    description?: string | null;
    venue?: string | null;
    venueMapUrl?: string | null;
    startAt?: string | Date;
    endAt?: string | Date;
  } | null;
}

export function ShareQrDialog({
  queueId,
  queueName,
  queueDescription,
  event,
}: ShareQrDialogProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Single centralized canonical customer URL builder
  const customerUrl = getCustomerQueueUrl(queueId);

  const mapsUrl = event?.venue
    ? getGoogleMapsUrl({
        venue: event.venue,
        venueMapUrl: event.venueMapUrl,
      })
    : null;

  const formatEventDateTime = () => {
    if (!event?.startAt) return null;
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : null;
    const dateStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const startTimeStr = start.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const endTimeStr = end
      ? end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : null;

    return {
      date: dateStr,
      time: endTimeStr ? `${startTimeStr} – ${endTimeStr}` : startTimeStr,
    };
  };

  const dateTime = formatEventDateTime();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(customerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleShare = async () => {
    const shareText = `Join the ${queueName} queue on Skipline:`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${queueName} | Skipline`,
          text: shareText,
          url: customerUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await copyToClipboard();
    }
  };

  const handleDownloadPoster = async () => {
    try {
      setIsExporting(true);

      const qrContainer = document.getElementById(`qr-poster-svg-${queueId}`);
      const svgEl = qrContainer?.querySelector("svg");
      if (!svgEl) {
        throw new Error("QR SVG not found");
      }

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";

      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = reject;
          qrImg.src = blobURL;
        }),
        new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve(); // fallback gracefully if logo fails
          logoImg.src = "/icon.png";
        }),
      ]);

      // Canvas dimensions for 2x high resolution (1200 x 1650)
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1650;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      // Deep Navy / Dark Blue Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1650);
      bgGrad.addColorStop(0, "#060913");
      bgGrad.addColorStop(0.3, "#0a1128");
      bgGrad.addColorStop(0.7, "#0d1838");
      bgGrad.addColorStop(1, "#070b16");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 1650);

      // Subtle ambient brand glow
      const glowGrad = ctx.createRadialGradient(960, 280, 40, 960, 280, 500);
      glowGrad.addColorStop(0, "rgba(24, 104, 248, 0.28)");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 1200, 1650);

      // Outer Frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 3;
      ctx.strokeRect(50, 50, 1100, 1550);

      // 1. BRAND HEADER
      if (logoImg.width > 0) {
        ctx.drawImage(logoImg, 80, 80, 60, 60);
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px system-ui, sans-serif";
      ctx.fillText("Skipline", 155, 125);

      ctx.fillStyle = "#1868F8";
      ctx.beginPath();
      ctx.arc(310, 122, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "700 14px system-ui, sans-serif";
      ctx.fillText("OFFICIAL QUEUE SIGNAGE", 157, 150);

      // Right pill on header
      ctx.fillStyle = "rgba(24, 104, 248, 0.15)";
      ctx.beginPath();
      ctx.roundRect(860, 85, 260, 40, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(24, 104, 248, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#60a5fa";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SMART VIRTUAL QUEUE", 990, 110);
      ctx.textAlign = "left";

      // 2. EVENT INFORMATION CARD
      let y = 200;
      if (event?.name) {
        const cardX = 80;
        const cardW = 1040;
        const cardH = 220;

        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.beginPath();
        ctx.roundRect(cardX, y, cardW, cardH, 20);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 15px system-ui, sans-serif";
        ctx.fillText("EVENT", cardX + 30, y + 40);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px system-ui, sans-serif";
        const truncatedEvent =
          event.name.length > 40 ? event.name.slice(0, 40) + "..." : event.name;
        ctx.fillText(truncatedEvent, cardX + 30, y + 85);

        if (event.description) {
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "500 18px system-ui, sans-serif";
          const truncatedDesc =
            event.description.length > 70
              ? event.description.slice(0, 70) + "..."
              : event.description;
          ctx.fillText(truncatedDesc, cardX + 30, y + 120);
        }

        // Details bottom row in event card
        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 18px system-ui, sans-serif";
        let detailX = cardX + 30;
        if (event.venue) {
          const truncatedVenue =
            event.venue.length > 32
              ? event.venue.slice(0, 32) + "..."
              : event.venue;
          ctx.fillText(`📍 ${truncatedVenue}`, detailX, y + 180);
          detailX += 450;
        }

        if (dateTime) {
          ctx.fillText(`📅 ${dateTime.date} • ${dateTime.time}`, detailX, y + 180);
        }

        y += cardH + 40;
      } else {
        y += 40;
      }

      // 3. QUEUE SECTION HEADER
      ctx.textAlign = "center";
      ctx.fillStyle = "#38bdf8";
      ctx.font = "800 18px system-ui, sans-serif";
      ctx.fillText("SCAN TO JOIN THE QUEUE", 600, y);

      y += 50;
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 52px system-ui, sans-serif";
      const displayQueueName = queueName ? `"${queueName}"` : "Queue";
      ctx.fillText(displayQueueName, 600, y);

      if (queueDescription) {
        y += 35;
        ctx.fillStyle = "#94a3b8";
        ctx.font = "500 20px system-ui, sans-serif";
        const truncatedQDesc =
          queueDescription.length > 60
            ? queueDescription.slice(0, 60) + "..."
            : queueDescription;
        ctx.fillText(truncatedQDesc, 600, y);
      }

      // 4. WHITE QR CODE BOX
      const qrBoxSize = 510;
      const qrBoxX = (1200 - qrBoxSize) / 2;
      const qrBoxY = y + 40;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
      ctx.fill();

      // Draw QR Image onto canvas
      const qrPadding = 35;
      ctx.drawImage(
        qrImg,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2
      );

      // Embedded Flow Logo in center of QR code
      if (logoImg.width > 0) {
        const centerSize = 92;
        const centerX = qrBoxX + (qrBoxSize - centerSize) / 2;
        const centerY = qrBoxY + (qrBoxSize - centerSize) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(centerX, centerY, centerSize, centerSize, 18);
        ctx.fill();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 3;
        ctx.stroke();

        const iconSize = 64;
        ctx.drawImage(
          logoImg,
          centerX + (centerSize - iconSize) / 2,
          centerY + (centerSize - iconSize) / 2,
          iconSize,
          iconSize
        );
      }

      // 5. INSTRUCTIONS BELOW QR
      const instructY = qrBoxY + qrBoxSize + 60;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText("Point your phone camera to join instantly", 600, instructY);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 20px system-ui, sans-serif";
      ctx.fillText(
        "No app download required • Real-time wait estimates • Turn alerts",
        600,
        instructY + 36
      );

      // 6. CANONICAL URL PILL
      const urlBoxW = 760;
      const urlBoxH = 50;
      const urlBoxX = (1200 - urlBoxW) / 2;
      const urlBoxY = instructY + 70;

      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.roundRect(urlBoxX, urlBoxY, urlBoxW, urlBoxH, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#67e8f9";
      ctx.font = "bold 21px monospace";
      ctx.fillText(customerUrl, 600, urlBoxY + 33);

      // 7. FOOTER
      ctx.fillStyle = "#64748b";
      ctx.font = "500 16px system-ui, sans-serif";
      ctx.fillText(
        "Powered by Skipline • Join the queue, not the crowd.",
        600,
        1560
      );

      ctx.textAlign = "left"; // reset alignment

      // Trigger download
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      const safeQueueName = (queueName || "queue")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      a.download = `skipline-${safeQueueName}-poster.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobURL);
    } catch (err) {
      console.error("Poster export failed:", err);
      alert("Poster export failed. Please try printing or copying the URL.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    `Join the ${queueName} queue on Skipline: ${customerUrl}`
  )}`;

  return (
    <>
      <Dialog>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              className="gap-2 font-bold shadow-xs h-10 border-input hover:bg-muted/80 flex-1 md:flex-none"
            />
          }
        >
          <QrCode className="h-4 w-4 text-muted-foreground" /> Share Queue
        </DialogTrigger>
        <DialogContent 
          className="sm:max-w-2xl p-0 overflow-hidden border-border rounded-2xl gap-0 max-h-[94vh] flex flex-col"
        >
          {/* Top Header */}
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground">
                  Share & Printable QR Poster
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Distribute the public customer entry point or print registration signage.
                </DialogDescription>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-sl-blue border border-blue-500/20">
                Public URL Only
              </span>
            </div>
          </DialogHeader>

          {/* Scrollable Content Area */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* BRANDED POSTER PREVIEW (Printable & Downloadable) */}
            <div
              ref={posterRef}
              id={`poster-print-area-${queueId}`}
              className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-[#060913] via-[#0A1128] to-[#070B16] text-white shadow-2xl border border-white/10 flex flex-col items-center overflow-hidden print:shadow-none print:border-none print:p-8 print:w-full print:m-0"
            >
              {/* Subtle ambient lighting */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

              {/* 1. Brand Header */}
              <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <img
                    src="/icon.png"
                    alt="Skipline"
                    className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow"
                  />
                  <div className="text-left">
                    <div className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center">
                      Skipline
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1868F8] ml-1"></span>
                    </div>
                    <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.08em]">
                      Official Queue Signage
                    </div>
                  </div>
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold">
                  <Sparkles className="h-3 w-3" />
                  Smart Virtual Queue
                </div>
              </div>

              {/* 2. Event Information Card */}
              {event?.name && (
                <div className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-left mb-4 space-y-1.5 relative z-10 backdrop-blur-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Official Event
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white leading-snug break-words">
                    {event.name}
                  </h4>
                  {event.description && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
                      {event.description}
                    </p>
                  )}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-slate-400">
                    {event.venue && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="font-semibold text-slate-200">
                          {event.venue}
                        </span>
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-0.5 ml-1 print:text-slate-800"
                          >
                            View on Google Maps{" "}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                    {dateTime && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span>
                          {dateTime.date} • {dateTime.time}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Queue Headline */}
              <div className="w-full text-center space-y-1 mb-4 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold uppercase tracking-wider">
                  Queue Entry Point
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words px-2">
                  {queueName ? `"${queueName}"` : "Join the Queue"}
                </h3>
                {queueDescription && (
                  <p className="text-xs text-slate-300 max-w-md mx-auto line-clamp-2 px-2 leading-relaxed">
                    {queueDescription}
                  </p>
                )}
              </div>

              {/* 4. High-contrast QR Container with Centered Skipline Logo */}
              <div
                id={`qr-poster-svg-${queueId}`}
                className="relative bg-white p-4 sm:p-5 rounded-2xl shadow-2xl border-4 border-white/20 mb-4 transition-transform hover:scale-[1.01] z-10"
              >
                <QRCode
                  value={customerUrl}
                  size={200}
                  level="H"
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                  className="w-44 h-44 sm:w-48 sm:h-48"
                />
                {/* Centered Flow Logo Overlay (Safe 4.5% occlusion with Level H QR) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11 h-11 bg-white rounded-xl shadow-md border-2 border-slate-100 flex items-center justify-center p-1.5">
                    <img
                      src="/icon.png"
                      alt="Skipline"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* 5. Instructions & Value Messaging */}
              <div className="space-y-1 relative z-10 max-w-md text-center px-4">
                <p className="text-sm font-extrabold text-white">
                  Scan with your phone camera to join the line
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  No app download needed • Live wait times • Instant turn alerts
                </p>
                <div className="pt-1.5">
                  <span className="inline-block px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-blue-300 font-mono text-[11px] sm:text-xs break-all select-all">
                    {customerUrl}
                  </span>
                </div>
              </div>

              {/* 6. Footer Branding */}
              <div className="w-full mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500 relative z-10">
                <div className="flex items-center gap-1.5">
                  <img
                    src="/icon.png"
                    alt=""
                    className="w-3.5 h-3.5 object-contain opacity-75"
                  />
                  <span>
                    Powered by <strong className="text-slate-400">Skipline</strong>
                  </span>
                </div>
                <span>Join the queue, not the crowd.</span>
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Button
                variant="outline"
                onClick={handleDownloadPoster}
                disabled={isExporting}
                className="gap-2 font-bold h-11 border-border shadow-xs hover:bg-muted/80 text-foreground"
              >
                <Download className="h-4 w-4 text-sl-blue" />
                {isExporting ? "Rendering..." : "Download Poster"}
              </Button>

              <Button
                variant="outline"
                onClick={handlePrint}
                className="gap-2 font-bold h-11 border-border shadow-xs hover:bg-muted/80 text-foreground"
              >
                <Printer className="h-4 w-4 text-slate-500" />
                Print Signage
              </Button>

              <Button
                variant="outline"
                onClick={handleShare}
                className="gap-2 font-bold h-11 border-border shadow-xs hover:bg-muted/80 text-foreground"
              >
                <Share2 className="h-4 w-4 text-emerald-600" />
                Share Link
              </Button>
            </div>

            {/* URL & DIRECT ACCESS */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Public Customer URL
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 h-10 px-3.5 bg-muted/60 dark:bg-muted/30 rounded-lg border border-input flex items-center text-xs font-mono text-muted-foreground select-all overflow-hidden">
                  <span
                    className="truncate w-full block text-left"
                    title={customerUrl}
                  >
                    {customerUrl}
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="h-10 px-3 shrink-0 gap-1.5 font-semibold text-xs border-input shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Social Channels Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Share on WhatsApp
                </a>

                <Link
                  href={`/q/${queueId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Live Customer Page
                </Link>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only CSS to isolate the poster */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #poster-print-area-${queueId},
          #poster-print-area-${queueId} * {
            visibility: visible;
          }
          #poster-print-area-${queueId} {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 40px;
            background: #070b16 !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
