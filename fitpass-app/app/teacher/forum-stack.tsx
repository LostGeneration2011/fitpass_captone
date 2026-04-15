import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import StudentForumScreen from '../student/forum';
import StudentForumProfileScreen from '../student/forum-profile';
import TeacherClassDetailScreen from './class-detail';

const Stack = createStackNavigator();

export default function TeacherForumStack() {
  return (
    <Stack.Navigator
      id="TeacherForumStack"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ForumMain" component={StudentForumScreen} />
      <Stack.Screen name="ForumProfile" component={StudentForumProfileScreen} />
      <Stack.Screen name="ClassDetail" component={TeacherClassDetailScreen} />
    </Stack.Navigator>
  );
}
