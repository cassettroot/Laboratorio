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
import { ThemeContext } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import EquipoRegisterModal from '../components/modals/EquipoRegisterModal';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

export default function EquiposScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { role } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

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
      activeOpacity={0.8}
      style={{ marginBottom: 12 }}
    >
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>{item.nombre}</Text>
          {item.no_inventario ? (
            <View style={[styles.badge, { backgroundColor: theme.accentBg, borderColor: theme.glassBorderGlow }]}>
              <Text style={[styles.badgeText, { color: theme.brand }]}>{item.no_inventario}</Text>
            </View>
          ) : null}
        </View>
        
        {item.caracteristicas_bien ? (
          <Text style={[styles.itemDesc, { color: theme.subtext }]} numberOfLines={2}>{item.caracteristicas_bien}</Text>
        ) : null}
        
        <View style={styles.detailsRow}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.subtext }]}>Marca</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{item.marca || 'N/A'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.subtext }]}>Modelo</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{item.modelo || 'N/A'}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.subtext }]}>Estado</Text>
            <Text style={[styles.detailValue, { color: item.estado_bien === 'Bueno' ? '#34d399' : '#f59e0b', fontWeight: '800' }]}>
              {item.estado_bien || 'Bueno'}
            </Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <GlassBackground>
      <View style={styles.container}>
        {/* Top Controls */}
        <View style={styles.topBar}>
          <View style={[styles.searchContainer, { backgroundColor: theme.glassInput, borderColor: theme.glassBorder }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput 
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Buscar bien o equipo..."
              placeholderTextColor={theme.subtext}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {role !== 'estudiante' ? (
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: theme.brand }]}
              activeOpacity={0.8}
              onPress={() => setShowRegisterModal(true)}
            >
              <Text style={styles.addBtnText}>+ Registrar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList 
            data={filteredData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.subtext }]}>No se encontraron bienes o equipos.</Text>
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
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontWeight: '600',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
    fontWeight: '600',
  }
});
