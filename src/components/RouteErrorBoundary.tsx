import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}${error.data ? `: ${String(error.data)}` : ""}`;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "Something went wrong while rendering this page.";
}

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div className="card card-pad" style={{ width: "100%", maxWidth: 640, display: "grid", gap: 12 }}>
        <div>
          <div className="h1">Unexpected Error</div>
          <div className="muted" style={{ marginTop: 6 }}>
            The dashboard hit an unexpected problem.
          </div>
        </div>

        <div
          style={{
            borderRadius: 12,
            border: "1px solid #ef4444",
            padding: 10,
            color: "#ef4444",
            fontWeight: 700,
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/login" className="btn">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}