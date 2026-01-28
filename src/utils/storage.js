/**
 * Safe LocalStorage Wrapper
 * Prevents app crashes due to QuotaExceededError or JSON parsing errors.
 */

export const safeStorage = {
    getItem: (key, fallback = null) => {
        try {
            let item = localStorage.getItem(key);

            // If missing in local, try session (in case we fell back during write)
            if (!item) {
                try { item = sessionStorage.getItem(key); } catch (e) { }
            }

            if (!item) return fallback;

            // Attempt to parse JSON
            try {
                return JSON.parse(item);
            } catch (e) {
                return item; // Return as string if not JSON
            }
        } catch (error) {
            console.warn(`Error reading ${key}:`, error);
            return fallback;
        }
    },

    setItem: (key, value) => {
        try {
            const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.warn(`localStorage quota exceeded for ${key}. Switch to session storage or cleanup.`);
                // Optional: Fallback to sessionStorage if critical, but safer to just fail gracefully for cache
                try {
                    sessionStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    console.log('Fallback to sessionStorage successful');
                    return true;
                } catch (e) {
                    console.error('Even sessionStorage failed is full.');
                    return false;
                }
            }
            console.error(`Error writing ${key} to localStorage:`, error);
            return false;
        }
    },

    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Error removing ${key}:`, error);
        }
    },

    clear: () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.warn("Error clearing localStorage:", error);
        }
    }
};
