import { AlertTriangle, Construction, Droplets, Footprints, Lightbulb, MapPin, Palette, Trash2, Wrench } from "lucide-react";

type Props = {
  category: string;
};

function pick(category: string): { icon: React.ReactNode; label: string } {
  const c = category.toLowerCase();

  if (c.includes("pothole") || c.includes("road"))
    return { icon: <Construction size={16} />, label: category };
  if (c.includes("streetlight") || c.includes("light"))
    return { icon: <Lightbulb size={16} />, label: category };
  if (c.includes("graffiti") || c.includes("vandal"))
    return { icon: <Palette size={16} />, label: category };
  if (c.includes("sidewalk") || c.includes("walk"))
    return { icon: <Footprints size={16} />, label: category };
  if (c.includes("dump") || c.includes("trash") || c.includes("litter"))
    return { icon: <Trash2 size={16} />, label: category };
  if (c.includes("vegetation") || c.includes("tree") || c.includes("grass"))
    return { icon: <Footprints size={16} />, label: category };
  if (c.includes("drain") || c.includes("water") || c.includes("flood"))
    return { icon: <Droplets size={16} />, label: category };
  if (c.includes("public") || c.includes("property") || c.includes("damage"))
    return { icon: <Wrench size={16} />, label: category };
  if (c.includes("sinkhole") || c.includes("collapse") || c.includes("hazard"))
    return { icon: <AlertTriangle size={16} />, label: category };

  return { icon: <MapPin size={16} />, label: category };
}

export default function CategoryBadge({ category }: Props) {
  const { icon, label } = pick(category);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 10,
          display: "inline-grid",
          placeItems: "center",
          background: "var(--color-primary-light)",
          color: "var(--color-primary)",
        }}
      >
        {icon}
      </span>
      <span style={{ fontWeight: 700, fontFamily: "var(--font-heading)", color: "var(--color-text-main)" }}>{label}</span>
    </span>
  );
}
