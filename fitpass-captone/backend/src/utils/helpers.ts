// Utility functions
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, length + 2);
};

export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};