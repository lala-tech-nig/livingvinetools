import { Plus_Jakarta_Sans } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata = {
  title: 'Living Vine Email Hub — Bulk Email Sender',
  description: 'Bulk email sender and tracking suite for Living Vine Properties Investment',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <div className="app-container">
          <aside className="sidebar">
            <div className="sidebar-brand">
              <Image
                src="/logo.png"
                alt="Living Vine Logo"
                width={44}
                height={44}
                className="brand-logo-img"
              />
              <div className="brand-text">
                <span className="brand-name">LIVING VINE</span>
                <span className="brand-sub">Email Hub</span>
              </div>
            </div>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-item active">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Dashboard
              </Link>
            </nav>
            <div className="sidebar-footer">
              <div style={{ fontSize: '10px', color: 'var(--brand-wine)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Connected Sender</div>
              <div className="sidebar-email">connect@livingvinepropertiesinvestment.com</div>
            </div>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
