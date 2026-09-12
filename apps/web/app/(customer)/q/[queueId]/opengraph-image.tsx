import { ImageResponse } from "next/og";
import { getApiUrl } from "@/lib/url";

export const runtime = "nodejs";
export const alt = "Skipline Virtual Queue";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ queueId: string }> }) {
  const { queueId } = await params;
  let queueName = "Live";
  let eventName = "Skipline Event";

  try {
    const res = await fetch(`${getApiUrl()}/queues/${encodeURIComponent(queueId)}/public`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        if (json.data.name) queueName = json.data.name;
        if (json.data.event?.name) eventName = json.data.event.name;
      }
    }
  } catch {
    // Graceful fallback if API unavailable during render
  }

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #090d16 0%, #0d1527 50%, #0a0f1d 100%)",
          padding: "60px 80px",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          position: "relative",
        }}
      >
        {/* Glow decoration */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, transparent 70%)",
          }}
        />

        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(37, 99, 235, 0.4)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.5px", color: "#f8fafc" }}>
              Skipline
            </span>
            <span style={{ fontSize: "13px", color: "#94a3b8", letterSpacing: "1px", fontWeight: 600 }}>
              SMART VIRTUAL QUEUEING
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1020px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 16px",
              borderRadius: "9999px",
              background: "rgba(59, 130, 246, 0.15)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              color: "#60a5fa",
              fontSize: "17px",
              fontWeight: 600,
              width: "max-content",
            }}
          >
            Live Virtual Queue
          </div>

          <h1
            style={{
              fontSize: "58px",
              fontWeight: 800,
              lineHeight: 1.15,
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-1px",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            Join the {queueName} Queue
          </h1>

          <p
            style={{
              fontSize: "30px",
              color: "#94a3b8",
              margin: 0,
              fontWeight: 500,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {eventName}
          </p>
        </div>

        {/* Footer info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "24px",
          }}
        >
          <span style={{ fontSize: "20px", color: "#64748b" }}>
            Scan QR or tap link to track your place in real time • No app required
          </span>
          <span style={{ fontSize: "20px", color: "#60a5fa", fontWeight: 700 }}>
            Skipline
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
