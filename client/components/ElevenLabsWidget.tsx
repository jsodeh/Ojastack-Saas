import { useEffect } from "react";

// Simplified widget that avoids DOM conflicts
export default function ElevenLabsWidget() {
  useEffect(() => {
    // Skip if we're in server-side rendering
    if (typeof window === "undefined") {
      return;
    }

    // Only load if not already loaded and no existing widget
    const existingWidget = document.querySelector('elevenlabs-convai');
    const existingScript = document.querySelector('script[src*="convai-widget-embed"]');
    
    if (existingWidget || existingScript) {
      return;
    }

    let mounted = true;

    const loadScript = () => {
      try {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
        script.async = true;
        script.type = "text/javascript";

        script.onload = () => {
          if (mounted) {
            console.log("ElevenLabs widget loaded");
          }
        };

        script.onerror = () => {
          if (mounted) {
            console.warn("ElevenLabs widget failed to load");
          }
        };

        document.head.appendChild(script);
      } catch (error) {
        console.warn("Could not load ElevenLabs widget:", error);
      }
    };

    // Delay loading to avoid conflicts
    const timeoutId = setTimeout(loadScript, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      // Don't try to remove script on cleanup to avoid DOM conflicts
    };
  }, []);

  // Don't render any DOM elements to avoid conflicts
  return null;
}
