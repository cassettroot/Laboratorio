import React, { useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { apiService } from '../api/services';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import EquipoRegisterModal from '../components/modals/EquipoRegisterModal';

export default function EquiposScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { role } = useContext(AuthContext);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiService.getEquipos();
      if (result.status === 'success') {
        setData(result.data || []);
      }
    } catch (e) {
      console.warn('Error loading equipos:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredData = data.filter(item => 
    item.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    item.no_inventario?.toLowerCase().includes(search.toLowerCase()) ||
    item.marca?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.itemName} numberOfLines={1}>{item.nombre}</Text>
        {item.no_inventario ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.no_inventario}</Text>
          </View>
        ) : null}
      </View>
      
      {item.caracteristicas_bien ? (
        <Text style={styles.itemDesc} numberOfLines={2}>{item.caracteristicas_bien}</Text>
      ) : null}
      
      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Marca</Text>
          <Text style={styles.detailValue}>{item.marca || 'N/A'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Modelo</Text>
          <Text style={styles.detailValue}>{item.modelo || 'N/A'}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={styles.detailLabel}>Estado</Text>
          <Text style={[styles.detailValue, { color: item.estado_bien === 'Bueno' ? '#34d399' : '#f59e0b' }]}>
            {item.estado_bien || 'Bueno'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar bien o equipo..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {role !== 'estudiante' ? (
          <TouchableOpacity 
            style={styles.addBtn}
            activeOpacity={0.8}
            onPress={() => setShowRegisterModal(true)}
          >
            <Text style={styles.addBtnText}>+ Registrar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList 
          data={filteredData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron bienes o equipos.</Text>
          }
        />
      )}

      {/* Modal de Registro Independiente para Bienes / Equipos */}
      <EquipoRegisterModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  itemDesc: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 2,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailValue: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 15,
  }
});
