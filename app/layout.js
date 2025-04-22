import './globals.css';
import { Inter } from 'next/font/google';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Müllkalender Generator',
  description: 'Erstellen Sie einen personalisierten Kalender für Ihre Müllabfuhrtermine',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={inter.className}>
      <body>
        <Script id="matomo-tracking" strategy="afterInteractive">
          {`
          var _paq = window._paq = window._paq || [];
          /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
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
        <div className="min-h-screen flex flex-col">
          <header className="bg-primary text-white py-6">
            <div className="container">
              <div className="flex items-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-8 h-8 mr-3"
                >
                  <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
                  <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.133 2.845a.75.75 0 011.06 0l1.72 1.72 1.72-1.72a.75.75 0 111.06 1.06l-1.72 1.72 1.72 1.72a.75.75 0 11-1.06 1.06L12 15.685l-1.72 1.72a.75.75 0 11-1.06-1.06l1.72-1.72-1.72-1.72a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
                <h1 className="text-2xl font-bold">Müllkalender</h1>
              </div>
            </div>
          </header>
          <main className="container py-10 flex-grow">
            {children}
          </main>
          <footer className="bg-primary text-white py-6 mt-8">
            <div className="container text-center">
              <p className="opacity-80">© {new Date().getFullYear()} Müllkalender Generator</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
} 