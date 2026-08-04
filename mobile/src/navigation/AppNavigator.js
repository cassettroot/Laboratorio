import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SubstancesScreen from '../screens/SubstancesScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import DetailScreen from '../screens/DetailScreen';
import RequestsScreen from '../screens/RequestsScreen';
import WarehouseScreen from '../screens/WarehouseScreen';
import LoansScreen from '../screens/LoansScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { role } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0f172a' },
        headerTitleStyle: { color: '#ffffff', fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ focused }) => {
          let icon = '🏠';
          if (route.name === 'Inicio') icon = '🏠';
          else if (route.name === 'Sustancias') icon = '🧪';
          else if (route.name === 'Materiales') icon = '📦';
          else if (route.name === 'Almacen') icon = '🏢';
          else if (route.name === 'Prestamos') icon = '🤝';
          else if (route.name === 'Solicitudes') icon = '📋';
          return <Text style={{ fontSize: 18 }}>{icon}</Text>;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Sustancias" component={SubstancesScreen} options={{ title: 'Sustancias' }} />
      <Tab.Screen name="Materiales" component={MaterialsScreen} options={{ title: 'Materiales' }} />
      {role !== 'estudiante' ? (
        <Tab.Screen name="Almacen" component={WarehouseScreen} options={{ title: 'Almacén' }} />
      ) : null}
      {role !== 'estudiante' ? (
        <Tab.Screen name="Prestamos" component={LoansScreen} options={{ title: 'Préstamos' }} />
      ) : null}
      {role !== 'estudiante' ? (
        <Tab.Screen name="Solicitudes" component={RequestsScreen} options={{ title: 'Solicitudes' }} />
      ) : null}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTitleStyle: { color: '#ffffff', fontWeight: 'bold' },
          headerTintColor: '#38bdf8',
        }}
      >
        {!user ? (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          <>
            <Stack.Screen 
              name="Main" 
              component={MainTabs} 
              options={{ headerShown: false }} 
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
