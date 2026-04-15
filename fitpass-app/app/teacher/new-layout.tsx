import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: '#1e293b',
          borderBottomColor: '#334155',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: '#ffffff',
          fontWeight: '600',
        },
        headerTintColor: '#ffffff',
      }}
    >
      <Tabs.Screen 
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen 
        name="classes"
        options={{
          title: 'Lớp học',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'briefcase' : 'briefcase-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen 
        name="sessions"
        options={{
          title: 'Buổi học',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'calendar' : 'calendar-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen 
        name="qr"
        options={{
          title: 'Mã QR',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'qr-code' : 'qr-code-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen 
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen 
        name="create-class"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen 
        name="create-session"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen 
        name="reports"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen 
        name="students"
        options={{
          href: null, // Hide from tabs
        }}
      />
    </Tabs>
  );
}