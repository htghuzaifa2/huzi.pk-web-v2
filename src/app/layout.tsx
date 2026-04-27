
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { Toaster } from "@/components/ui/toaster"
import { CartProvider } from '@/context/cart-context';
import Link from 'next/link';
import { Belleza, Alegreya } from 'next/font/google';
import { ScrollToTop } from '@/components/scroll-to-top';
import { WhatsappIcon } from '@/components/whatsapp-icon';
import { SearchProvider } from '@/context/search-context';
import SearchBar from '@/components/search-bar';
import { LightboxProvider, Lightbox } from '@/context/lightbox-context';
import ExternalPrefetch from "@/components/ExternalPrefetch";
import Script from 'next/script';

const belleza = Belleza({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
  weight: ['400'],
});

const alegreya = Alegreya({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '700'],
});

const siteConfig = {
  name: "huzi.pk",
  url: "https://huzi.pk",
  title: "huzi.pk | Quality & Style, Delivered in Pakistan",
  description: "Huzi.pk: Your trusted hub for premium quality Pakistani Fashion & Tech Products. Shop confidently with nationwide delivery. Digital Products & E-Books available worldwide! Find quality and style. Shop Now!",
  keywords: [
    "online shopping pakistan",
    "e-commerce store pakistan",
    "huzi pk",
    "trusted online shop",
    "Pakistani fashion online",
    "tech products pakistan",
    "digital products worldwide",
    "buy e-books online",
    "lawn suits online",
    "bridal dresses pakistan",
    "watches and bags online",
    "premium quality clothing pakistan",
    "buy maxi dresses online",
    "office and school supplies pakistan",
    "fashion accessories for men and women",
    "Pakistani wedding dresses online"
  ]
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s - huzi.pk`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: "huzi.pk", url: siteConfig.url }],
  creator: "huzi.pk",
  publisher: "huzi.pk",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [`${siteConfig.url}/favicon.ico`],
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [`${siteConfig.url}/favicon.ico`],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
}

import EzoicScripts from '@/components/ezoic-scripts';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${alegreya.variable} ${belleza.variable}`}>
      <head>
        <EzoicScripts />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SearchProvider>
            <CartProvider>
              <LightboxProvider>
                <div className="flex min-h-screen flex-col">
                  <Header />
                  <SearchBar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <Toaster />
                <ScrollToTop />
                <Link
                  href="https://wa.me/message/BY3URMYOW3OMH1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 whatsapp-float"
                  aria-label="Chat on WhatsApp"
                >
                  <WhatsappIcon className="h-8 w-8" />
                </Link>
                <Lightbox />
              </LightboxProvider>
            </CartProvider>
          </SearchProvider>
        </ThemeProvider>

        {/* Google Analytics */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-EVBKM2T46F" />
        <Script id="google-analytics">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-EVBKM2T46F');
          `}
        </Script>

        {/* This script is a placeholder that will be populated by the page component */}
        <script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: '' }}
        />
        {/* Next.js <Link> handles internal routes. This handles external. */}
        <ExternalPrefetch />
      </body>
    </html>
  );
}
