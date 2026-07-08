import Link from "next/link";
import { useRouter } from "next/router";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/community", label: "Community" },
  { href: "/ai-prompt-enhancer", label: "AI Prompt Enhancer", highlight: true },
];

export default function SiteNav() {
  const router = useRouter();

  return (
    <header className="ev-nav">
      <div className="ev-nav-inner">
        <Link href="/" className="ev-nav-brand">
          <span className="ev-nav-logo">✦</span>
          EvonVChat
        </Link>
        <nav className="ev-nav-links" aria-label="Site navigation">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "ev-nav-link",
                router.pathname === link.href ? "active" : "",
                link.highlight ? "highlight" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="ev-nav-cta">
          Enter Chat
        </Link>
      </div>
    </header>
  );
}
