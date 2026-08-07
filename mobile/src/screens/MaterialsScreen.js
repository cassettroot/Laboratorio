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
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';
import { getImageUrl } from '../api/client';

import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';

export default function MaterialsScreen({ route, navigation }) {
  const { role, serverUrl } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
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
    const isChem = activeTab === 'quimicos';
    const avatarBg = isChem ? 'rgba(20, 184, 166, 0.15)' : 'rgba(99, 102, 241, 0.15)';
    const avatarBorder = isChem ? 'rgba(20, 184, 166, 0.35)' : 'rgba(99, 102, 241, 0.35)';
    const iconEmoji = isChem ? '🧪' : '🎓';

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Detail', { 
          type: isChem ? 'chem_material' : 'did_material', 
          item 
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ width: 56, height: 56, borderRadius: 12 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: avatarBg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: avatarBorder }}>
              <Text style={{ fontSize: 24 }}>{iconEmoji}</Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <View style={styles.cardHeader}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                {item.name || 'Material sin nombre'}
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.accentBg || 'rgba(56, 189, 248, 0.15)', borderColor: theme.brand }]}>
                <Text style={[styles.badgeText, { color: theme.brand }]}>
                  {item.quantity || item.stock || 1} {item.unit || 'piezas'}
                </Text>
              </View>
            </View>

            {item.category || item.subject ? (
              <Text style={[styles.category, { color: theme.brand }]} numberOfLines={1} ellipsizeMode="tail">
                {item.category || item.subject}
              </Text>
            ) : null}

            <View style={styles.cardFooter}>
              <Text style={[styles.meta, { flex: 1, marginRight: 8, color: theme.subtext }]} numberOfLines={1} ellipsizeMode="tail">
                📍 {item.location || 'Estante Principal'}
              </Text>
              {item.status || item.condition ? (
                <View style={[
                  styles.statusBadgeTag, 
                  item.status === 'Disponible' || item.status === 'Bueno' || item.condition === 'Excelente' ? styles.statusOkTag : styles.statusWarnTag
                ]}>
                  <Text style={item.status === 'Disponible' || item.status === 'Bueno' || item.condition === 'Excelente' ? styles.statusOkText : styles.statusWarnText} numberOfLines={1}>
                    {item.status || item.condition}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 1. Buscador Ancho Completo en Fila Superior */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar por nombre, categoría o ubicación..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={theme.subtext}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <Text style={{ color: theme.subtext, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 2. Controles Segmentados e Botón Registrar en Fila Inferior */}
      <View style={styles.controlsRow}>
        <View style={[styles.segmentedControl, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'quimicos' && { backgroundColor: theme.brand }]} 
            onPress={() => setActiveTab('quimicos')}
          >
            <Text style={[styles.segmentText, activeTab === 'quimicos' ? { color: '#ffffff', fontWeight: '800' } : { color: theme.subtext }]}>
              🧪 Químicos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.segmentBtn, activeTab === 'didacticos' && { backgroundColor: theme.brand }]} 
            onPress={() => setActiveTab('didacticos')}
          >
            <Text style={[styles.segmentText, activeTab === 'didacticos' ? { color: '#ffffff', fontWeight: '800' } : { color: theme.subtext }]}>
              🎓 Didácticos
            </Text>
          </TouchableOpacity>
        </View>

        {(role === 'admin' || role === 'responsable') ? (
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: theme.brand }]} 
            activeOpacity={0.8}
            onPress={handleOpenRegister}
          >
            <Text style={styles.addBtnText}>+ Registrar</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMaterials(); }} tintColor={theme.brand} />}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.subtext }]}>No hay materiales registrados en esta categoría.</Text>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5,
  },
  listContainer: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 14.5,
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
    fontSize: 10.5,
    fontWeight: '800',
  },
  category: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadgeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusOkTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  statusOkText: {
    color: '#34d399',
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusWarnTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  statusWarnText: {
    color: '#fbbf24',
    fontSize: 10.5,
    fontWeight: '800',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
});
