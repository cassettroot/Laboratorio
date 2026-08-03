import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput
} from 'react-native';
import { apiService } from '../api/services';

export default function MaterialsScreen({ route, navigation }) {
  const initialTab = route.params?.initialTab || 'quimicos';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [chemMaterials, setChemMaterials] = useState([]);
  const [didMaterials, setDidMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMaterials = async () => {
    try {
      const [chemRes, didRes] = await Promise.all([
        apiService.getChemicalMaterials(),
        apiService.getDidacticMaterials(),
      ]);

      if (chemRes.status === 'success') setChemMaterials(chemRes.data || []);
      if (didRes.status === 'success') setDidMaterials(didRes.data || []);
    } catch (e) {
      console.warn("Error cargando materiales:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const currentList = activeTab === 'quimicos' ? chemMaterials : didMaterials;
  const filteredList = currentList.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q))
    );
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('Detail', { 
        type: activeTab === 'quimicos' ? 'chem_material' : 'did_material', 
        item 
      })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.quantity} {item.unit || 'piezas'}</Text>
        </View>
      </View>

      {item.category ? (
        <Text style={styles.category}>Categoría: {item.category}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.meta}>📍 {item.location || 'Sin ubicación'}</Text>

        {item.status ? (
          <Text style={[
            styles.status, 
            item.status === 'Disponible' || item.status === 'Bueno' ? styles.statusOk : styles.statusWarn
          ]}>
            {item.status}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'quimicos' && styles.activeTab]} 
          onPress={() => setActiveTab('quimicos')}
        >
          <Text style={[styles.tabText, activeTab === 'quimicos' && styles.activeTabText]}>
            Materiales Químicos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'didacticos' && styles.activeTab]} 
          onPress={() => setActiveTab('didacticos')}
        >
          <Text style={[styles.tabText, activeTab === 'didacticos' && styles.activeTabText]}>
            Materiales Didácticos
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por nombre, categoría o ubicación..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#94a3b8"
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMaterials(); }} tintColor="#0284c7" />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay materiales registrados en esta categoría.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#047857',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  category: {
    fontSize: 13,
    color: '#38bdf8',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  meta: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusOk: {
    color: '#34d399',
  },
  statusWarn: {
    color: '#fbbf24',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
