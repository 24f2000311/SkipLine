import type { Metadata } from "next";
import { getApiUrl, getCustomerQueueUrl } from "@/lib/url";

interface QueueLayoutProps {
  children: React.ReactNode;
  params: Promise<{ queueId: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ queueId: string }>;
}): Promise<Metadata> {
  const { queueId } = await params;
  const canonicalUrl = getCustomerQueueUrl(queueId);

  let title = "Join Queue | Skipline";
  let description = "Join the live virtual queue on Skipline. Track your place in line in real time.";
  let queueName = "";
  let eventName = "";

  try {
    const res = await fetch(`${getApiUrl()}/queues/${encodeURIComponent(queueId)}/public`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) {
        queueName = json.data.name || "";
        eventName = json.data.event?.name || "";
        if (queueName && eventName) {
          title = `Join ${queueName} - ${eventName} | Skipline`;
          description = `Join the ${queueName} queue for ${eventName} on Skipline. Track your spot in real time without standing in line.`;
        } else if (queueName) {
          title = `Join ${queueName} | Skipline`;
          description = `Join the ${queueName} queue on Skipline. Track your spot in real time.`;
        }
      }
    }
  } catch {
    // If metadata fetch fails, the customer queue page itself must still work normally
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Skipline",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function QueueLayout({ children }: QueueLayoutProps) {
  return <>{children}</>;
}
