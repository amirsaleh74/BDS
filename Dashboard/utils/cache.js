/**
 * Simple In-Memory Cache
 * Lightweight caching to reduce database queries
 * Uses minimal RAM with automatic cleanup
 */

class SimpleCache {
    constructor(defaultTTL = 60000) { // Default 60 seconds
        this.cache = new Map();
        this.ttl = defaultTTL;
        this.maxSize = 1000; // Maximum 1000 items to prevent memory bloat

        // Auto-cleanup every 5 minutes
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Set a cache entry
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} customTTL - Optional custom TTL in milliseconds
     */
    set(key, value, customTTL = null) {
        // Check size limit
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        const expiresAt = Date.now() + (customTTL || this.ttl);

        this.cache.set(key, {
            value: value,
            expiresAt: expiresAt,
            hits: 0
        });
    }

    /**
     * Get a cache entry
     * @param {string} key - Cache key
     * @returns {any} Cached value or null if not found/expired
     */
    get(key) {
        const item = this.cache.get(key);

        if (!item) return null;

        // Check expiration
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        // Increment hit counter
        item.hits++;

        return item.value;
    }

    /**
     * Check if key exists and is valid
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Delete a cache entry
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Delete all entries matching a pattern
     * @param {string} pattern - Pattern to match (supports wildcards)
     */
    deletePattern(pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Get current cache size
     * @returns {number}
     */
    size() {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     * @returns {object}
     */
    stats() {
        let totalHits = 0;
        let expiredCount = 0;
        const now = Date.now();

        for (const item of this.cache.values()) {
            totalHits += item.hits;
            if (now > item.expiresAt) {
                expiredCount++;
            }
        }

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            totalHits: totalHits,
            expiredCount: expiredCount,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Estimate memory usage (approximate)
     * @returns {string}
     */
    getMemoryUsage() {
        const entries = Array.from(this.cache.entries());
        const sizeInBytes = JSON.stringify(entries).length;
        const sizeInKB = Math.round(sizeInBytes / 1024);

        return sizeInKB < 1024
            ? `${sizeInKB} KB`
            : `${Math.round(sizeInKB / 1024)} MB`;
    }

    /**
     * Cleanup expired entries
     * Called automatically but can be called manually
     */
    cleanup() {
        const now = Date.now();
        let removedCount = 0;

        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`Cache cleanup: removed ${removedCount} expired entries`);
        }

        return removedCount;
    }

    /**
     * Stop the cleanup interval (call when shutting down)
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
    }
}

// Create global cache instance
const dbCache = new SimpleCache(60000); // 60 second default TTL

// Handle process termination
process.on('SIGTERM', () => {
    dbCache.destroy();
});

process.on('SIGINT', () => {
    dbCache.destroy();
});

module.exports = dbCache;
