"use client";

import { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check } from "lucide-react";

interface ShareQrDialogProps {
  queueId: string;
  queueName: string;
}

export function ShareQrDialog({ queueId, queueName }: ShareQrDialogProps) {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only access window.location on the client side
    setJoinUrl(`${window.location.origin}/q/${queueId}`);
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
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" /> Share QR
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{queueName}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
            {joinUrl && (
              <QRCode
                value={joinUrl}
                size={200}
                level="H"
                className="w-full h-auto"
              />
            )}
          </div>
          
          <p className="text-sm text-zinc-500">
            Customers can scan this QR code to join the line from their phones.
          </p>

          <div className="flex items-center w-full gap-2">
            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap bg-zinc-100 dark:bg-zinc-900 rounded-md p-3 text-sm text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800">
              {joinUrl}
            </div>
            <Button size="icon" onClick={copyToClipboard} variant="outline" className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
