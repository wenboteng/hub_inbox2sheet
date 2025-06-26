/**
 * Feature Flags System
 *
 * This module provides a centralized way to enable/disable features
 * while maintaining backward compatibility. Features can be controlled
 * via environment variables or configuration files.
 */
export interface FeatureFlags {
    enableContentDeduplication: boolean;
    enableGetYourGuidePagination: boolean;
    enableGetYourGuideAdditionalCategories: boolean;
    enableCommunityCrawling: boolean;
    enableNewCommunitySources: boolean;
    enableEnhancedLogging: boolean;
    enablePerformanceMetrics: boolean;
    enableTripAdvisorScraping: boolean;
    enableViatorScraping: boolean;
    enableExpediaScraping: boolean;
    enableBookingScraping: boolean;
    enableAdvancedAnalytics: boolean;
    enableDynamicUrlDiscovery: boolean;
    enableContentRechecking: boolean;
}
/**
 * Initialize feature flags from environment variables
 */
export declare function initializeFeatureFlags(customFlags?: Partial<FeatureFlags>): void;
/**
 * Get current feature flags
 */
export declare function getFeatureFlags(): FeatureFlags;
/**
 * Check if a specific feature is enabled
 */
export declare function isFeatureEnabled(feature: keyof FeatureFlags): boolean;
/**
 * Update a specific feature flag
 */
export declare function updateFeatureFlag(feature: keyof FeatureFlags, enabled: boolean): void;
/**
 * Reset feature flags to defaults
 */
export declare function resetFeatureFlags(): void;
/**
 * Get feature flags summary for logging
 */
export declare function getFeatureFlagsSummary(): string;
//# sourceMappingURL=featureFlags.d.ts.map