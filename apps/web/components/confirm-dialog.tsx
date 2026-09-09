"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6 rounded-3xl">
        <DialogHeader className="mb-2">
          {variant === "destructive" && (
            <div className="mx-auto w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          <DialogTitle className={`text-xl font-bold ${variant === 'destructive' ? 'text-center' : ''}`}>
            {title}
          </DialogTitle>
          <DialogDescription className={`text-slate-500 font-medium ${variant === 'destructive' ? 'text-center' : ''} pt-2`}>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="w-full sm:flex-1 h-12 rounded-xl font-bold"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              if (!isPending) {
                onOpenChange(false);
              }
            }}
            disabled={isPending}
            className={`w-full sm:flex-1 h-12 rounded-xl font-bold shadow-sm ${
              variant === "destructive" 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "bg-sl-blue hover:bg-blue-700 text-white"
            }`}
          >
            {isPending ? "Confirming..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
