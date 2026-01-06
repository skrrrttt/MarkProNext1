'use client';

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
  const allItems = showHome
    ? [{ label: 'Dashboard', href: '/admin/dashboard' }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb mb-4">
      {showHome && (
        <>
          <Link
            href="/admin/dashboard"
            className="breadcrumb-item flex items-center gap-1"
            aria-label="Go to dashboard"
          >
            <Home className="w-4 h-4" />
          </Link>
          {items.length > 0 && (
            <ChevronRight className="w-4 h-4 breadcrumb-separator" aria-hidden="true" />
          )}
        </>
      )}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="breadcrumb-item">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'breadcrumb-current' : 'breadcrumb-item'}>
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="w-4 h-4 breadcrumb-separator" aria-hidden="true" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
