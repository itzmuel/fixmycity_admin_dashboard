import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useMemo } from "react";
import L from "leaflet";
import type { Issue } from "../models/issue";
import "./MapView.css";

interface MapViewProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
}

export default function MapView({ issues, onIssueClick }: MapViewProps) {
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

  return (
    <div className="map-view">
      <h3>Issue Map</h3>
      <MapContainer
        center={[center[0] as number, center[1] as number]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {issuesWithLocation.map((issue) => (
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
        {issuesWithLocation.length} issues with location data
      </div>
    </div>
  );
}
