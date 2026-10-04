"use client";

import { useEffect } from "react";
import Script from "next/script";
import { captureAttribution } from "@/lib/attribution";
import { CLARITY_PROJECT_ID, GA_MEASUREMENT_ID } from "@/lib/gtag";

const SAFE_ID = /^[A-Za-z0-9-]+$/;

/** GA4 + Microsoft Clarity (enabled only when their env IDs are set) and first-touch UTM capture. */
export function AnalyticsScripts() {
  useEffect(() => {
    captureAttribution();
  }, []);

  const gaId = SAFE_ID.test(GA_MEASUREMENT_ID) ? GA_MEASUREMENT_ID : "";
  const clarityId = SAFE_ID.test(CLARITY_PROJECT_ID) ? CLARITY_PROJECT_ID : "";

  return (
    <>
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {clarityId && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
