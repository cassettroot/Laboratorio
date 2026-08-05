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

export default function HomeScreen({ navigation }) {
  const { user, role, logout } = useContext(AuthContext);
  const [stats, setStats] = useState({ sustancias: 0, chemMaterials: 0, didMaterials: 0, pendingRequests: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
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

      setStats({
        sustancias: subCount,
        chemMaterials: chemCount,
        didMaterials: didCount,
        pendingRequests: reqCount,
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

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hola, <Text style={{fontWeight: '800', color: '#38bdf8'}}>{user || 'Estudiante'}</Text></Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {role === 'admin' ? '👑 Administrador' : (role === 'responsable' ? '🔑 Responsable' : '🎓 Perfil Estudiante')}
            </Text>
          </View>
        </View>

        {role === 'estudiante' ? (
          <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginBtnText}>🔑 Iniciar Sesión</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>🚪 Salir</Text>
          </TouchableOpacity>
        )}
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

          {role !== 'estudiante' ? (
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
          ) : null}
        </View>
      )}
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
