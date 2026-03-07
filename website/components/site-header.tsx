'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { navLinks, siteConfig } from '@/lib/site';

function Wordmark() {
  return (
    <span className="wordmark" aria-label="MESkit">
      <span className="wordmark-mes">MES</span>
      <span className="wordmark-kit">kit</span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <Wordmark />
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link key={link.href} href={link.href} className={active ? 'active' : undefined}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-cta">
          <a href="/signup" className="btn btn-primary">
            Try MESkit
          </a>
          <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
            View on GitHub
          </a>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((state) => !state)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mobile-nav-overlay">
          <nav aria-label="Mobile navigation" className="mobile-nav">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? 'active' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <a href="/signup" className="btn btn-primary" onClick={() => setOpen(false)}>
              Try MESkit
            </a>
            <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" onClick={() => setOpen(false)}>
              View on GitHub
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function WordmarkInline() {
  return <Wordmark />;
}
