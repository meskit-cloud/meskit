import { Github } from 'lucide-react';
import Link from 'next/link';

import { footerGroups, siteConfig } from '@/lib/site';

import { WordmarkInline } from './site-header';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href}>{link.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container footer-bottom">
        <div>
          <WordmarkInline />
          <p>Source-available MES with built-in analytics and natural language queries. Free to self-host.</p>
        </div>

        <a href={siteConfig.githubUrl} target="_blank" rel="noreferrer" className="social-link">
          <Github size={16} />
          <span>GitHub</span>
        </a>
      </div>
    </footer>
  );
}
