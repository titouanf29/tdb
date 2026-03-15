import Link from "next/link";
import { Scale, Shield, FileText, Home, ChevronRight } from "lucide-react";

const pages = [
  { href: "/mentions-legales", label: "Mentions légales", short: "ML", icon: Scale },
  { href: "/politique-de-confidentialite", label: "Confidentialité", short: "RGPD", icon: Shield },
  { href: "/cgu", label: "CGU", short: "CGU", icon: FileText },
];

export function LegalNav({ current }: { current: "/mentions-legales" | "/politique-de-confidentialite" | "/cgu" }) {
  return (
    <div className="mb-8 space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary flex items-center gap-1 transition-colors">
          <Home className="w-3 h-3" />
          Accueil
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Pages légales</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary">{pages.find(p => p.href === current)?.label}</span>
      </div>

      {/* Nav tabs */}
      <nav className="flex flex-wrap gap-2">
        {pages.map(({ href, label, icon: Icon }) => {
          const active = href === current;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function LegalSectionTitle({ num, title, id }: { num: string; title: string; id: string }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-base font-bold text-foreground scroll-mt-6">
      <span className="flex-none w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
        {num}
      </span>
      {title}
    </h2>
  );
}

export function InfoBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warning" | "success" | "danger" }) {
  const styles = {
    info: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    warning: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    success: "bg-green-500/10 border-green-500/30 text-green-300",
    danger: "bg-red-500/10 border-red-500/30 text-red-300",
  };
  return (
    <div className={`p-4 rounded-xl border text-xs leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
}

export function Dl({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="space-y-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex gap-3 text-sm">
          <dt className="font-semibold text-foreground min-w-[160px] shrink-0">{label}</dt>
          <dd className="text-muted-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
