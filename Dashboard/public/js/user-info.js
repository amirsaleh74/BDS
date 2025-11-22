/**
 * User Info Component
 * Displays logged-in user information and logout functionality
 */

class UserInfo {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        await this.fetchUserInfo();
        this.createUserBadge();
        this.setupAutoRefresh();
    }

    async fetchUserInfo() {
        try {
            const response = await fetch('/api/users/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                return this.user;
            } else if (response.status === 401) {
                // User not authenticated
                this.handleUnauthenticated();
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        }

        return null;
    }

    createUserBadge() {
        if (!this.user) return;

        // Check if badge already exists
        if (document.querySelector('.user-info-badge')) {
            this.updateUserBadge();
            return;
        }

        const badge = document.createElement('div');
        badge.className = 'user-info-badge';

        const initials = this.getInitials(this.user.username);
        const roleBadgeClass = `role-badge ${this.user.role}`;

        badge.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-details">
                <div class="user-name">${this.escapeHtml(this.user.username)}</div>
                <div class="user-role">
                    <span class="${roleBadgeClass}">${this.user.role}</span>
                </div>
            </div>
            <button class="logout-btn" onclick="userInfo.logout()">
                <span>🚪</span>
                <span>Logout</span>
            </button>
        `;

        document.body.appendChild(badge);

        // Apply user's theme preference
        if (this.user.theme && window.themeSwitcher) {
            window.themeSwitcher.setTheme(this.user.theme);
        }
    }

    updateUserBadge() {
        const badge = document.querySelector('.user-info-badge');
        if (!badge || !this.user) return;

        const initials = this.getInitials(this.user.username);
        const roleBadgeClass = `role-badge ${this.user.role}`;

        badge.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-details">
                <div class="user-name">${this.escapeHtml(this.user.username)}</div>
                <div class="user-role">
                    <span class="${roleBadgeClass}">${this.user.role}</span>
                </div>
            </div>
            <button class="logout-btn" onclick="userInfo.logout()">
                <span>🚪</span>
                <span>Logout</span>
            </button>
        `;
    }

    getInitials(username) {
        if (!username) return '?';

        const parts = username.split(/[\s_-]+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return username.substring(0, 2).toUpperCase();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async logout() {
        if (!confirm('Are you sure you want to logout?')) {
            return;
        }

        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                // Clear local storage
                localStorage.clear();

                // Redirect to login
                window.location.href = '/login';
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('An error occurred during logout.');
        }
    }

    handleUnauthenticated() {
        // Only redirect if not already on login/setup page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/setup') {
            window.location.href = '/login';
        }
    }

    setupAutoRefresh() {
        // Refresh token every 10 minutes
        setInterval(async () => {
            try {
                await fetch('/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Token refresh failed:', error);
            }
        }, 10 * 60 * 1000);
    }

    // Auto-logout on idle (30 minutes)
    setupIdleTimeout() {
        const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
        let idleTimer;

        const resetIdleTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                alert('You have been logged out due to inactivity.');
                this.logout();
            }, IDLE_TIMEOUT);
        };

        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
            document.addEventListener(event, resetIdleTimer, true);
        });

        // Start timer
        resetIdleTimer();
    }

    // Public method to get current user
    getUser() {
        return this.user;
    }

    // Public method to check if user has role
    hasRole(...roles) {
        return this.user && roles.includes(this.user.role);
    }

    // Public method to check if user has permission
    hasPermission(permission) {
        if (!this.user) return false;
        if (this.user.role === 'admin') return true;
        return this.user.permissions && this.user.permissions[permission];
    }
}

// Initialize user info when DOM is ready
let userInfo;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        userInfo = new UserInfo();
    });
} else {
    userInfo = new UserInfo();
}

// Export for use in other scripts
window.userInfo = userInfo;
