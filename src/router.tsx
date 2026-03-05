import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import RequireAdminAuth from "./components/RequireAdminAuth";
import DashboardPage from "./pages/DashboardPage";
import IssueDetailPage from "./pages/IssueDetailPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    path: "/",
    element: (
      <RequireAdminAuth>
        <AppShell />
      </RequireAdminAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/issues/:id", element: <IssueDetailPage /> },
    ],
  },
]);
