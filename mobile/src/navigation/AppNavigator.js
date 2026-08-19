import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SubstancesScreen from '../screens/SubstancesScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import DetailScreen from '../screens/DetailScreen';
import RequestsScreen from '../screens/RequestsScreen';
import LoansScreen from '../screens/LoansScreen';
import EquiposScreen from '../screens/EquiposScreen';
import SettingsScreen from '../screens/SettingsScreen';
import InventoryCheckScreen from '../screens/InventoryCheckScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { role, pendingRequestsCount } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: theme.headerBg,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.glassBorder,
        },
        headerTitleStyle: { color: theme.headerText, fontWeight: '900', fontSize: 18 },
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 20 : 12,
          left: 14,
          right: 14,
          height: 66,
          borderRadius: 34,
          backgroundColor: isDark ? 'rgba(9, 23, 44, 0.90)' : 'rgba(255, 255, 255, 0.94)',
          borderWidth: 1.2,
          borderColor: isDark ? 'rgba(34, 211, 238, 0.30)' : 'rgba(6, 182, 212, 0.35)',
          paddingBottom: 8,
          paddingTop: 6,
          paddingHorizontal: 6,
          elevation: isDark ? 20 : 8,
          shadowColor: isDark ? '#00f2fe' : '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.35 : 0.12,
          shadowRadius: 18,
        },
        tabBarActiveTintColor: isDark ? '#22d3ee' : '#0891b2',
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: -2 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home-outline';
          if (route.name === 'Inicio') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Sustancias') {
            iconName = focused ? 'flask' : 'flask-outline';
          } else if (route.name === 'Materiales') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Prestamos') {
            iconName = focused ? 'repeat' : 'repeat-outline';
          } else if (route.name === 'Ajustes') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          if (focused) {
            return (
              <View style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: isDark ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.15)',
                borderWidth: 1,
                borderColor: isDark ? '#22d3ee' : '#0891b2',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: isDark ? '#22d3ee' : '#0891b2',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDark ? 0.8 : 0.3,
                shadowRadius: 8,
                elevation: 4,
                marginTop: -4,
              }}>
                <Ionicons name={iconName} size={20} color={isDark ? '#22d3ee' : '#0891b2'} />
              </View>
            );
          }

          return (
            <Ionicons name={iconName} size={21} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Inicio', headerShown: false }} />
      <Tab.Screen name="Sustancias" component={SubstancesScreen} options={{ title: 'Sustancias', headerShown: false }} />
      {role !== 'estudiante' ? (
        <Tab.Screen name="Materiales" component={MaterialsScreen} options={{ title: 'Materiales', headerShown: false }} />
      ) : null}
      {role !== 'estudiante' ? (
        <Tab.Screen name="Prestamos" component={LoansScreen} options={{ title: 'Préstamos', headerShown: false }} />
      ) : null}
      <Tab.Screen name="Ajustes" component={SettingsScreen} options={{ title: 'Ajustes', headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Detail" component={DetailScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            <Stack.Screen name="Equipos" component={EquiposScreen} />
            <Stack.Screen name="Solicitudes" component={RequestsScreen} />
            <Stack.Screen name="Chequeo" component={InventoryCheckScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
