"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ShareQrDialogProps {
  queueId: string;
  queueName: string;
}

export function ShareQrDialog({ queueId, queueName }: ShareQrDialogProps) {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    import("@/lib/url").then(({ getAppUrl }) => {
      setJoinUrl(`${getAppUrl()}/q/${queueId}`);
    });
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
      <DialogTrigger render={<Button variant="outline" className="gap-2 font-bold shadow-sm h-10 border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 flex-1 md:flex-none" />}>
        <QrCode className="h-4 w-4" /> Share Queue
      </DialogTrigger>
      <DialogContent className="sm:max-w-md text-center p-0 overflow-hidden border-slate-200 dark:border-slate-800 rounded-2xl">
        <DialogHeader className="pt-8 pb-4 px-6">
          <DialogTitle className="text-2xl font-extrabold text-foreground text-center tracking-tight">
            Share this queue
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-6 pt-0 space-y-6">
          <p className="text-sm font-medium text-slate-500 max-w-[280px]">
            Customers scan this QR code to join the line from their phones.
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-[280px] aspect-square flex items-center justify-center">
            {joinUrl && (
              <QRCode
                value={joinUrl}
                size={220}
                level="H"
                className="w-full h-auto"
              />
            )}
          </div>
          
          <div className="flex flex-col w-full gap-3 mt-4">
            <div className="flex items-center w-full gap-2">
              <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap bg-slate-50 dark:bg-slate-900 rounded-lg px-4 py-3 text-[13px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                {joinUrl}
              </div>
              <Button size="icon" onClick={copyToClipboard} variant="outline" className="shrink-0 h-[46px] w-[46px] rounded-lg border-slate-200 dark:border-slate-800 shadow-sm">
                {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5 text-slate-500" />}
              </Button>
            </div>
            
            <Link href={`/q/${queueId}`} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button variant="ghost" className="w-full gap-2 font-semibold text-sl-blue hover:bg-blue-50 dark:hover:bg-blue-900/20">
                Open Customer View <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
