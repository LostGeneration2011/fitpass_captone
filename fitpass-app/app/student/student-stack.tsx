import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StudentTabNavigator from './_layout';
import BrowseClassesScreen from './browse-classes';
import StudentCheckInScreen from './checkin';
import StudentClassDetailScreen from './class-detail';
import StudentTeacherProfileScreen from './teacher-profile';
import StudentChatThreadScreen from './chat-thread';
import StudentForumProfileScreen from './forum-profile';

const Stack = createStackNavigator();

export default function StudentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="StudentTabs" 
        component={StudentTabNavigator} 
      />
      <Stack.Screen 
        name="BrowseClasses" 
        component={BrowseClassesScreen} 
      />
      <Stack.Screen 
        name="Scanner" 
        component={StudentCheckInScreen} 
      />
      <Stack.Screen 
        name="Attendance" 
        component={StudentCheckInScreen} 
      />
      <Stack.Screen 
        name="ClassDetail" 
        component={StudentClassDetailScreen} 
      />
      <Stack.Screen 
        name="TeacherProfile" 
        component={StudentTeacherProfileScreen} 
      />
      <Stack.Screen 
        name="ForumProfile" 
        component={StudentForumProfileScreen} 
      />
      <Stack.Screen 
        name="ChatThread" 
        component={StudentChatThreadScreen} 
      />
    </Stack.Navigator>
  );
}