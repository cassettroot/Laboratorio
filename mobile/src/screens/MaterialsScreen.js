import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../api/services';
import { getImageUrl } from '../api/client';

import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';

export default function MaterialsScreen({ route, navigation }) {
  const { role, serverUrl } = useContext(AuthContext);
  const initialTab = route.params?.initialTab || 'quimicos';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [chemMaterials, setChemMaterials] = useState([]);
  const [didMaterials, setDidMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Independent Modals
  const [showChemModal, setShowChemModal] = useState(false);
  const [showDidModal, setShowDidModal] = useState(false);

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

  const handleOpenRegister = () => {
    if (activeTab === 'quimicos') {
      setShowChemModal(true);
    } else {
      setShowDidModal(true);
    }
  };

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

  const renderItem = ({ item }) => {
    const photoUri = getImageUrl(item.image_path, serverUrl);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Detail', { 
          type: activeTab === 'quimicos' ? 'chem_material' : 'did_material', 
          item 
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 56, height: 56, borderRadius: 12 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ fontSize: 24 }}>{activeTab === 'quimicos' ? '💧' : '🎓'}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={styles.cardHeader}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.quantity || item.stock || 1} {item.unit || 'piezas'}</Text>
              </View>
            </View>

            {item.category || item.subject ? (
              <Text style={styles.category}>{item.category || item.subject}</Text>
            ) : null}

            <View style={styles.cardFooter}>
              <Text style={styles.meta}>📍 {item.location || 'Estante Principal'}</Text>
              {item.status || item.condition ? (
                <Text style={[
                  styles.status, 
                  item.status === 'Disponible' || item.status === 'Bueno' || item.condition === 'Excelente' ? styles.statusOk : styles.statusWarn
                ]}>
                  {item.status || item.condition}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={[styles.tabBar, { flex: 1, marginBottom: 0 }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'quimicos' && styles.activeTab]} 
            onPress={() => setActiveTab('quimicos')}
          >
            <Text style={[styles.tabText, activeTab === 'quimicos' && styles.activeTabText]}>
              Materiales Químicos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tab, activeTab === 'didacticos' && styles.activeTabDidactic]} 
            onPress={() => setActiveTab('didacticos')}
          >
            <Text style={[styles.tabText, activeTab === 'didacticos' && styles.activeTabText]}>
              Materiales Didácticos
            </Text>
          </TouchableOpacity>
        </View>

        {(role === 'admin' || role === 'responsable') ? (
          <TouchableOpacity 
            style={styles.addBtn} 
            activeOpacity={0.8}
            onPress={handleOpenRegister}
          >
            <Text style={styles.addBtnText}>+ Registrar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, categoría o ubicación..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
        />
      </View>

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

      {/* Independent Registration Modals */}
      <ChemicalMaterialRegisterModal
        visible={showChemModal}
        onClose={() => setShowChemModal(false)}
        onSuccess={fetchMaterials}
      />

      <DidacticMaterialRegisterModal
        visible={showDidModal}
        onClose={() => setShowDidModal(false)}
        onSuccess={fetchMaterials}
      />
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
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
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
  activeTabDidactic: {
    backgroundColor: '#4f46e5',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  addBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  category: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  meta: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  status: {
    fontSize: 11,
    fontWeight: '800',
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
