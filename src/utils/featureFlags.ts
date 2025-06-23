/**
 * Feature Flags System
 * 
 * This module provides a centralized way to enable/disable features
 * while maintaining backward compatibility. Features can be controlled
 * via environment variables or configuration files.
 */

export interface FeatureFlags {
  // Content deduplication
  enableContentDeduplication: boolean;
  
  // Enhanced GetYourGuide crawler
  enableGetYourGuidePagination: boolean;
  enableGetYourGuideAdditionalCategories: boolean;
  
  // Community crawling
  enableCommunityCrawling: boolean;
  enableNewCommunitySources: boolean;
  
  // Enhanced scraping
  enableEnhancedLogging: boolean;
  enablePerformanceMetrics: boolean;
  
  // New sources
  enableTripAdvisorScraping: boolean;
  enableViatorScraping: boolean;
  enableExpediaScraping: boolean;
  enableBookingScraping: boolean;
  
  // Advanced features
  enableAdvancedAnalytics: boolean;
  enableDynamicUrlDiscovery: boolean;
  enableContentRechecking: boolean;
}

// Default feature flags configuration
const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Content deduplication - enabled by default
  enableContentDeduplication: process.env.ENABLE_CONTENT_DEDUPLICATION === 'true' || true,
  
  // Enhanced GetYourGuide crawler - enabled by default
  enableGetYourGuidePagination: process.env.ENABLE_GETYOURGUIDE_PAGINATION !== 'false',
  enableGetYourGuideAdditionalCategories: process.env.ENABLE_GETYOURGUIDE_ADDITIONAL_CATEGORIES !== 'false',
  
  // Community crawling - enabled by default
  enableCommunityCrawling: process.env.ENABLE_COMMUNITY_CRAWLING !== 'false',
  enableNewCommunitySources: process.env.ENABLE_NEW_COMMUNITY_SOURCES !== 'false',
  
  // Enhanced scraping - enabled by default
  enableEnhancedLogging: process.env.ENABLE_ENHANCED_LOGGING !== 'false',
  enablePerformanceMetrics: process.env.ENABLE_PERFORMANCE_METRICS === 'true',
  
  // New sources - enabled by default to increase content
  enableTripAdvisorScraping: process.env.ENABLE_TRIPADVISOR_SCRAPING !== 'false',
  enableViatorScraping: process.env.ENABLE_VIATOR_SCRAPING !== 'false',
  enableExpediaScraping: process.env.ENABLE_EXPEDIA_SCRAPING !== 'false',
  enableBookingScraping: process.env.ENABLE_BOOKING_SCRAPING !== 'false',
  
  // Advanced features - enabled by default for better content discovery
  enableAdvancedAnalytics: process.env.ENABLE_ADVANCED_ANALYTICS === 'true',
  enableDynamicUrlDiscovery: process.env.ENABLE_DYNAMIC_URL_DISCOVERY !== 'false',
  enableContentRechecking: process.env.ENABLE_CONTENT_RECHECKING === 'true',
};

// Global feature flags instance
let featureFlags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

/**
 * Initialize feature flags from environment variables
 */
export function initializeFeatureFlags(customFlags?: Partial<FeatureFlags>): void {
  if (customFlags) {
    featureFlags = { ...DEFAULT_FEATURE_FLAGS, ...customFlags };
  }
  
  console.log('[FEATURE_FLAGS] Initialized with configuration:');
  Object.entries(featureFlags).forEach(([key, value]) => {
    console.log(`[FEATURE_FLAGS]   ${key}: ${value ? '✅ ENABLED' : '❌ DISABLED'}`);
  });
}

/**
 * Get current feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  return { ...featureFlags };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature] || false;
}

/**
 * Update a specific feature flag
 */
export function updateFeatureFlag(feature: keyof FeatureFlags, enabled: boolean): void {
  featureFlags[feature] = enabled;
  console.log(`[FEATURE_FLAGS] Updated ${feature}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Reset feature flags to defaults
 */
export function resetFeatureFlags(): void {
  featureFlags = { ...DEFAULT_FEATURE_FLAGS };
  console.log('[FEATURE_FLAGS] Reset to default configuration');
}

/**
 * Get feature flags summary for logging
 */
export function getFeatureFlagsSummary(): string {
  const enabled = Object.entries(featureFlags)
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(', ');
  
  const disabled = Object.entries(featureFlags)
    .filter(([, value]) => !value)
    .map(([key]) => key)
    .join(', ');
  
  return `Enabled: ${enabled || 'none'} | Disabled: ${disabled || 'none'}`;
}

// Initialize feature flags on module load
initializeFeatureFlags(); 