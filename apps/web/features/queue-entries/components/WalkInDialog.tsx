"use client";

import { useState } from "react";
import { useAddWalkIn } from "../hooks/useQueueEntries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";

interface WalkInDialogProps {
  queueId: string;
}

export function WalkInDialog({ queueId }: WalkInDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  
  const addWalkInMutation = useAddWalkIn();

  const handleAddWalkIn = async () => {
    try {
      await addWalkInMutation.mutateAsync({
        queueId,
        data: {
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          priority,
        },
      });
      
      // Reset form and close dialog
      setCustomerName("");
      setCustomerPhone("");
      setPriority("NORMAL");
      setOpen(false);
    } catch (error: any) {
      alert(error.response?.data?.error?.message || "An unexpected error occurred.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <div className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-sm font-bold shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-slate-900/50 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-sl-blue dark:text-blue-400" />
          Add Walk-in
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
          <DialogTitle className="text-xl font-extrabold text-foreground">Add Walk-in Participant</DialogTitle>
          <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Manually add a participant who arrived without scanning the QR code.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Name (Optional)</Label>
            <Input
              id="name"
              placeholder="e.g. John Doe"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-11 focus-visible:ring-sl-blue"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone (Optional)</Label>
            <Input
              id="phone"
              placeholder="e.g. +1 555-1234"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-11 focus-visible:ring-sl-blue"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val || "NORMAL")}>
              <SelectTrigger className="h-11 focus-visible:ring-sl-blue">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL" className="font-medium">Normal Queue</SelectItem>
                <SelectItem value="VIP" className="font-bold text-purple-600 dark:text-purple-400">VIP Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={addWalkInMutation.isPending} className="font-semibold text-slate-600 hover:text-slate-900">
            Cancel
          </Button>
          <Button onClick={handleAddWalkIn} disabled={addWalkInMutation.isPending} className="font-bold bg-sl-blue hover:bg-blue-700 text-white px-6">
            {addWalkInMutation.isPending ? "Adding..." : "Add Participant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
