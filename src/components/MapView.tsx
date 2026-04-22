import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import L from "leaflet";
import type { Issue } from "../models/issue";
import { distanceInMeters } from "../services/issueService";
import "./MapView.css";

interface MapViewProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
}

export default function MapView({ issues, onIssueClick }: MapViewProps) {
  const [viewMode, setViewMode] = useState<"pins" | "heatmap" | "both">("both");

  const issueMarkerIcon = useMemo(
    () =>
      L.divIcon({
        className: "map-issue-marker-wrapper",
        html: '<div class="map-issue-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 20],
        popupAnchor: [0, -18],
      }),
    []
  );

  // Filter issues with coordinates
  const issuesWithLocation = useMemo(
    () => issues.filter((i) => i.latitude != null && i.longitude != null),
    [issues]
  );

  // Calculate center of map
  const center = useMemo(() => {
    if (issuesWithLocation.length === 0) {
      return [43.45, -79.7]; // Default: Toronto area
    }
    const avgLat =
      issuesWithLocation.reduce((sum, i) => sum + (i.latitude ?? 0), 0) /
      issuesWithLocation.length;
    const avgLng =
      issuesWithLocation.reduce((sum, i) => sum + (i.longitude ?? 0), 0) /
      issuesWithLocation.length;
    return [avgLat, avgLng];
  }, [issuesWithLocation]);

  const hotspots = useMemo(() => {
    return issuesWithLocation.map((issue) => {
      const nearbyCount = issuesWithLocation.filter((candidate) => {
        if (candidate.latitude == null || candidate.longitude == null || issue.latitude == null || issue.longitude == null) {
          return false;
        }

        return distanceInMeters(issue.latitude, issue.longitude, candidate.latitude, candidate.longitude) <= 120;
      }).length;

      return {
        issue,
        nearbyCount,
      };
    });
  }, [issuesWithLocation]);

  return (
    <div className="map-view">
      <div className="map-header">
        <h3>Issue Map</h3>
        <div className="map-mode-switch" role="group" aria-label="Map display mode">
          <button
            type="button"
            className={`map-mode-btn ${viewMode === "pins" ? "map-mode-btn-active" : ""}`}
            onClick={() => setViewMode("pins")}
          >
            Pins
          </button>
          <button
            type="button"
            className={`map-mode-btn ${viewMode === "heatmap" ? "map-mode-btn-active" : ""}`}
            onClick={() => setViewMode("heatmap")}
          >
            Heatmap
          </button>
          <button
            type="button"
            className={`map-mode-btn ${viewMode === "both" ? "map-mode-btn-active" : ""}`}
            onClick={() => setViewMode("both")}
          >
            Both
          </button>
        </div>
      </div>
      <MapContainer
        center={[center[0] as number, center[1] as number]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {(viewMode === "heatmap" || viewMode === "both") &&
          hotspots.map(({ issue, nearbyCount }) => {
            const radius = 45 + nearbyCount * 15;
            const fillOpacity = Math.min(0.15 + nearbyCount * 0.08, 0.55);
            const color = nearbyCount >= 6 ? "#b91c1c" : nearbyCount >= 4 ? "#ea580c" : "#f59e0b";

            return (
              <Circle
                key={`hotspot-${issue.id}`}
                center={[issue.latitude as number, issue.longitude as number]}
                radius={radius}
                pathOptions={{
                  color,
                  weight: 1,
                  fillColor: color,
                  fillOpacity,
                }}
              />
            );
          })}

        {(viewMode === "pins" || viewMode === "both") && issuesWithLocation.map((issue) => (
          <Marker
            key={issue.id}
            position={[issue.latitude as number, issue.longitude as number]}
            icon={issueMarkerIcon}
            eventHandlers={{
              click: () => onIssueClick?.(issue),
            }}
          >
            <Popup>
              <div className="map-popup">
                <h4>{issue.category}</h4>
                <p>{issue.address || "No address"}</p>
                <p className="status">Status: {issue.status}</p>
                <button
                  onClick={() => onIssueClick?.(issue)}
                  className="view-btn"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-info">
        {issuesWithLocation.length} issues with location data • Heatmap highlights hotspot clusters
      </div>
    </div>
  );
}
