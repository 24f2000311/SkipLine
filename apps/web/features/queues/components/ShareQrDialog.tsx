"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getAppUrl } from "@/lib/url";

interface ShareQrDialogProps {
  queueId: string;
  queueName: string;
}

export function ShareQrDialog({ queueId, queueName }: ShareQrDialogProps) {
  const [joinUrl, setJoinUrl] = useState(() => {
    if (typeof window !== "undefined") {
      return `${getAppUrl()}/q/${queueId}`;
    }
    return "";
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setJoinUrl(`${getAppUrl()}/q/${queueId}`);
  }, [queueId]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="gap-2 font-bold shadow-xs h-10 border-input hover:bg-muted/80 flex-1 md:flex-none" />}>
        <QrCode className="h-4 w-4 text-muted-foreground" /> Share Queue
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-6 border-border rounded-2xl gap-5">
        <DialogHeader className="text-center sm:text-center gap-1.5">
          <DialogTitle className="text-xl font-bold text-foreground text-center">
            Share {queueName ? `"${queueName}"` : "Queue"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground text-center max-w-xs mx-auto">
            Customers can scan this QR code or visit the link to join the queue directly.
          </DialogDescription>
        </DialogHeader>

        {/* QR Code Container - Centered and cleanly framed */}
        <div className="flex flex-col items-center justify-center py-1">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-center w-[220px] h-[220px] mx-auto transition-transform hover:scale-[1.02]">
            {joinUrl ? (
              <QRCode
                value={joinUrl}
                size={188}
                level="H"
                fgColor="#0f172a"
                bgColor="#ffffff"
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <QrCode className="h-14 w-14 animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* URL and Action Section */}
        <div className="flex flex-col gap-3 w-full min-w-0">
          {/* Copy Row */}
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="flex-1 min-w-0 h-10 px-3.5 bg-muted/60 dark:bg-muted/30 rounded-lg border border-input flex items-center text-xs font-mono text-muted-foreground select-all overflow-hidden">
              <span className="truncate w-full block text-left" title={joinUrl}>
                {joinUrl || "Generating link..."}
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
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Secondary Action */}
          <Link href={`/q/${queueId}`} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant="ghost" className="w-full h-9 gap-2 font-medium text-xs text-sl-blue hover:text-sl-blue/90 hover:bg-sl-blue/10 dark:hover:bg-sl-blue/20">
              Open Customer View <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
