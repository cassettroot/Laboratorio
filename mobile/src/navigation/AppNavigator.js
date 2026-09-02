import React, { useContext } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform, TouchableOpacity } from 'react-native';
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

function FloatingLoanBanner({ alertData, onDismiss, onNavigate }) {
  if (!alertData) return null;

  return (
    <View style={{
      position: 'absolute',
      top: Platform.OS === 'ios' ? 52 : 38,
      left: 14,
      right: 14,
      zIndex: 99999,
      backgroundColor: 'rgba(11, 25, 48, 0.96)',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: '#22d3ee',
      padding: 14,
      shadowColor: '#22d3ee',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 12,
      elevation: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444' }} />
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '900' }}>
            {alertData.title}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={{ padding: 4 }}>
          <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: '#cbd5e1', fontSize: 12.5, lineHeight: 17, marginBottom: 10 }}>
        {alertData.message}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 11.5, fontWeight: 'bold' }}>Descartar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            onDismiss();
            onNavigate();
          }}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 10,
            backgroundColor: '#06b6d4',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 11.5, fontWeight: '900' }}>🚀 Ver Préstamos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MainTabs() {
  const { role, pendingRequestsCount, pendingLoansCount } = useContext(AuthContext);
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

          const hasBadge = (route.name === 'Prestamos' && pendingLoansCount > 0);

          if (focused) {
            return (
              <View style={{ position: 'relative' }}>
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
                {hasBadge && (
                  <View style={{
                    position: 'absolute',
                    top: -6,
                    right: -4,
                    backgroundColor: '#ef4444',
                    borderRadius: 9,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 3,
                    borderWidth: 1.5,
                    borderColor: isDark ? '#090d16' : '#ffffff'
                  }}>
                    <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '900' }}>
                      {pendingLoansCount > 9 ? '9+' : pendingLoansCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          return (
            <View style={{ position: 'relative' }}>
              <Ionicons name={iconName} size={21} color={color} />
              {hasBadge && (
                <View style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  backgroundColor: '#ef4444',
                  borderRadius: 9,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 3,
                  borderWidth: 1.5,
                  borderColor: isDark ? '#090d16' : '#ffffff'
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '900' }}>
                    {pendingLoansCount > 9 ? '9+' : pendingLoansCount}
                  </Text>
                </View>
              )}
            </View>
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
  const { user, loading, floatingLoanAlert, dismissFloatingAlert } = useContext(AuthContext);
  const navigationRef = useNavigationContainerRef();

  if (loading) {
    return null;
  }

  const handleNavigateToLoans = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Main', { screen: 'Prestamos' });
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      <FloatingLoanBanner
        alertData={floatingLoanAlert}
        onDismiss={dismissFloatingAlert}
        onNavigate={handleNavigateToLoans}
      />
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
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
