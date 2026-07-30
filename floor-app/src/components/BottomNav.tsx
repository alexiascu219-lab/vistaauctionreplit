'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Thumb-reachable bottom navigation.
 *
 * Bottom rather than top because the app is used one-handed while the other hand
 * is holding an item. Three destinations, not four or five: on a warehouse floor
 * every extra choice is a mis-tap. Scan is the middle and widest target because
 * it is where someone lands 90% of the time.
 */
const TABS = [
  { href: '/list', label: 'List', icon: ListIcon },
  { href: '/scan', label: 'Scan', icon: ScanIcon },
  { href: '/lookup', label: 'Type', icon: KeypadIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-nav flex-col items-center justify-center gap-1 text-[0.8125rem] font-bold transition-colors ${
                  active ? 'text-brand' : 'text-slate-400'
                }`}
              >
                <Icon className="h-7 w-7" aria-hidden="true" />
                {label}
                {/* Active state is colour plus a bar, never colour alone. */}
                <span
                  className={`h-0.5 w-8 rounded-full ${active ? 'bg-brand' : 'bg-transparent'}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = { className?: string; 'aria-hidden'?: boolean | 'true' | 'false' };

function ScanIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} {...props}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" strokeLinecap="round" />
      <path d="M3 12h18" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeLinecap="round" />
    </svg>
  );
}

function KeypadIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} {...props}>
      <path
        d="M6 6h.01M12 6h.01M18 6h.01M6 12h.01M12 12h.01M18 12h.01M6 18h.01M12 18h.01M18 18h.01"
        strokeLinecap="round"
      />
    </svg>
  );
}
