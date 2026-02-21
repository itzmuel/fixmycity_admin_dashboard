type Props = {
  category: string;
};

function pick(category: string) {
  const c = category.toLowerCase();

  if (c.includes("pothole") || c.includes("road")) return { icon: "🕳️", label: category };
  if (c.includes("streetlight") || c.includes("light")) return { icon: "💡", label: category };
  if (c.includes("graffiti") || c.includes("vandal")) return { icon: "🎨", label: category };
  if (c.includes("sidewalk") || c.includes("walk")) return { icon: "🚶", label: category };
  if (c.includes("dump") || c.includes("trash") || c.includes("litter")) return { icon: "🗑️", label: category };
  if (c.includes("vegetation") || c.includes("tree") || c.includes("grass")) return { icon: "🌿", label: category };
  if (c.includes("drain") || c.includes("water") || c.includes("flood")) return { icon: "💧", label: category };
  if (c.includes("public") || c.includes("property") || c.includes("damage")) return { icon: "🛠️", label: category };

  return { icon: "📍", label: category };
}

export default function CategoryBadge({ category }: Props) {
  const { icon, label } = pick(category);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: 10,
          display: "inline-grid",
          placeItems: "center",
          background: "rgba(37, 99, 235, 0.10)",
          fontSize: 14,
        }}
      >
        {icon}
      </span>

      <span style={{ fontWeight: 800 }}>{label}</span>
    </span>
  );
}
