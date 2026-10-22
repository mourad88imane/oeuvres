import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: Crumb[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#8a8882" }}>
      {items.map((crumb, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            {crumb.href && !isLast ? (
              <a href={crumb.href} className="hover:underline transition-colors" style={{ color: "#8a8882" }}>
                {crumb.label}
              </a>
            ) : (
              <span style={{ color: isLast ? "#1a1917" : "#8a8882" }}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
