// Utility to clear all FitPass admin data from localStorage
export const clearAdminSession = () => {
  localStorage.removeItem('fitpass_admin_token');
  localStorage.removeItem('fitpass_admin_user');
  
  // Also clear any other potential auth keys
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('fitpass_admin') || key.startsWith('fitpass-admin')) {
      localStorage.removeItem(key);
    }
  });
};