import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StudentHomeScreen from './index';
import StudentClassesScreen from './classes';
import BookSessionsScreen from './book-sessions';
import ScheduleScreen from './schedule';
import StudentCheckInScreen from './checkin';
import StudentPackagesScreen from './packages';
import StudentProfileScreen from './profile';
import NotificationsScreen from '../notifications';
import StudentContactStack from './contact-stack';
import StudentForumScreen from './forum';
import { useTheme } from '../../lib/theme';
import { notificationAPI } from '../../lib/api';
import { getSocket } from '../../lib/socketio';

const Tab = createBottomTabNavigator();

export default function StudentTabNavigator() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const TAB_COUNT = 6;
  const tabWidth = useMemo(() => width / TAB_COUNT, [width]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    border: isDark ? '#1E293B' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#64748B' : '#94A3B8',
    active: '#60A5FA',
    headerButton: isDark ? '#1E293B' : '#E2E8F0',
    headerButtonText: isDark ? '#E2E8F0' : '#0F172A',
  };

  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const tabBarHeight = 58 + bottomInset;

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      const unreadCount =
        typeof response?.unreadCount === 'number'
          ? response.unreadCount
          : typeof response?.data?.unreadCount === 'number'
          ? response.data.unreadCount
          : typeof response?.count === 'number'
          ? response.count
          : 0;

      setUnreadNotifications(unreadCount);
    } catch (error) {
      console.error('Failed to load unread notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);

    // Real-time badge via Socket.IO
    const socket = getSocket();
    const handleNotification = () => {
      setUnreadNotifications((prev) => prev + 1);
    };
    if (socket) socket.on('notification', handleNotification);

    return () => {
      clearInterval(interval);
      if (socket) socket.off('notification', handleNotification);
    };
  }, [loadUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );

  const getTabLabel = (routeName: string) => {
    const fullLabels: Record<string, string> = {
      Dashboard: 'Tổng quan',
      Schedule: 'Lịch học',
      Classes: 'Lớp học',
      Contact: 'Liên hệ',
      Community: 'Cộng đồng',
      Profile: 'Hồ sơ',
    };

    const compactLabels: Record<string, string> = {
      Dashboard: 'Trang chủ',
      Schedule: 'Lịch',
      Classes: 'Lớp',
      Contact: 'Chat',
      Community: 'CĐ',
      Profile: 'Hồ sơ',
    };

    return (isCompact ? compactLabels : fullLabels)[routeName] || routeName;
  };

  return (
    <Tab.Navigator
      id="StudentTabs"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: any;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Schedule') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Contact') {
            iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={isCompact ? 24 : 26} color={color} />;
        },
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelPosition: 'below-icon',
        tabBarLabel: ({ color }) => (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            style={{
              color,
              fontSize: isCompact ? 10 : 11,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: 0,
              marginBottom: 4,
            }}
          >
            {getTabLabel(route.name)}
          </Text>
        ),
        tabBarLabelStyle: {
          fontSize: isCompact ? 10 : 11,
          fontWeight: '600',
          marginTop: 0,
          marginBottom: 4,
          textAlign: 'center',
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomInset,
          paddingLeft: 0,
          paddingRight: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        tabBarIconStyle: {
          alignSelf: 'center',
        },
        tabBarItemStyle: {
          flex: 1,
          maxWidth: tabWidth,
          minWidth: tabWidth,
          paddingHorizontal: 0,
          marginHorizontal: 0,
        },
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          borderBottomWidth: 2,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: '700',
          fontSize: 18,
        },
        headerTintColor: colors.text,
        headerRightContainerStyle: {
          paddingRight: Math.max(8, insets.right + 4),
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={StudentHomeScreen}
        options={({ navigation }) => ({
          title: 'Tổng quan',
          headerRight: () => (
            <TouchableOpacity
              style={[
                styles.headerButton,
                isCompact && styles.headerButtonCompact,
                styles.notificationButton,
                { backgroundColor: colors.headerButton },
              ]}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.active} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Schedule" 
        component={ScheduleScreen}
        options={({ navigation }) => ({
          title: 'Lịch học',
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, isCompact && styles.headerButtonCompact, { backgroundColor: colors.headerButton }]}
              onPress={() => navigation.navigate('Check-in')}
              activeOpacity={0.8}
            >
              <Ionicons name="qr-code" size={20} color={colors.active} />
              <Text style={[styles.headerButtonText, { color: colors.headerButtonText }]}>Điểm danh</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Classes" 
        component={StudentClassesScreen}
        options={({ navigation }) => ({
          title: 'Lớp học',
          headerRight: () => (
            <TouchableOpacity
              style={[styles.headerButton, isCompact && styles.headerButtonCompact, { backgroundColor: colors.headerButton }]}
              onPress={() => navigation.navigate('BookSessions')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={20} color={colors.active} />
              <Text style={[styles.headerButtonText, { color: colors.headerButtonText }]}>Đăng ký</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen 
        name="Contact" 
        component={StudentContactStack}
        options={{ title: 'Liên hệ' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={StudentProfileScreen}
        options={{ title: 'Hồ sơ' }}
      />
      <Tab.Screen
        name="Community"
        component={StudentForumScreen}
        options={{
          title: 'Cộng đồng',
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Thông báo',
          tabBarButton: () => null,
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Packages" 
        component={StudentPackagesScreen}
        options={{
          title: 'Gói tập',
          tabBarButton: () => null,
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="BookSessions" 
        component={BookSessionsScreen}
        options={{
          title: 'Đăng ký lớp',
          tabBarButton: () => null,
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Check-in" 
        component={StudentCheckInScreen}
        options={{
          title: 'Điểm danh',
          tabBarButton: () => null,
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerButtonCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headerButtonText: {
    color: '#E2E8F0',
    fontWeight: '600',
    marginLeft: 6,
  },
  notificationButton: {
    position: 'relative',
    justifyContent: 'center',
    minWidth: 44,
    paddingRight: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});