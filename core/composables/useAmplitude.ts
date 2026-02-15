import * as amplitude from '@amplitude/analytics-browser';

// Define types for Amplitude event properties
interface EventProperties {
  [key: string]: string | number | boolean | object | undefined;
}

// Define the return type of the composable
interface AmplitudeHook {
  trackEvent: (eventName: string, eventProperties?: EventProperties) => void;
  reset: () => void;
  initialize: () => void;
}

export function useAmplitude(): AmplitudeHook {
  const config = useRuntimeConfig();
  const apiKey = config.public.amplitudeApiKey as string;

  const initialize = () => {
    if (apiKey) {
      amplitude.init(apiKey, {
        defaultTracking: {
          pageViews: true,
          sessions: true,
        },
        fetchRemoteConfig: true,
        autocapture: true,
      });
    } else {
      console.warn('Amplitude API key is not defined');
    }
  };

  // Track custom events
  const trackEvent = (
    eventName: string,
    eventProperties: EventProperties = {}
  ) => {
    amplitude.track(eventName, eventProperties);
  };

  // Reset analytics (e.g., on logout)
  const reset = () => {
    amplitude.reset();
  };

  return {
    trackEvent,
    reset,
    initialize,
  };
}
