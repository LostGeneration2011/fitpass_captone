import { apiGet, apiPost } from './api';

// Package API
export const packageAPI = {
  // Get all available packages
  getPackages: async () => {
    try {
      console.log('📦 Calling apiGet for /packages');
      const data = await apiGet('/packages');
      console.log('📦 Package API - getPackages received data:', data);
      return data;
    } catch (error) {
      console.error('Package API - getPackages error:', error);
      throw error;
    }
  },

  // Get package by ID
  getPackageById: async (packageId: string) => {
    try {
      console.log('📦 Calling apiGet for /packages/' + packageId);
      const data = await apiGet(`/packages/${packageId}`);
      console.log('📦 Package API - getPackageById received data:', data);
      return data;
    } catch (error) {
      console.error('Package API - getPackageById error:', error);
      throw error;
    }
  }
};

// User Package API
export const userPackageAPI = {
  // Get user's purchased packages
  getUserPackages: async () => {
    try {
      console.log('📦 UserPackage API - Calling apiGet for /user-packages');
      const data = await apiGet('/user-packages');
      console.log('📦 UserPackage API - getUserPackages received data:', data);
      return data;
    } catch (error) {
      console.error('UserPackage API - getUserPackages error:', error);
      throw error;
    }
  },

  // Purchase a package
  purchasePackage: async (packageId: string) => {
    try {
      console.log('📦 UserPackage API - Calling apiPost for package purchase:', packageId);
      const data = await apiPost('/user-packages/purchase', { packageId });
      console.log('📦 UserPackage API - purchasePackage received data:', data);
      return data;
    } catch (error) {
      console.error('UserPackage API - purchasePackage error:', error);
      throw error;
    }
  },

  // Activate a purchased package
  activatePackage: async (userPackageId: string) => {
    try {
      console.log('📦 UserPackage API - Calling apiPost for package activation:', userPackageId);
      const data = await apiPost('/user-packages/activate', { userPackageId });
      console.log('📦 UserPackage API - activatePackage received data:', data);
      return data;
    } catch (error) {
      console.error('UserPackage API - activatePackage error:', error);
      throw error;
    }
  },

  // Use credits for session booking
  useCredits: async (sessionId: string, credits: number) => {
    try {
      console.log('📦 UserPackage API - Calling apiPost for credit usage:', { sessionId, credits });
      const data = await apiPost('/user-packages/use-credits', { sessionId, credits });
      console.log('📦 UserPackage API - useCredits received data:', data);
      return data;
    } catch (error) {
      console.error('UserPackage API - useCredits error:', error);
      throw error;
    }
  },

  // Get user's bookings
  getUserBookings: async (page: number = 1, limit: number = 10) => {
    try {
      console.log('📦 UserPackage API - Calling apiGet for bookings');
      const data = await apiGet(`/user-packages/bookings?page=${page}&limit=${limit}`);
      console.log('📦 UserPackage API - getUserBookings received data:', data);
      return data;
    } catch (error) {
      console.error('UserPackage API - getUserBookings error:', error);
      throw error;
    }
  }
};

// Payment API
export const paymentAPI = {
  // Create PayPal order
  createPayPalOrder: async (packageId: string, userPackageId?: string) => {
    try {
      console.log('💳 Payment API - Creating PayPal order for package:', packageId, 'userPackage:', userPackageId);
      const requestBody: any = { packageId };
      if (userPackageId) {
        requestBody.userPackageId = userPackageId;
      }
      const data = await apiPost('/payment/paypal/create-order', requestBody);
      console.log('💳 Payment API - createPayPalOrder received data:', data);
      return data;
    } catch (error) {
      console.error('Payment API - createPayPalOrder error:', error);
      throw error;
    }
  },

  // Capture PayPal payment
  capturePayPalPayment: async (orderId: string) => {
    try {
      console.log('💳 Payment API - Capturing PayPal payment for order:', orderId);
      const data = await apiPost('/payment/paypal/capture', { orderId });
      console.log('💳 Payment API - capturePayPalPayment received data:', data);
      return data;
    } catch (error) {
      console.error('Payment API - capturePayPalPayment error:', error);
      throw error;
    }
  },

  // Get payment status
  getPaymentStatus: async (userPackageId: string) => {
    try {
      console.log('💳 Payment API - Getting payment status for userPackage:', userPackageId);
      const data = await apiGet(`/payment/status/${userPackageId}`);
      console.log('💳 Payment API - getPaymentStatus received data:', data);
      return data;
    } catch (error) {
      console.error('Payment API - getPaymentStatus error:', error);
      throw error;
    }
  }
};