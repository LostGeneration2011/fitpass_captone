import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, Alert, ActivityIndicator, TouchableOpacity, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { packageAPI, userPackageAPI, paymentAPI } from '../../lib/packageAPI';
import { getUser } from '../../lib/auth';
import { refreshEmitter } from '../../lib/refreshEmitter';
import { useThemeClasses } from '../../lib/theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types/navigation'; // Adjust path as needed

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  credits: number;
  validDays: number;
  isActive: boolean;
}

interface UserPackage {
  id: string;
  userId: string;
  packageId: string;
  creditsLeft: number;
  expiresAt: string | null;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED';
  package: Package;
}



export default function PackagesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    isDark,
    screenClass,
    cardClass,
    textPrimary,
    textSecondary,
    textMuted,
  } = useThemeClasses();
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [userPackages, setUserPackages] = useState<UserPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [paymentCheckInterval, setPaymentCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    // Force clear any existing intervals when component mounts
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval);
      setPaymentCheckInterval(null);
    }
    setIsCheckingPayment(false);
    setPurchasing(null);
    setPaymentCompleted(false);
    
    loadData();
    
    // Listen for refresh events from other screens
    const unsubscribe = refreshEmitter.onRefresh((screenName) => {
      if (screenName === 'packagePurchase' || !screenName) {
        // Only load data, don't trigger any new refresh events
        loadData();
      }
    });
    
    return unsubscribe;
  }, []);

  // Auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Packages screen focused, refreshing data...');
      loadData();
    }, [])
  );

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        setPaymentCheckInterval(null);
      }
    };
  }, [paymentCheckInterval]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check if user is logged in first
      const user = await getUser();
      if (!user) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' } as any],
        });
        return;
      }

      const [packagesResponse, userPackagesResponse] = await Promise.all([
        packageAPI.getPackages().catch(err => {
          console.error('📦 getPackages error:', err);
          return { success: false, error: err.message };
        }),
        userPackageAPI.getUserPackages().catch(err => {
          console.error('📦 getUserPackages error:', err);
          return { success: false, error: err.message };
        })
      ]);

      if (packagesResponse.success) {
        setPackages(packagesResponse.data);
      } else if (packagesResponse.data) {
        // Fallback: sometimes response doesn't have success field
        setPackages(packagesResponse.data);
      } else {
        setPackages([]);
      }

      if (userPackagesResponse.success) {
        setUserPackages(userPackagesResponse.data);
      }
    } catch (error: any) {
      console.error('📦 Load packages error:', error);
      console.error('📦 Error details:', JSON.stringify(error, null, 2));
      
      // If auth error, redirect to login
      if (error.message?.includes('No auth token') || error.message?.includes('Unauthorized')) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' } as any],
        });
        return;
      }
      
      Alert.alert('Lỗi', 'Không thể tải danh sách gói tập');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkPaymentStatus = async (orderId: string, userPackageId: string) => {
    try {
      setIsCheckingPayment(true);
      
      // Single attempt to capture payment
      const captureResponse = await paymentAPI.capturePayPalPayment(orderId);
      
      if (captureResponse.success) {
        // Clear any intervals
        if (paymentCheckInterval) {
          clearInterval(paymentCheckInterval);
          setPaymentCheckInterval(null);
        }
        
        setPaymentCompleted(true);
        setPurchasing(null);
        setIsCheckingPayment(false);
        
        // Reload data và notify other screens
        await loadData();
        refreshEmitter.triggerRefresh('packagePurchase');
        
        Alert.alert(
          'Thanh toán thành công! 🎉',
          'Gói tập đã được kích hoạt. Credits đã được cập nhật.',
          [{ text: 'OK' }]
        );
      } else {
        setIsCheckingPayment(false);
      }
    } catch (error: any) {
      console.error('Payment check error:', error);
      setIsCheckingPayment(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const formatCredits = (credits: number | undefined | null) => {
    if (credits === null || credits === undefined) return 'Chưa xác định';
    return credits === -1 ? 'Không giới hạn' : `${credits} buổi`;
  };

  const formatValidDays = (days: number) => {
    return days === -1 ? 'Không giới hạn' : `${days} ngày`;
  };

  const handlePurchase = async (packageItem: Package) => {
    try {
      // Reset payment state
      setPaymentCompleted(false);
      
      // Check auth first
      const user = await getUser();
      if (!user) {
        Alert.alert('Lỗi', 'Vui lòng đăng nhập để mua gói tập');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' } as any],
        });
        return;
      }

      setPurchasing(packageItem.id);

      // Step 1: Create user package record
      const purchaseResponse = await userPackageAPI.purchasePackage(packageItem.id);
      
      if (!purchaseResponse.success) {
        console.error('💳 Purchase failed:', purchaseResponse.message);
        throw new Error(purchaseResponse.message);
      }

      const userPackageId = purchaseResponse.data.id;

      // Step 2: Create PayPal order
      const orderResponse = await paymentAPI.createPayPalOrder(packageItem.id, userPackageId);
      
      if (!orderResponse.success) {
        console.error('💳 PayPal order creation failed:', orderResponse.message);
        throw new Error(orderResponse.message);
      }

      // Step 3: Open PayPal in browser
      const { approvalUrl } = orderResponse.data;
      
      if (approvalUrl) {
        const canOpen = await Linking.canOpenURL(approvalUrl);
        if (canOpen) {
          await Linking.openURL(approvalUrl);
          
          // NO AUTOMATIC CHECKING - User manually checks when ready
          Alert.alert(
            'Complete PayPal Payment', 
            'Finish your payment in the browser, then return here and tap "Check Payment Status".',
            [
              { 
                text: 'Cancel', 
                style: 'cancel',
                onPress: () => {
                  setPurchasing(null);
                  setIsCheckingPayment(false);
                  setPaymentCompleted(false);
                }
              },
              { 
                text: 'Check Payment Status', 
                style: 'default',
                onPress: () => checkPaymentStatus(orderResponse.data.orderId, userPackageId)
              }
            ]
          );
        } else {
          throw new Error('Không thể mở liên kết PayPal');
        }
      } else {
        throw new Error('Không nhận được link thanh toán từ PayPal');
      }

    } catch (error: any) {
      console.error('💳 Purchase error details:', error);
      console.error('💳 Error message:', error.message);
      console.error('💳 Error stack:', error.stack);
      
      // Handle auth errors
      if (error.message?.includes('No auth token') || error.message?.includes('Unauthorized')) {
        Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' } as any],
        });
        return;
      }
      
      // Show specific error message
      const errorMessage = error.message || 'Không thể thực hiện thanh toán. Vui lòng thử lại.';
      Alert.alert('Lỗi thanh toán', errorMessage);
    } finally {
      setPurchasing(null);
      setIsCheckingPayment(false);
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        setPaymentCheckInterval(null);
      }
      // Don't reset paymentCompleted here to prevent alert from showing again
    }
  };

  const getPackageTier = (packageItem: Package): 'basic' | 'pro' | 'vip' => {
    const name = packageItem.name.toLowerCase();
    const price = packageItem.price;
    
    // Check by name first
    if (name.includes('vip') || name.includes('premium') || name.includes('cao cấp')) {
      return 'vip';
    }
    if (name.includes('pro') || name.includes('nâng cao') || name.includes('advanced')) {
      return 'pro';
    }
    // Check by price (assuming price > 2000000 = VIP, > 1000000 = Pro)
    if (price >= 2000000) {
      return 'vip';
    }
    if (price >= 1000000) {
      return 'pro';
    }
    return 'basic';
  };

  const getPackageStatus = (packageItem: Package) => {
    const userPackage = userPackages.find(up => up.packageId === packageItem.id && up.status === 'ACTIVE');
    
    if (userPackage) {
      const now = new Date();
      const expiresAt = userPackage.expiresAt ? new Date(userPackage.expiresAt) : null;
      
      if (expiresAt && now > expiresAt) {
        return { status: 'expired', text: 'Đã hết hạn', color: '#ff6b6b' };
      }
      
      if (userPackage.creditsLeft === 0) {
        return { status: 'exhausted', text: 'Đã hết lượt', color: '#ff6b6b' };
      }
      
      return { 
        status: 'active', 
        text: `Còn ${formatCredits(userPackage.creditsLeft)}`, 
        color: '#4CAF50' 
      };
    }
    
    return { status: 'available', text: 'Chưa kích hoạt', color: '#007AFF' };
  };

  if (loading) {
    return (
      <SafeAreaView className={`flex-1 ${screenClass}`}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className={`${textSecondary} mt-4 text-lg font-medium`}>Đang tải gói tập...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${screenClass}`}>
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={loading} 
            onRefresh={loadData}
            tintColor="#3b82f6"
          />
        }
      >
        <View className="px-6 pt-6 pb-4">
          <View 
            className="rounded-2xl p-6 mb-4"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 197, 253, 0.5)',
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
            }}
          >
            <View className="flex-row items-center mb-3">
              <View 
                className="bg-blue-600 p-3 rounded-full mr-3"
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="card" size={28} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className={`text-3xl font-black ${textPrimary} mb-1`}>Chọn Gói Tập</Text>
                <Text className={`${textSecondary} text-base`}>Chọn gói phù hợp với nhu cầu của bạn</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-4 space-y-4 pb-6">
          {(() => {
            return null;
          })()}
          {packages.length === 0 ? (
            <View className="rounded-2xl p-8 items-center mx-2"
                 style={{
                   backgroundColor: isDark ? '#1e293b' : '#ffffff',
                   borderWidth: 1,
                   borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(147, 197, 253, 0.5)',
                   shadowColor: '#3b82f6',
                   shadowOffset: { width: 0, height: 8 },
                   shadowOpacity: 0.25,
                   shadowRadius: 16,
                 }}>
              <View 
                className="p-6 rounded-full mb-4"
                style={{
                  backgroundColor: '#3b82f6',
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                }}
              >
                <Ionicons name="card-outline" size={36} color="#fff" />
              </View>
              <Text className={`text-2xl font-black ${textPrimary} mb-2`}>Chưa có gói tập</Text>
              <Text className={`${textSecondary} text-center text-base leading-6`}>
                Hiện tại chưa có gói tập nào được tạo
              </Text>
            </View>
          ) : (
            packages.map((packageItem) => {
            const status = getPackageStatus(packageItem);
            const isPurchasing = purchasing === packageItem.id;
            const tier = getPackageTier(packageItem);
            
            const getCardGradient = () => {
              // Active packages show green regardless of tier
              if (status.status === 'active') {
                return { 
                  from: 'rgba(34, 197, 94, 0.15)', 
                  to: 'rgba(22, 163, 74, 0.05)', 
                  borderColor: 'rgba(34, 197, 94, 0.3)', 
                  shadowColor: '#22c55e',
                  iconBg: '#22c55e',
                  priceColor: '#4ade80'
                };
              } 
              // Expired/exhausted packages show red
              else if (status.status === 'expired' || status.status === 'exhausted') {
                return { 
                  from: 'rgba(239, 68, 68, 0.15)', 
                  to: 'rgba(220, 38, 38, 0.05)', 
                  borderColor: 'rgba(239, 68, 68, 0.3)', 
                  shadowColor: '#ef4444',
                  iconBg: '#ef4444',
                  priceColor: '#f87171'
                };
              }
              
              // Available packages colored by tier
              switch (tier) {
                case 'vip':
                  return { 
                    from: 'rgba(251, 191, 36, 0.15)', 
                    to: 'rgba(245, 158, 11, 0.05)', 
                    borderColor: 'rgba(251, 191, 36, 0.3)', 
                    shadowColor: '#fbbf24',
                    iconBg: '#fbbf24',
                    priceColor: '#fcd34d'
                  };
                case 'pro':
                  return { 
                    from: 'rgba(168, 85, 247, 0.15)', 
                    to: 'rgba(147, 51, 234, 0.05)', 
                    borderColor: 'rgba(168, 85, 247, 0.3)', 
                    shadowColor: '#a855f7',
                    iconBg: '#a855f7',
                    priceColor: '#c084fc'
                  };
                default: // basic
                  return { 
                    from: 'rgba(59, 130, 246, 0.15)', 
                    to: 'rgba(37, 99, 235, 0.05)', 
                    borderColor: 'rgba(59, 130, 246, 0.3)', 
                    shadowColor: '#3b82f6',
                    iconBg: '#3b82f6',
                    priceColor: '#60a5fa'
                  };
              }
            };
            
            const gradient = getCardGradient();
            
            return (
              <View key={packageItem.id} className="rounded-2xl p-6 mx-2 mb-4"
                   style={{
                     backgroundColor: isDark ? '#1e293b' : '#ffffff',
                     borderWidth: 1,
                     borderColor: gradient.borderColor,
                     shadowColor: gradient.shadowColor,
                     shadowOffset: { width: 0, height: 8 },
                     shadowOpacity: 0.3,
                     shadowRadius: 16,
                   }}>
                {/* Gradient overlay */}
                <View 
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    backgroundColor: gradient.from,
                  }}
                />
                
                <View className="flex-row justify-between items-start mb-5">
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center flex-wrap mb-2">
                      <Text className={`text-2xl font-black ${textPrimary} mr-2`}>{packageItem.name}</Text>
                      <View 
                        className="px-3 py-1 rounded-full mt-1"
                        style={{
                          backgroundColor: tier === 'vip' ? 'rgba(251, 191, 36, 0.2)' : 
                                          tier === 'pro' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          borderWidth: 1,
                          borderColor: tier === 'vip' ? 'rgba(251, 191, 36, 0.4)' : 
                                      tier === 'pro' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)',
                        }}
                      >
                        <Text 
                          className="text-xs font-black"
                          style={{
                            color: tier === 'vip' ? '#fbbf24' : tier === 'pro' ? '#a855f7' : '#3b82f6'
                          }}
                        >
                          {tier === 'vip' ? '👑 VIP' : tier === 'pro' ? '⭐ PRO' : '💙 CƠ BẢN'}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-end">
                      <Text
                        className="text-4xl font-black"
                        style={{ color: gradient.priceColor }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {formatPrice(packageItem.price)}
                      </Text>
                      <Text className="text-2xl font-black ml-1" style={{ color: gradient.priceColor }}>đ</Text>
                    </View>
                  </View>
                  <View 
                    className="p-4 rounded-2xl"
                    style={{
                      backgroundColor: gradient.iconBg,
                      shadowColor: gradient.shadowColor,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.5,
                      shadowRadius: 12,
                    }}
                  >
                    <Ionicons 
                      name={tier === 'vip' ? 'diamond' : tier === 'pro' ? 'star' : 'card'} 
                      size={28} 
                      color="#fff" 
                    />
                  </View>
                </View>
                
                {packageItem.description && (
                  <Text className={`${textSecondary} text-base mb-5 leading-6`}>{packageItem.description}</Text>
                )}
                
                <View className="space-y-3 mb-5">
                  <View 
                    className="flex-row items-center rounded-xl p-3"
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <View className="bg-blue-600/30 p-2 rounded-lg mr-3">
                      <Ionicons name="fitness" size={20} color="#60a5fa" />
                    </View>
                    <Text className={`${textSecondary} text-base flex-1`}>Số buổi tập:</Text>
                    <Text className={`${textPrimary} text-base font-black`}>{formatCredits(packageItem.credits)}</Text>
                  </View>
                  
                  <View 
                    className="flex-row items-center rounded-xl p-3"
                    style={{
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(168, 85, 247, 0.2)',
                    }}
                  >
                    <View className="bg-purple-600/30 p-2 rounded-lg mr-3">
                      <Ionicons name="time" size={20} color="#c084fc" />
                    </View>
                    <Text className={`${textSecondary} text-base flex-1`}>Thời gian sử dụng:</Text>
                    <Text className={`${textPrimary} text-base font-black`}>{formatValidDays(packageItem.validDays)}</Text>
                  </View>
                </View>

                <View 
                  className="mb-5 rounded-xl p-4"
                  style={{
                    backgroundColor: status.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 
                                    status.status === 'expired' || status.status === 'exhausted' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    borderWidth: 1,
                    borderColor: status.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 
                                status.status === 'expired' || status.status === 'exhausted' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <View 
                      className="p-2 rounded-lg mr-2"
                      style={{
                        backgroundColor: status.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 
                                        status.status === 'expired' || status.status === 'exhausted' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      <Ionicons 
                        name={status.status === 'active' ? 'checkmark-circle' : 
                             status.status === 'expired' || status.status === 'exhausted' ? 'close-circle' : 'information-circle-outline'} 
                        size={20} 
                        color={status.color} 
                      />
                    </View>
                    <Text 
                      className="text-base font-black"
                      style={{ color: status.color }}
                    >
                      {status.text}
                    </Text>
                  </View>
                </View>

                {(status.status === 'available' || status.status === 'expired' || status.status === 'exhausted') && (
                  <TouchableOpacity
                    className="rounded-xl py-5 items-center"
                    style={{
                      backgroundColor: isPurchasing || isCheckingPayment ? '#475569' : '#3b82f6',
                      shadowColor: isPurchasing || isCheckingPayment ? 'transparent' : '#3b82f6',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.4,
                      shadowRadius: 16,
                      borderWidth: 2,
                      borderColor: isPurchasing || isCheckingPayment ? '#64748b' : 'rgba(147, 51, 234, 0.5)',
                    }}
                    onPress={() => handlePurchase(packageItem)}
                    disabled={isPurchasing || isCheckingPayment}
                  >
                    {isPurchasing ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator color="#fff" size="small" />
                        <Text className="text-white text-lg font-black ml-3">Đang xử lý...</Text>
                      </View>
                    ) : isCheckingPayment ? (
                      <View className="flex-row items-center">
                        <ActivityIndicator color="#fff" size="small" />
                        <Text className="text-white text-lg font-black ml-3">Kiểm tra thanh toán...</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center">
                        <View className="bg-white/20 p-2 rounded-lg mr-3">
                          <Ionicons name="card" size={24} color="#fff" />
                        </View>
                        <Text className="text-white text-lg font-black">
                          {status.status === 'available' ? 'Mua Gói Ngay' : 'Mua Lại Gói'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}