import { useEffect, useRef } from "react";
import { useCustomerStore } from "../stores/useCustomerStore";

// Web Audio API based simple syntheizer
const playTone = (type: "calm" | "urgent") => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "calm") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = "square";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      
      let time = ctx.currentTime;
      for(let i=0; i<10; i++) {
        osc.frequency.setValueAtTime(600, time);
        osc.frequency.setValueAtTime(800, time + 0.1);
        time += 0.2;
      }
      
      osc.start();
      osc.stop(time);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export const useCustomerNotifications = (queueId: string, status: any) => {
  const entryState = useCustomerStore((state) => (state?.entries ? state.entries[queueId] : undefined));
  const updateNotificationState = useCustomerStore((state) => state?.updateNotificationState);

  useEffect(() => {
    if (!status || !entryState) return;

    const currentStatus = status.entry.status;
    const position = status.position;

    const currentCallCount = typeof status.entry.callCount === "number" 
      ? status.entry.callCount 
      : (status.entry.calledAt ? 1 : 0);

    // If customer returned to WAITING (e.g. after No-Show), re-arm proximity flags
    if (currentStatus === "WAITING") {
      if (entryState.notifiedCalled) {
        updateNotificationState(queueId, {
          notifiedCalled: false,
          notified1Ahead: false,
          notified3Ahead: false,
        });
      }

      // Notification 1: ~3 ahead (position 4)
      if (position <= 4 && position > 2 && !entryState.notified3Ahead) {
        updateNotificationState(queueId, { notified3Ahead: true });
        playTone("calm");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("You're getting closer", { body: "About 3 people ahead of you." });
        }
      }

      // Notification 2: ~1 ahead (position 2)
      if (position <= 2 && position > 0 && !entryState.notified1Ahead) {
        updateNotificationState(queueId, { notified1Ahead: true });
        playTone("calm");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("You're almost up", { body: "About 1 person ahead of you." });
        }
      }
    }

    // Notification 3: Called (Their turn) — authoritative by callCount
    if (currentStatus === "CALLED") {
      const isNewCallCycle = currentCallCount > 0 && currentCallCount !== entryState.lastNotifiedCallCount;

      if (isNewCallCycle) {
        updateNotificationState(queueId, {
          lastNotifiedCallCount: currentCallCount,
          notifiedCalled: true,
          acknowledgedCalled: false,
          acknowledgedCallCount: undefined,
        });
        playTone("urgent");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("You're up!", { body: "Please proceed to the desk immediately." });
        }
      }
    }
  }, [status, entryState, queueId, updateNotificationState]);
};
