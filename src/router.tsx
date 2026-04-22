import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import RequireAdminAuth from "./components/RequireAdminAuth";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import AnalyticsPage from "./pages/AnalyticsPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AssignPage = lazy(() => import("./pages/AssignPage"));
const EmailConfirmedPage = lazy(() => import("./pages/EmailConfirmedPage"));
const IssueDetailPage = lazy(() => import("./pages/IssueDetailPage"));
const NotificationsQueuePage = lazy(() => import("./pages/NotificationsQueuePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));

function PageLoader() {
  return <div className="card card-pad">Loading...</div>;
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: withSuspense(<LoginPage />), errorElement: <RouteErrorBoundary /> },
  { path: "/signup", element: withSuspense(<SignupPage />), errorElement: <RouteErrorBoundary /> },
  { path: "/email-confirmed", element: withSuspense(<EmailConfirmedPage />), errorElement: <RouteErrorBoundary /> },
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    element: (
      <RequireAdminAuth>
        <AppShell />
      </RequireAdminAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: withSuspense(<DashboardPage />) },
      { path: "/analytics", element: withSuspense(<AnalyticsPage />) },
      { path: "/notifications", element: withSuspense(<NotificationsQueuePage />) },
      { path: "/assign", element: withSuspense(<AssignPage />) },
      { path: "/issues/:id", element: withSuspense(<IssueDetailPage />) },
    ],
  },
]);
