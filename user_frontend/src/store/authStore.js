import { create } from 'zustand';

// Decode JWT payload (no verify — backend remains authoritative)
const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

const getStoredState = () => {
  try {
    const token = sessionStorage.getItem('nagrik_token');
    if (!token) return { token: null, user: null };
    const user = decodeToken(token);
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
};

export const useAuthStore = create((set) => {
  const { token, user } = getStoredState();

  return {
    token,
    user,
    isAuthenticated: !!token,

    login: (token) => {
      const user = decodeToken(token);
      sessionStorage.setItem('nagrik_token', token);
      set({ token, user, isAuthenticated: true });
    },

    updateFamilyId: (familyId) => {
      set((state) => ({
        user: state.user ? { ...state.user, familyId } : null,
      }));
    },

    logout: () => {
      sessionStorage.removeItem('nagrik_token');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
