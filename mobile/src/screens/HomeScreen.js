import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';

import AsyncStorage from '@react-native-async-storage/async-storage';

import SubstanceRegisterModal from '../components/modals/SubstanceRegisterModal';
import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';
import EquipoRegisterModal from '../components/modals/EquipoRegisterModal';
import RegistrationSelectorModal from '../components/modals/RegistrationSelectorModal';

export default function HomeScreen({ navigation }) {
  const { user, role, logout, syncSignal } = useContext(AuthContext);
  const { theme, themeName, changeTheme, themesList } = useContext(ThemeContext);
  const [stats, setStats] = useState({ sustancias: 0, chemMaterials: 0, didMaterials: 0, pendingRequests: 0, equipos: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryId, setInventoryId] = useState('inventario');
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Modales Independientes de Registro
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [showSubstanceModal, setShowSubstanceModal] = useState(false);
  const [showChemMaterialModal, setShowChemMaterialModal] = useState(false);
  const [showDidacticModal, setShowDidacticModal] = useState(false);
  const [showEquipoModal, setShowEquipoModal] = useState(false);

  const handleSelectRegistrationType = (type) => {
    if (type === 'substances') setShowSubstanceModal(true);
    else if (type === 'chemical_materials') setShowChemMaterialModal(true);
    else if (type === 'didactic_materials') setShowDidacticModal(true);
    else if (type === 'equipos') setShowEquipoModal(true);
  };

  const fetchStats = async () => {
    try {
      const savedInv = await AsyncStorage.getItem('inventory_id') || 'inventario';
      setInventoryId(savedInv);
      
      const [subRes, chemRes, didRes, reqRes] = await Promise.allSettled([
        apiService.getSubstances(),
        apiService.getChemicalMaterials(),
        apiService.getDidacticMaterials(),
        apiService.getChangeRequests(),
      ]);

      const subCount = subRes.status === 'fulfilled' && subRes.value?.data ? subRes.value.data.length : 0;
      const chemCount = chemRes.status === 'fulfilled' && chemRes.value?.data ? chemRes.value.data.length : 0;
      const didCount = didRes.status === 'fulfilled' && didRes.value?.data ? didRes.value.data.length : 0;
      
      let reqCount = 0;
      if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
        reqCount = reqRes.value.data.filter(r => r.status === 'PENDIENTE').length;
      }
      
      let eqCount = 0;
      if (savedInv !== 'inventario') {
        try {
          const res = await fetch(apiService.client.defaults.baseURL + '/api/equipos', {
            headers: { 'X-Inventory-Id': savedInv }
          });
          const data = await res.json();
          if (data.status === 'success') {
            eqCount = data.data.length;
          }
        } catch (e) {
          console.warn('Error fetching equipos count', e);
        }
      }

      setStats({
        sustancias: subCount,
        chemMaterials: chemCount,
        didMaterials: didCount,
        pendingRequests: reqCount,
        equipos: eqCount,
      });
    } catch (e) {
      console.warn("Error fetching dashboard stats:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [syncSignal]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };
  
  const cycleInventory = async () => {
    const nextInv = inventoryId === 'inventario' ? 'oficina' : (inventoryId === 'oficina' ? 'sistemas' : 'inventario');
    await AsyncStorage.setItem('inventory_id', nextInv);
    setInventoryId(nextInv);
    setLoading(true);
    fetchStats();
  };

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que deseas salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: logout }
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.brand} />}
    >
      {/* 1. Encabezado y Perfil de Usuario */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: theme.text }]}>
            Hola, <Text style={{ fontWeight: '800', color: theme.brand }}>{user || 'Estudiante'}</Text>
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: theme.accentBg || theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.roleText, { color: theme.brand }]}>
              {role === 'admin' ? '👑 ADMINISTRADOR' : (role === 'responsable' ? '🔑 RESPONSABLE' : '🎓 ESTUDIANTE')}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {role === 'estudiante' ? (
            <TouchableOpacity style={[styles.loginBtn, { backgroundColor: theme.brand }]} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginBtnText}>🔑 Iniciar Sesión</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.logoutIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={handleLogout} activeOpacity={0.7}>
              <Text style={{ fontSize: 11, color: '#f87171', fontWeight: '800' }}>🚪 Salir</Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
            <TouchableOpacity style={[styles.pillBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={cycleInventory}>
              <Text style={[styles.pillBtnText, { color: theme.subtext }]}>🔄 {inventoryId}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pillBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} onPress={() => setShowThemeModal(true)}>
              <Text style={[styles.pillBtnText, { color: theme.subtext }]}>🎨 {theme.name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Escanear Código QR (Full Width CTA Banner) */}
      <TouchableOpacity 
        style={[styles.qrBanner, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <View style={[styles.qrIconBox, { backgroundColor: theme.brand }]}>
          <Text style={styles.qrIconText}>📷</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.qrBannerTitle, { color: theme.text }]}>Escanear Código QR</Text>
          <Text style={[styles.qrBannerDesc, { color: theme.subtext }]}>
            Apunta a la etiqueta de un reactivo o material para consultar su ficha técnica inmediatamente.
          </Text>
        </View>
      </TouchableOpacity>

      {/* 3. Resumen del Inventario (Contrastes WCAG AAA) */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Resumen del Inventario</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 30 }} />
      ) : (
        <View style={styles.grid}>
          {inventoryId === 'inventario' ? (
            <>
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.metricBg || theme.cardBg, borderColor: theme.cardBorder, borderLeftColor: theme.brand }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Sustancias')}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🧪</Text>
                  <Text style={[styles.cardNum, { color: theme.metricText || '#ffffff' }]}>{stats.sustancias}</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.metricText || '#ffffff' }]}>Sustancias Químicas</Text>
                <Text style={styles.cardSub}>Reactivos y soluciones</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.metricBg || theme.cardBg, borderColor: theme.cardBorder, borderLeftColor: '#10b981' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Materiales', { initialTab: 'quimicos' })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>💧</Text>
                  <Text style={[styles.cardNum, { color: theme.metricText || '#ffffff' }]}>{stats.chemMaterials}</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.metricText || '#ffffff' }]}>Materiales Químicos</Text>
                <Text style={styles.cardSub}>Vidriería y utensilios</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.metricBg || theme.cardBg, borderColor: theme.cardBorder, borderLeftColor: '#f59e0b' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Materiales', { initialTab: 'didacticos' })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🎓</Text>
                  <Text style={[styles.cardNum, { color: theme.metricText || '#ffffff' }]}>{stats.didMaterials}</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.metricText || '#ffffff' }]}>Materiales Didácticos</Text>
                <Text style={styles.cardSub}>Modelos y muestras</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.metricBg || theme.cardBg, borderColor: theme.cardBorder, borderLeftColor: '#a855f7' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Solicitudes')}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>📋</Text>
                  <Text style={[styles.cardNum, { color: theme.metricText || '#ffffff' }]}>{stats.pendingRequests}</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.metricText || '#ffffff' }]}>Solicitudes Pendientes</Text>
                <Text style={styles.cardSub}>Cambios por aprobar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.metricBg || theme.cardBg, borderColor: theme.cardBorder, borderLeftColor: theme.brand }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Equipos')}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🖥️</Text>
                  <Text style={[styles.cardNum, { color: theme.metricText || '#ffffff' }]}>{stats.equipos || 0}</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.metricText || '#ffffff' }]}>Bienes y Equipos</Text>
                <Text style={styles.cardSub}>Inventario físico</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.metricBg || theme.cardBg, borderColor: theme.cardBorder, borderLeftColor: '#a855f7' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Solicitudes')}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>📋</Text>
                  <Text style={[styles.cardNum, { color: theme.metricText || '#ffffff' }]}>{stats.pendingRequests}</Text>
                </View>
                <Text style={[styles.cardLabel, { color: theme.metricText || '#ffffff' }]}>Solicitudes Pendientes</Text>
                <Text style={styles.cardSub}>Cambios por aprobar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 4. Acción Principal ("Nuevo Registro") */}
      {role !== 'estudiante' ? (
        <TouchableOpacity 
          style={[styles.mainCtaCard, { backgroundColor: theme.brand }]}
          activeOpacity={0.85}
          onPress={() => setShowSelectorModal(true)}
        >
          <View style={styles.mainCtaHeader}>
            <View style={styles.mainCtaIconBg}>
              <Text style={styles.mainCtaIconText}>➕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainCtaTitle}>Nuevo Registro</Text>
              <Text style={styles.mainCtaDesc}>Registrar Elemento o Equipo de forma guiada</Text>
            </View>
            <Text style={{ fontSize: 18, color: '#ffffff', fontWeight: 'bold' }}>➔</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Modales Independientes */}
      <RegistrationSelectorModal
        visible={showSelectorModal}
        onClose={() => setShowSelectorModal(false)}
        onSelectType={handleSelectRegistrationType}
      />

      <SubstanceRegisterModal
        visible={showSubstanceModal}
        onClose={() => setShowSubstanceModal(false)}
        onSuccess={fetchStats}
      />

      <ChemicalMaterialRegisterModal
        visible={showChemMaterialModal}
        onClose={() => setShowChemMaterialModal(false)}
        onSuccess={fetchStats}
      />

      <DidacticMaterialRegisterModal
        visible={showDidacticModal}
        onClose={() => setShowDidacticModal(false)}
        onSuccess={fetchStats}
      />

      <EquipoRegisterModal
        visible={showEquipoModal}
        onClose={() => setShowEquipoModal(false)}
        onSuccess={fetchStats}
      />

      {/* Modal Selector de Temas Visuales */}
      <Modal visible={showThemeModal} animationType="fade" transparent onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🎨 Seleccionar Tema Visual</Text>
            <Text style={[styles.modalSub, { color: theme.subtext }]}>Elige el tema de colores para la aplicación móvil:</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 }}>
              {themesList.map((t) => {
                const isSelected = t.id === themeName;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={{
                      width: '48%',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: t.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? t.brand : 'rgba(255,255,255,0.15)'
                    }}
                    onPress={() => {
                      changeTheme(t.id);
                      setShowThemeModal(false);
                    }}
                  >
                    <Text style={{ color: t.text, fontWeight: '800', fontSize: 11 }} numberOfLines={1}>{t.name}</Text>
                    {isSelected && <Text style={{ color: t.brand, fontWeight: '900', fontSize: 10 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: theme.brand, paddingVertical: 10 }]}
              onPress={() => setShowThemeModal(false)}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '400',
  },
  roleBadge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  logoutIconBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  pillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  qrBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  qrIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  qrIconText: {
    fontSize: 24,
  },
  qrBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  qrBannerDesc: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardNum: {
    fontSize: 24,
    fontWeight: '900',
  },
  cardLabel: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '500',
  },
  mainCtaCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  mainCtaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainCtaIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainCtaIconText: {
    fontSize: 20,
    color: '#ffffff',
  },
  mainCtaTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  mainCtaDesc: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  modalCloseBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
});
