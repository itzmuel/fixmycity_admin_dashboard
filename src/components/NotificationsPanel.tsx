import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
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

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_report":
        return "📍";
      case "status_change":
        return "🔄";
      case "high_priority":
        return "🚨";
      default:
        return "🔔";
    }
  };

  return (
    <div className="notifications-panel">
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications"
      >
        <Bell className="bell-icon" />
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
              <X size={20} />
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="empty-state">No notifications</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.read ? "unread" : ""}`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </span>
                  <div className="notification-content">
                    <div className="notification-title">{notif.title}</div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {notif.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    className="dismiss-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss(notif.id);
                    }}
                  >
                    <X size={16} />
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
