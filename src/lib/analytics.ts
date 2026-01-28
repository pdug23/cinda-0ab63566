// Google Analytics 4 helper functions
// Replace GA_MEASUREMENT_ID in index.html with your actual GA4 ID

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// PWA Install tracking events
export const analytics = {
  // When user clicks "Cinda is best as a web app" link
  installLinkClicked: (source: "landing" | "orientation") => {
    trackEvent("install_link_clicked", { source });
  },

  // When the A2HS modal opens
  a2hsModalOpened: () => {
    trackEvent("a2hs_modal_opened");
  },

  // When user views specific platform instructions
  a2hsInstructionsViewed: (platform: "ios" | "android" | "desktop") => {
    trackEvent("a2hs_instructions_viewed", { platform });
  },
};
