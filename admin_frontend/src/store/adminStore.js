import { create } from 'zustand';

const decode = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

export const useAdminStore = create((set) => {
  const token = sessionStorage.getItem('nagrik_admin_token');
  const user  = token ? decode(token) : null;
  return {
    token, user,
    isAuthenticated: !!token,
    login:  (token) => { sessionStorage.setItem('nagrik_admin_token', token); set({ token, user: decode(token), isAuthenticated: true }); },
    logout: ()      => { sessionStorage.removeItem('nagrik_admin_token'); set({ token: null, user: null, isAuthenticated: false }); },
  };
});
