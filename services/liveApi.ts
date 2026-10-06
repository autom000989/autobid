// Live API Service communicating directly with the Node.js backend
// Replaces cookies and localStorage with live, server-side persistence

export interface LiveUserBid {
  vehicleId: string;
  amount: number;
  timestamp: number;
}

export interface LiveUserBidsResponse {
  success: boolean;
  vehicleIds: string[];
  bids: LiveUserBid[];
}

export interface LiveFollowResponse {
  success: boolean;
  action: 'followed' | 'unfollowed';
  isFollowing: boolean;
  isFollowingBack: boolean;
  targetUser?: any;
  currentUser?: any;
}

export const liveApi = {
  // Check live server health
  async checkStatus() {
    try {
      const res = await fetch('/api/live/status');
      return await res.json();
    } catch (err) {
      console.warn('[liveApi] Server status check error:', err);
      return { live: false };
    }
  },

  // Get live user bids from Node.js backend (replaces localStorage autobid_user_bids_*)
  async getUserBids(userId: string): Promise<LiveUserBidsResponse> {
    if (!userId) return { success: false, vehicleIds: [], bids: [] };
    try {
      const res = await fetch(`/api/live/user-bids/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`[liveApi] Error fetching user bids for ${userId}:`, err);
      return { success: false, vehicleIds: [], bids: [] };
    }
  },

  // Record a live bid in Node.js backend (persisted live on server, replaces localStorage.setItem)
  async recordUserBid(userId: string, vehicleId: string, amount: number): Promise<string[]> {
    if (!userId || !vehicleId) return [];
    try {
      const res = await fetch('/api/live/user-bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, vehicleId, amount })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.vehicleIds || [];
    } catch (err) {
      console.warn(`[liveApi] Error recording bid on live server:`, err);
      return [];
    }
  },

  // Follow or Follow-back a user via Node.js backend
  async toggleFollow(currentUserId: string, targetUserId: string): Promise<LiveFollowResponse | null> {
    if (!currentUserId || !targetUserId) return null;
    try {
      const res = await fetch(`/api/live/users/${encodeURIComponent(targetUserId)}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`[liveApi] Follow toggle failed:`, err);
      return null;
    }
  },

  // Get live user profile data
  async getUser(userId: string) {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/live/users/${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[liveApi] Error fetching live user ${userId}:`, err);
      return null;
    }
  },

  // Get live community users
  async getAllUsers() {
    try {
      const res = await fetch('/api/live/users');
      if (!res.ok) return [];
      const data = await res.json();
      return data.users || [];
    } catch (err) {
      console.warn(`[liveApi] Error fetching all users:`, err);
      return [];
    }
  },

  // Sync user info to live backend
  async syncUser(user: any) {
    if (!user || !user.id) return;
    try {
      await fetch('/api/live/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user })
      });
    } catch (err) {
      console.warn(`[liveApi] Sync user error:`, err);
    }
  },

  // Get live watchlist from server
  async getWatchlist(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const res = await fetch(`/api/live/watchlist/${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.vehicleIds || [];
    } catch (err) {
      console.warn(`[liveApi] Watchlist fetch error:`, err);
      return [];
    }
  },

  // Toggle vehicle in live server watchlist
  async toggleWatchlist(userId: string, vehicleId: string): Promise<string[]> {
    if (!userId || !vehicleId) return [];
    try {
      const res = await fetch('/api/live/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, vehicleId })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.vehicleIds || [];
    } catch (err) {
      console.warn(`[liveApi] Watchlist toggle error:`, err);
      return [];
    }
  }
};
