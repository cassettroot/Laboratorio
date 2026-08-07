import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

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

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { role } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: theme.headerBg },
        headerTitleStyle: { color: theme.headerText, fontWeight: '800', fontSize: 17 },
        tabBarStyle: {
          backgroundColor: theme.cardBg,
          borderTopColor: theme.cardBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.subtext,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: -2 },
        tabBarIcon: ({ focused }) => {
          let icon = '🏠';
          if (route.name === 'Inicio') icon = '🏠';
          else if (route.name === 'Sustancias') icon = '🧪';
          else if (route.name === 'Materiales') icon = '📦';
          else if (route.name === 'Prestamos') icon = '🤝';
          else if (route.name === 'Solicitudes') icon = '📋';
          else if (route.name === 'Ajustes') icon = '⚙️';
          return (
            <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.6 }}>
              {icon}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Sustancias" component={SubstancesScreen} options={{ title: 'Sustancias' }} />
      {role !== 'estudiante' ? (
        <Tab.Screen name="Materiales" component={MaterialsScreen} options={{ title: 'Materiales' }} />
      ) : null}
      {role !== 'estudiante' ? (
        <Tab.Screen name="Prestamos" component={LoansScreen} options={{ title: 'Préstamos' }} />
      ) : null}
      {role !== 'estudiante' ? (
        <Tab.Screen name="Solicitudes" component={RequestsScreen} options={{ title: 'Solicitudes' }} />
      ) : null}
      <Tab.Screen name="Ajustes" component={SettingsScreen} options={{ title: 'Ajustes' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.headerBg },
          headerTitleStyle: { color: theme.headerText, fontWeight: 'bold' },
          headerTintColor: theme.brand,
        }}
      >
        <Stack.Screen 
          name="Main" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Acceso Administrativo' }} 
        />
        <Stack.Screen 
          name="QRScanner" 
          component={QRScannerScreen} 
          options={{ title: 'Escanear QR' }} 
        />
        <Stack.Screen 
          name="Detail" 
          component={DetailScreen} 
          options={{ title: 'Ficha Detallada' }} 
        />
        <Stack.Screen 
          name="Equipos" 
          component={EquiposScreen} 
          options={{ title: 'Bienes y Equipos' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
