import './globals.css';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';

const display = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const body = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata = {
  title: 'Müllkalender Generator',
  description:
    'Personalisierte Müllabfuhr-Kalender für Wien/MA48 und andere Regionen – mit Feiertagsverschiebung und ICS-Export',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans">
        <Script id="matomo-tracking" strategy="afterInteractive">
          {`
          var _paq = window._paq = window._paq || [];
          _paq.push(["disableCookies"]);
          _paq.push(['trackPageView']);
          _paq.push(['enableLinkTracking']);
          (function() {
            var u="//track.entner.org/";
            _paq.push(['setTrackerUrl', u+'matomo.php']);
            _paq.push(['setSiteId', '2']);
            var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
            g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
          })();
          `}
        </Script>

        <div className="relative min-h-screen flex flex-col overflow-x-hidden">
          <div
            className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-drift"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute top-40 -left-20 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl animate-drift"
            aria-hidden="true"
            style={{ animationDelay: '4s' }}
          />

          <header className="relative z-10 border-b border-white/40 bg-white/55 backdrop-blur-md">
            <div className="container py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                    <path
                      fillRule="evenodd"
                      d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.133 2.845a.75.75 0 011.06 0l1.72 1.72 1.72-1.72a.75.75 0 111.06 1.06l-1.72 1.72 1.72 1.72a.75.75 0 11-1.06 1.06L12 15.685l-1.72 1.72a.75.75 0 11-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 010-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <p className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-none">
                    Müllkalender
                  </p>
                  <p className="text-xs sm:text-sm text-muted mt-1">
                    ICS für Wien / MA48 &amp; mehr
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="relative z-10 container py-8 sm:py-12 flex-grow">{children}</main>

          <footer className="relative z-10 mt-auto border-t border-line/70 bg-white/40 backdrop-blur-sm">
            <div className="container py-6 text-center text-sm text-muted">
              © {new Date().getFullYear()} Müllkalender Generator
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
