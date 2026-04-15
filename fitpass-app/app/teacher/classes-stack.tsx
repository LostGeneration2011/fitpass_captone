import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TeacherClasses from './classes';
import CreateClassScreen from './create-class';
import CreateSessionScreen from './create-session';
import EditClassScreen from './edit-class';
import TeacherClassDetailScreen from './class-detail';

const Stack = createStackNavigator();

export default function TeacherClassesStack() {
  return (
    <Stack.Navigator
      id="TeacherClassesStack"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ClassesList" 
        component={TeacherClasses} 
      />
      <Stack.Screen 
        name="CreateClass" 
        component={CreateClassScreen} 
      />
      <Stack.Screen 
        name="CreateSession" 
        component={CreateSessionScreen} 
      />
      <Stack.Screen 
        name="EditClass" 
        component={EditClassScreen} 
      />
      <Stack.Screen 
        name="ClassDetail" 
        component={TeacherClassDetailScreen} 
      />
    </Stack.Navigator>
  );
}