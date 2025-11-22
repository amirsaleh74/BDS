/**
 * Theme Switcher
 * Handles dark/light mode toggle and persistence
 */

class ThemeSwitcher {
    constructor() {
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        // Load theme from localStorage or user preference
        this.loadTheme();

        // Create theme toggle button
        this.createToggleButton();

        // Listen for system theme changes
        this.watchSystemTheme();
    }

    loadTheme() {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }

        // Apply theme
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update toggle button if it exists
        this.updateToggleButton();

        // Sync with server if user is logged in
        this.syncWithServer();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    createToggleButton() {
        // Check if button already exists
        if (document.querySelector('.theme-toggle')) {
            return;
        }

        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.innerHTML = `
            <span class="theme-toggle-icon">🌙</span>
            <span class="theme-toggle-text">Dark Mode</span>
        `;

        button.addEventListener('click', () => this.toggleTheme());

        // Add to body
        document.body.appendChild(button);

        // Update button state
        this.updateToggleButton();
    }

    updateToggleButton() {
        const button = document.querySelector('.theme-toggle');
        if (!button) return;

        const icon = button.querySelector('.theme-toggle-icon');
        const text = button.querySelector('.theme-toggle-text');

        if (this.currentTheme === 'dark') {
            icon.textContent = '☀️';
            if (text) text.textContent = 'Light Mode';
        } else {
            icon.textContent = '🌙';
            if (text) text.textContent = 'Dark Mode';
        }
    }

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a preference
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    async syncWithServer() {
        // Only sync if user is authenticated
        try {
            const response = await fetch('/api/users/me/theme', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ theme: this.currentTheme })
            });

            if (!response.ok && response.status !== 401) {
                console.warn('Failed to sync theme with server');
            }
        } catch (error) {
            // Silently fail if not authenticated or network error
            console.debug('Theme sync skipped:', error.message);
        }
    }

    // Public method to get current theme
    getTheme() {
        return this.currentTheme;
    }

    // Public method to set theme programmatically
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.applyTheme(theme);
        }
    }
}

// Initialize theme switcher when DOM is ready
let themeSwitcher;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeSwitcher = new ThemeSwitcher();
    });
} else {
    themeSwitcher = new ThemeSwitcher();
}

// Export for use in other scripts
window.themeSwitcher = themeSwitcher;
