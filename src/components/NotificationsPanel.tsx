import { useEffect, useState } from "react";
import { AlertTriangle, Bell, BellOff, MapPin, RefreshCcw, X } from "lucide-react";
import type { Issue } from "../models/issue";
import "./NotificationsPanel.css";

interface Notification {
  id: string;
  type: "new_report" | "status_change" | "high_priority";
  title: string;
  message: string;
  issueId: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsPanelProps {
  issues: Issue[];
  realtimeNotifications?: Notification[];
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "new_report":
      return <MapPin size={16} color="var(--color-primary)" />;
    case "status_change":
      return <RefreshCcw size={16} color="var(--color-primary)" />;
    case "high_priority":
      return <AlertTriangle size={16} color="#dc2626" />;
    default:
      return <Bell size={16} color="var(--color-text-muted)" />;
  }
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPanel({ issues, realtimeNotifications = [] }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const recentIssues = issues.filter(
      (i) => new Date(i.createdAt) > lastHour
    );

    if (recentIssues.length > 0) {
      const newNotifications = recentIssues.map((issue) => ({
        id: `notif-${issue.id}`,
        type: "new_report" as const,
        title: "New Report Submitted",
        message: `${issue.category} issue reported at ${issue.address || "unknown location"}`,
        issueId: issue.id,
        timestamp: new Date(issue.createdAt),
        read: false,
      }));

      setNotifications((prev) => [
        ...newNotifications,
        ...prev.filter((n) => !newNotifications.find((nn) => nn.issueId === n.issueId)),
      ]);
    }
  }, [issues]);

  useEffect(() => {
    if (realtimeNotifications.length === 0) return;

    setNotifications((prev) => {
      const next = [...realtimeNotifications, ...prev];
      const deduped = new Map<string, Notification>();

      for (const notification of next) {
        if (!deduped.has(notification.id)) {
          deduped.set(notification.id, notification);
        }
      }

      return Array.from(deduped.values());
    });
  }, [realtimeNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="notifications-panel">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
      >
        <Bell size={18} color="var(--color-text-secondary)" />
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="close-btn"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="empty-state">
                <BellOff size={28} color="var(--color-text-muted)" strokeWidth={1.5} />
                No notifications
              </p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.type}${!notif.read ? " unread" : ""}`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </span>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {formatRelativeTime(notif.timestamp)}
                    </div>
                  </div>
                  <button
                    className="dismiss-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(notif.id);
                    }}
                    aria-label="Dismiss notification"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
