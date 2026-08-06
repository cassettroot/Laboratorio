import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../api/services';

import AsyncStorage from '@react-native-async-storage/async-storage';

import SubstanceRegisterModal from '../components/modals/SubstanceRegisterModal';
import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';
import EquipoRegisterModal from '../components/modals/EquipoRegisterModal';
import RegistrationSelectorModal from '../components/modals/RegistrationSelectorModal';

export default function HomeScreen({ navigation }) {
  const { user, role, logout } = useContext(AuthContext);
  const [stats, setStats] = useState({ sustancias: 0, chemMaterials: 0, didMaterials: 0, pendingRequests: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryId, setInventoryId] = useState('inventario');

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

  const themes = {
    'inventario': { main: '#38bdf8', bg: '#0f172a', card: '#1e293b', name: 'Lab. de Química' },
    'oficina': { main: '#3b82f6', bg: '#0a192f', card: '#112240', name: 'Oficina' },
    'sistemas': { main: '#a855f7', bg: '#1a1025', card: '#2d1b42', name: 'Sistemas Electrónicos' }
  };
  const theme = themes[inventoryId] || themes['inventario'];

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
  }, []);

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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.main} />}
    >
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hola, <Text style={{fontWeight: '800', color: theme.main}}>{user || 'Estudiante'}</Text></Text>
          <View style={styles.roleBadge}>
            <Text style={[styles.roleText, { color: theme.main }]}>
              {role === 'admin' ? '👑 Administrador' : (role === 'responsable' ? '🔑 Responsable' : '🎓 Perfil Estudiante')}
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          {role === 'estudiante' ? (
            <TouchableOpacity style={[styles.loginBtn, { backgroundColor: theme.main }]} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginBtnText}>🔑 Iniciar Sesión</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>🚪 Salir</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={{ backgroundColor: theme.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.main }} onPress={cycleInventory}>
            <Text style={{ color: theme.main, fontSize: 10, fontWeight: 'bold' }}>🔄 {theme.name}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BANNER DE ESCANEO DE QR */}
      <TouchableOpacity 
        style={styles.qrBanner}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <View style={styles.qrIconBox}>
          <Text style={styles.qrIconText}>📷</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.qrBannerTitle}>Escanear Código QR</Text>
          <Text style={styles.qrBannerDesc}>Apunta a la etiqueta de un reactivo o material para consultar su ficha técnica inmediatamente.</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>📊 Resumen del Inventario</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{marginTop: 30}} />
      ) : (
        <View style={styles.grid}>
          {inventoryId === 'inventario' ? (
            <>
              <TouchableOpacity 
                style={[styles.card, { borderLeftColor: '#38bdf8' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Sustancias')}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🧪</Text>
                  <Text style={styles.cardNum}>{stats.sustancias}</Text>
                </View>
                <Text style={styles.cardLabel}>Sustancias Químicas</Text>
                <Text style={styles.cardSub}>Reactivos y soluciones</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { borderLeftColor: '#10b981' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Materiales', { initialTab: 'quimicos' })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>💧</Text>
                  <Text style={styles.cardNum}>{stats.chemMaterials}</Text>
                </View>
                <Text style={styles.cardLabel}>Materiales Químicos</Text>
                <Text style={styles.cardSub}>Vidriería y utensilios</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { borderLeftColor: '#f59e0b' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Materiales', { initialTab: 'didacticos' })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>🎓</Text>
                  <Text style={styles.cardNum}>{stats.didMaterials}</Text>
                </View>
                <Text style={styles.cardLabel}>Materiales Didácticos</Text>
                <Text style={styles.cardSub}>Modelos y muestras</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.card, { borderLeftColor: theme.main, width: '100%' }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Equipos')}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🖥️</Text>
                <Text style={styles.cardNum}>{stats.equipos || 0}</Text>
              </View>
              <Text style={styles.cardLabel}>Bienes y Equipos</Text>
              <Text style={styles.cardSub}>Inventario físico</Text>
            </TouchableOpacity>
          )}

          {role !== 'estudiante' ? (
            <>
              <TouchableOpacity 
                style={[styles.card, { borderLeftColor: '#a855f7' }]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Solicitudes')}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>📋</Text>
                  <Text style={styles.cardNum}>{stats.pendingRequests}</Text>
                </View>
                <Text style={styles.cardLabel}>Solicitudes Pendientes</Text>
                <Text style={styles.cardSub}>Cambios por aprobar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.card, { borderLeftColor: '#0d9488', width: '100%', backgroundColor: '#134e4a' }]}
                activeOpacity={0.8}
                onPress={() => setShowSelectorModal(true)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>➕</Text>
                  <Text style={[styles.cardNum, { fontSize: 18, color: '#2dd4bf' }]}>Nuevo Registro</Text>
                </View>
                <Text style={[styles.cardLabel, { color: '#ffffff' }]}>Registrar Elemento o Equipo</Text>
                <Text style={[styles.cardSub, { color: '#99f6e4' }]}>Formulario independiente según el tipo</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      )}

      {/* Selector e Independientes Modales */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 22,
    color: '#ffffff',
  },
  roleBadge: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  roleText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  loginBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  qrBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  qrIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  qrIconText: {
    fontSize: 26,
  },
  qrBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 3,
  },
  qrBannerDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardNum: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
  },
  cardLabel: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
