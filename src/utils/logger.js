// src/utils/logger.js - Centralized Logging Utility

window.Logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO ${timestamp}] ${message}`, data || '');
  },

  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR ${timestamp}] ${message}`, error || '');

    // Could extend to send to error tracking service
    // if (window.errorTracking) {
    //   window.errorTracking.log({ message, error, timestamp });
    // }
  },

  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN ${timestamp}] ${message}`, data || '');
  },

  debug: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[DEBUG ${timestamp}] ${message}`, data || '');
    }
  }
};
