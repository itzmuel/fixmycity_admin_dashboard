import { useEffect, useMemo, useState } from "react";
import {
  getNotificationEvents,
  retryNotificationEvent,
  subscribeToNotificationEvents,
  type NotificationEvent,
  type NotificationEventStatus,
} from "../services/issueService";

type FilterStatus = "all" | NotificationEventStatus;

function statusBadgeStyles(status: NotificationEventStatus): { color: string; background: string } {
  if (status === "pending") return { color: "#92400e", background: "#fffbeb" };
  if (status === "sent") return { color: "#166534", background: "#dcfce7" };
  return { color: "#7f1d1d", background: "#fee2e2" };
}

function upsertEvent(previous: NotificationEvent[], incoming: NotificationEvent): NotificationEvent[] {
  const exists = previous.some((event) => event.id === incoming.id);
  const next = exists ? previous.map((event) => (event.id === incoming.id ? incoming : event)) : [incoming, ...previous];
  return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default function NotificationsQueuePage() {
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveSyncConnected, setLiveSyncConnected] = useState(false);

  useEffect(() => {
    let alive = true;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getNotificationEvents();
        if (!alive) return;
        setEvents(data);
      } catch (loadError) {
        if (!alive) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load notification queue.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToNotificationEvents((event) => {
      setLiveSyncConnected(true);

      if (event.eventType === "DELETE" && event.eventId != null) {
        setEvents((previous) => previous.filter((existing) => existing.id !== event.eventId));
        return;
      }

      if (!event.event) return;
      setEvents((previous) => upsertEvent(previous, event.event as NotificationEvent));
    });

    if (!unsubscribe) {
      setLiveSyncConnected(false);
      return;
    }

    return () => {
      unsubscribe();
      setLiveSyncConnected(false);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (filter === "all") return events;
    return events.filter((event) => event.status === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    const pending = events.filter((event) => event.status === "pending").length;
    const sent = events.filter((event) => event.status === "sent").length;
    const failed = events.filter((event) => event.status === "failed").length;
    return { pending, sent, failed, all: events.length };
  }, [events]);

  async function handleRetry(eventId: number) {
    try {
      setRetrying(eventId);
      setError(null);
      await retryNotificationEvent(eventId);
      setEvents((previous) =>
        previous.map((event) =>
          event.id === eventId
            ? {
                ...event,
                status: "pending",
                processedAt: undefined,
              }
            : event
        )
      );
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Retry failed.");
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card card-pad" style={{ display: "grid", gap: 8 }}>
        <div className="h1">Notification Queue</div>
        <div className="muted">Monitor pending, sent, and failed delivery events for status emails/push.</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: liveSyncConnected ? "#166534" : "#92400e" }}>
          {liveSyncConnected ? "Live queue sync connected" : "Live queue sync unavailable"}
        </div>
      </div>

      <div className="card card-pad" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className={`pill ${filter === "all" ? "pill-active" : ""}`} onClick={() => setFilter("all")}>
          All ({counts.all})
        </button>
        <button type="button" className={`pill ${filter === "pending" ? "pill-active" : ""}`} onClick={() => setFilter("pending")}>
          Pending ({counts.pending})
        </button>
        <button type="button" className={`pill ${filter === "sent" ? "pill-active" : ""}`} onClick={() => setFilter("sent")}>
          Sent ({counts.sent})
        </button>
        <button type="button" className={`pill ${filter === "failed" ? "pill-active" : ""}`} onClick={() => setFilter("failed")}>
          Failed ({counts.failed})
        </button>
      </div>

      {error && (
        <div className="card card-pad" style={{ border: "1px solid #ef4444", color: "#ef4444", fontWeight: 700 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th className="th">Event ID</th>
              <th className="th">Issue ID</th>
              <th className="th">Type</th>
              <th className="th">Status</th>
              <th className="th">Created</th>
              <th className="th">Processed</th>
              <th className="th">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="td" colSpan={7}>
                  Loading queue...
                </td>
              </tr>
            )}

            {!loading && filteredEvents.length === 0 && (
              <tr>
                <td className="td muted" colSpan={7}>
                  No notification events for this filter.
                </td>
              </tr>
            )}

            {!loading &&
              filteredEvents.map((event) => {
                const badge = statusBadgeStyles(event.status);
                return (
                  <tr key={event.id}>
                    <td className="td" style={{ fontWeight: 800 }}>{event.id}</td>
                    <td className="td">{event.issueId}</td>
                    <td className="td">{event.eventType}</td>
                    <td className="td">
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          color: badge.color,
                          background: badge.background,
                        }}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="td">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="td">{event.processedAt ? new Date(event.processedAt).toLocaleString() : "-"}</td>
                    <td className="td">
                      {event.status === "failed" ? (
                        <button
                          type="button"
                          className="btn"
                          disabled={retrying === event.id}
                          onClick={() => void handleRetry(event.id)}
                        >
                          {retrying === event.id ? "Retrying..." : "Retry"}
                        </button>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
