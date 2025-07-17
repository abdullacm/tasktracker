// Centralized API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  ENDPOINTS: {
    AUTH: {
      USER: '/api/auth/user',
      LOGIN: '/api/login',
      LOGOUT: '/api/logout',
    },
    TIME_SESSIONS: {
      BASE: '/api/time-sessions',
      START: '/api/time-sessions/start',
      STOP: (id) => `/api/time-sessions/${id}/stop`,
      ACTIVE: '/api/time-sessions/active',
    },
    SETTINGS: '/api/settings',
    TRELLO: {
      BOARDS: '/api/trello/boards',
      CARDS: '/api/trello/cards',
      TEST_CONNECTION: '/api/trello/test-connection',
    },
  },
};

// API utility functions
export const apiClient = {
  get: async (url) => {
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  post: async (url, data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
};
