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

      const subCount = subRes.status === 'fulfilled' && subRes.value.data ? subRes.value.data.length : 0;
      const chemCount = chemRes.status === 'fulfilled' && chemRes.value.data ? chemRes.value.data.length : 0;
      const didCount = didRes.status === 'fulfilled' && didRes.value.data ? didRes.value.data.length : 0;
      
      let reqCount = 0;
      if (reqRes.status === 'fulfilled' && reqRes.value.data) {
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" />}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hola, <Text style={{fontWeight: 'bold'}}>{user}</Text></Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {role === 'admin' ? 'Administrador' : (role === 'estudiante' ? '🎓 Estudiante' : 'Responsable')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.qrBanner}
        onPress={() => navigation.navigate('QRScanner')}
      >
        <View style={styles.qrIconBox}>
          <Text style={styles.qrIconText}>📷</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.qrBannerTitle}>Escanear Código QR</Text>
          <Text style={styles.qrBannerDesc}>Apunta a la etiqueta de un reactivo o material para consultar su ficha inmediatamente.</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Resumen del Inventario</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{marginTop: 30}} />
      ) : (
        <View style={styles.grid}>
          <TouchableOpacity 
            style={[styles.card, {borderLeftColor: '#0284c7'}]}
            onPress={() => navigation.navigate('Sustancias')}
          >
            <Text style={styles.cardNum}>{stats.sustancias}</Text>
            <Text style={styles.cardLabel}>Sustancias Químicas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, {borderLeftColor: '#10b981'}]}
            onPress={() => navigation.navigate('Materiales', { initialTab: 'quimicos' })}
          >
            <Text style={styles.cardNum}>{stats.chemMaterials}</Text>
            <Text style={styles.cardLabel}>Materiales Químicos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, {borderLeftColor: '#f59e0b'}]}
            onPress={() => navigation.navigate('Materiales', { initialTab: 'didacticos' })}
          >
            <Text style={styles.cardNum}>{stats.didMaterials}</Text>
            <Text style={styles.cardLabel}>Materiales Didácticos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, {borderLeftColor: '#8b5cf6'}]}
            onPress={() => navigation.navigate('Solicitudes')}
          >
            <Text style={styles.cardNum}>{stats.pendingRequests}</Text>
            <Text style={styles.cardLabel}>Solicitudes Pendientes</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  greeting: {
    fontSize: 22,
    color: '#ffffff',
  },
  roleBadge: {
    backgroundColor: '#334155',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  roleText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  qrBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  qrIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0369a1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  qrIconText: {
    fontSize: 24,
  },
  qrBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  qrBannerDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 40,
  },
  card: {
    width: '47%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  cardNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
});
