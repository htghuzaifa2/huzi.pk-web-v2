"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

export default function EzoicScripts() {
    const pathname = usePathname();

    // Load Ezoic only on homepage (for verification) or blog subpaths
    const shouldLoadEzoic = pathname === "/" || pathname?.startsWith("/blog/");

    if (!shouldLoadEzoic) return null;

    return (
        <>
            {/* Ezoic Privacy/Consent Management Scripts */}
            <Script
                id="ezoic-cmp-1"
                src="https://cmp.gatekeeperconsent.com/min.js"
                strategy="beforeInteractive"
                data-cfasync="false"
            />
            <Script
                id="ezoic-cmp-2"
                src="https://the.gatekeeperconsent.com/cmp.min.js"
                strategy="beforeInteractive"
                data-cfasync="false"
            />

            {/* Ezoic Header Script */}
            <Script
                id="ezoic-sa"
                src="//www.ezojs.com/ezoic/sa.min.js"
                strategy="afterInteractive"
            />
            <Script id="ezoic-init" strategy="afterInteractive">
                {`window.ezstandalone = window.ezstandalone || {}; ezstandalone.cmd = ezstandalone.cmd || [];`}
            </Script>
        </>
    );
}
