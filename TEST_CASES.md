# FixMyCity Admin Dashboard Test Cases

## 1. Submit Issue Appears Live (Mobile -> Admin)
1. Sign in to admin dashboard and open Dashboard.
2. Submit a new issue from the mobile app (or insert row in Supabase).
3. Verify new issue appears automatically in the dashboard without refresh.
4. Verify notification bell gets a "New report submitted" entry.

Expected:
- Live sync indicator shows connected.
- New issue row appears at top.

## 2. Duplicate Detection Warning
1. Ensure one issue exists with valid latitude/longitude.
2. Submit another issue within ~20 meters.
3. Watch dashboard and issue detail page.

Expected:
- Dashboard warning banner appears for nearby duplicate.
- Duplicate Risk column shows "X nearby" for impacted issues.
- Issue detail page shows nearby duplicate warning.

## 3. Status Update + Audit + Notification Queue
1. Open an issue detail page.
2. Change status from submitted -> in_progress -> resolved.
3. Check Supabase tables: issue_logs and notification_events.

Expected:
- UI status updates immediately.
- At least one issue_logs row is created with action=status_changed.
- notification_events receives status_changed record.

## 4. SLA Tracking
1. Open dashboard list.
2. Verify each issue shows SLA badge in table.
3. Resolve one issue older than 48h and one newer than 48h.

Expected:
- Overdue/open issues show red state.
- Resolved within 48h shows green state.
- Resolved after 48h shows red state.

## 5. Heatmap View
1. Open map section.
2. Switch mode: Pins, Heatmap, Both.
3. Zoom/pan around clustered issues.

Expected:
- Heat circles render in heatmap/both mode.
- Denser areas show visually stronger hotspot coverage.

## 6. Search and Filter Regression
1. Apply status and text filters.
2. Navigate pages.
3. Clear filters.

Expected:
- Filtered counts and table rows remain consistent.
- Pagination still works after realtime inserts/updates.

## 7. Notification Queue Monitoring
1. Open Notifications Queue page.
2. Trigger status update on any issue.
3. Verify queue row appears as pending/sent/failed.
4. If failed exists, press Retry.

Expected:
- Queue list updates in real time.
- Retry changes failed row back to pending.

## 8. AI Categorization
1. Open Issue Details for a report with ambiguous/incorrect category.
2. Observe AI suggestion card.
3. Click Apply Suggested Category.

Expected:
- Suggestion appears with confidence and reason.
- Category updates and persists after refresh.
