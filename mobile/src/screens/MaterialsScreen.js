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
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';
import { getImageUrl } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function MaterialsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { role, user, logout, serverUrl, syncSignal } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const initialTab = route.params?.initialTab || 'quimicos';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [chemMaterials, setChemMaterials] = useState([]);
  const [didMaterials, setDidMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryId, setInventoryId] = useState('inventario');
  const [showSpaceModal, setShowSpaceModal] = useState(false);

  // Independent Modals
  const [showChemModal, setShowChemModal] = useState(false);
  const [showDidModal, setShowDidModal] = useState(false);

  const fetchMaterials = async () => {
    try {
      const savedInv = (await AsyncStorage.getItem('inventory_id')) || 'inventario';
      setInventoryId(savedInv);

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
  }, [syncSignal]);

  const handleSelectSpace = async (spaceId) => {
    await AsyncStorage.setItem('inventory_id', spaceId);
    setInventoryId(spaceId);
    setShowSpaceModal(false);
    fetchMaterials();
  };

  const getSpaceLabel = (id) => {
    if (id === 'oficina') return 'Oficina';
    if (id === 'sistemas') return 'Sistemas';
    return 'Química';
  };

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro de que deseas salir del sistema?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar Sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

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

  const getItemPieceCount = (item) => {
    if (!item) return 1;
    const rawContents = item.contents || item.container_content || '';
    if (rawContents) {
      if (typeof rawContents === 'string' && (rawContents.trim().startsWith('[') || rawContents.trim().startsWith('{'))) {
        try {
          const parsed = JSON.parse(rawContents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sum = parsed.reduce((acc, sub) => acc + (parseInt(sub.quantity, 10) || 1), 0);
            if (sum > 0) return sum;
          }
        } catch (e) {}
      } else if (Array.isArray(rawContents) && rawContents.length > 0) {
        const sum = rawContents.reduce((acc, sub) => acc + (parseInt(sub.quantity, 10) || 1), 0);
        if (sum > 0) return sum;
      }
    }
    return parseInt(item.quantity || item.stock || 1, 10);
  };

  // Dynamic Theme Colors
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(10, 20, 38, 0.84)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(6, 182, 212, 0.35)';
  const pillBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';
  const btnBg = isDark ? 'rgba(18, 38, 68, 0.85)' : 'rgba(241, 245, 249, 0.95)';
  const btnBorder = isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.30)';

  const renderItem = ({ item }) => {
    const photoUri = getImageUrl(item.image_path, serverUrl);
    const isChem = activeTab === 'quimicos';
    const isGoodCondition = item.status === 'Disponible' || item.status === 'Bueno' || item.condition === 'Excelente' || item.condition === 'Buenas Condiciones' || item.condition === 'Operativo';

    return (
      <View style={{ marginBottom: 14 }}>
        <View style={[styles.materialGlassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Header de la tarjeta */}
          <View style={styles.cardHeaderRow}>
            {/* Foto del Material */}
            <View style={[styles.itemImageContainer, { borderColor: cardBorder }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.itemThumbImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImagePlaceholder, { backgroundColor: isDark ? 'rgba(30, 48, 77, 0.6)' : 'rgba(226, 232, 240, 0.8)' }]}>
                  <Text style={{ fontSize: 26 }}>{isChem ? '🧪' : '🎓'}</Text>
                </View>
              )}
            </View>

            {/* Título y Categoría */}
            <View style={styles.itemNameCol}>
              <Text style={[styles.itemNameText, { color: textColor }]} numberOfLines={2}>
                {item.name || 'Material sin nombre'}
              </Text>
              
              <View style={styles.badgeTagsRow}>
                {item.category || item.subject ? (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText} numberOfLines={1}>
                      {item.category || item.subject}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.stockPill}>
                  <Text style={styles.stockPillText}>
                    {getItemPieceCount(item)} {item.unit || 'piezas'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Divisor Sutil */}
          <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

          {/* Metadata: Ubicación y Estado */}
          <View style={styles.cardMetaInfo}>
            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Ubicación:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                {item.location || 'Estante de Materiales'}
              </Text>
            </View>

            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>📋</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Estado:</Text>
              <View style={[styles.statePillContainer, !isGoodCondition && { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: 'rgba(234, 179, 8, 0.40)' }]}>
                <View style={[styles.stateGreenDot, !isGoodCondition && { backgroundColor: '#eab308' }]} />
                <Text style={[styles.stateGreenPillText, !isGoodCondition && { color: '#fbbf24' }]}>
                  {item.condition || item.status || 'Buenas Condiciones'}
                </Text>
              </View>
            </View>
          </View>

          {/* Botones de Acción */}
          <View style={styles.cardButtonsRow}>
            <TouchableOpacity
              style={[styles.cardNeumorphBtn, { backgroundColor: btnBg, borderColor: btnBorder }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Detail', { 
                type: isChem ? 'chem_material' : 'did_material', 
                item 
              })}
            >
              <Text style={[styles.cardBtnIcon, { color: isDark ? '#22d3ee' : '#0891b2' }]}>⛶</Text>
              <Text style={[styles.cardBtnText, { color: textColor }]}>Ver QR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardNeumorphBtn, { backgroundColor: btnBg, borderColor: btnBorder }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Detail', { 
                type: isChem ? 'chem_material' : 'did_material', 
                item 
              })}
            >
              <Text style={[styles.cardBtnIcon, { color: isDark ? '#38bdf8' : '#0284c7' }]}>✏️</Text>
              <Text style={[styles.cardBtnText, { color: textColor }]}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <GlassBackground>
      {/* 1. BARRA SUPERIOR ELEGANTE Y COMPACTA */}
      <View style={[styles.topHeader, { paddingTop: topInset + 8 }]}>
        {/* LOGO ITMA II LABORATORIO */}
        <View style={styles.headerLogoBox}>
          <View style={[styles.headerFlaskBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)', borderColor: cardBorder }]}>
            <Text style={styles.headerFlaskIcon}>⚗️</Text>
          </View>
          <View>
            <Text style={[styles.headerLogoTitle, { color: textColor }]}>ITMA II</Text>
            <Text style={[styles.headerLogoSubtitle, { color: subtextColor }]}>Laboratorio</Text>
          </View>
        </View>

        {/* Título de Pantalla al Costado (Sin emojis y con diseño integrado) */}
        <View style={[
          styles.screenTitleBadgePill, 
          { 
            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(6, 182, 212, 0.10)', 
            borderColor: isDark ? 'rgba(34, 211, 238, 0.35)' : 'rgba(6, 182, 212, 0.35)' 
          }
        ]}>
          <Text style={[styles.screenTitleBadgeText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>
            Catálogo de Materiales
          </Text>
        </View>
      </View>

      {/* 2. CONTENIDO PRINCIPAL */}
      <View style={styles.mainContentContainer}>
        {/* 3. Buscador Glassmorphic */}
        <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(13, 26, 48, 0.75)' : 'rgba(241, 245, 249, 0.90)', borderColor: cardBorder, marginTop: 2, marginBottom: 8 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Buscar por nombre, categoría o estante..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={subtextColor}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <Text style={{ color: subtextColor, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 4. Controles Segmentados e Botón Registrar */}
        <View style={styles.controlsRow}>
          <View style={[styles.segmentedControl, { backgroundColor: pillBg, borderColor: cardBorder }]}>
            <TouchableOpacity 
              style={[styles.segmentBtn, activeTab === 'quimicos' && { backgroundColor: isDark ? '#06b6d4' : '#0891b2' }]} 
              onPress={() => setActiveTab('quimicos')}
            >
              <Text style={[styles.segmentText, activeTab === 'quimicos' ? { color: '#ffffff', fontWeight: '900' } : { color: subtextColor }]}>
                🧪 Químicos ({chemMaterials.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.segmentBtn, activeTab === 'didacticos' && { backgroundColor: isDark ? '#06b6d4' : '#0891b2' }]} 
              onPress={() => setActiveTab('didacticos')}
            >
              <Text style={[styles.segmentText, activeTab === 'didacticos' ? { color: '#ffffff', fontWeight: '900' } : { color: subtextColor }]}>
                🎓 Didácticos ({didMaterials.length})
              </Text>
            </TouchableOpacity>
          </View>

          {role !== 'estudiante' ? (
            <TouchableOpacity 
              style={styles.addBtn} 
              activeOpacity={0.8}
              onPress={handleOpenRegister}
            >
              <LinearGradient
                colors={['#06b6d4', '#0284c7']}
                style={styles.addBtnGradient}
              >
                <Text style={styles.addBtnText}>+ Registrar</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 5. Lista de Materiales */}
        {loading ? (
          <ActivityIndicator size="large" color={isDark ? '#22d3ee' : '#0891b2'} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredList}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 115, paddingTop: 4 }}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchMaterials(); }}
                tintColor={isDark ? '#22d3ee' : '#0891b2'}
              />
            }
            ListEmptyComponent={
              <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>📦</Text>
                <Text style={[styles.emptyText, { color: subtextColor }]}>
                  No se encontraron materiales registrados.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* MODAL DE CAMBIO DE ESPACIO */}
      <Modal
        visible={showSpaceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpaceModal(false)}
      >
        <TouchableOpacity style={styles.quickModalOverlay} activeOpacity={1} onPress={() => setShowSpaceModal(false)}>
          <View style={[styles.quickModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: cardBorder }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: textColor }]}>📍 Seleccionar Espacio</Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>Elige el área de trabajo institucional:</Text>

            <TouchableOpacity
              style={[styles.quickOptionRow, inventoryId === 'inventario' && { borderColor: '#22d3ee', backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}
              onPress={() => handleSelectSpace('inventario')}
            >
              <Text style={{ fontSize: 22 }}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: textColor }]}>Laboratorio de Química</Text>
                <Text style={styles.quickOptionSub}>Reactivos, matraces y seguridad SGA</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOptionRow, inventoryId === 'oficina' && { borderColor: '#22d3ee', backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}
              onPress={() => handleSelectSpace('oficina')}
            >
              <Text style={{ fontSize: 22 }}>🏢</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: textColor }]}>Oficina de Gestión</Text>
                <Text style={styles.quickOptionSub}>Mobiliario y bienes de oficina</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOptionRow, inventoryId === 'sistemas' && { borderColor: '#22d3ee', backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}
              onPress={() => handleSelectSpace('sistemas')}
            >
              <Text style={{ fontSize: 22 }}>💻</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: textColor }]}>Sala de Sistemas</Text>
                <Text style={styles.quickOptionSub}>Equipos informáticos y periféricos</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickModalCloseBtn, { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)' }]} onPress={() => setShowSpaceModal(false)}>
              <Text style={[styles.quickModalCloseText, { color: subtextColor }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  headerLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerFlaskBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  headerFlaskIcon: {
    fontSize: 22,
  },
  headerLogoTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerLogoSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: -2,
  },
  screenTitleBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  screenTitleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  userBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  userAvatarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarLetter: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  userBadgeName: {
    fontSize: 12,
    fontWeight: '700',
  },
  spaceDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  spaceDropdownText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  spaceDropdownArrow: {
    fontSize: 11,
    fontWeight: '900',
  },
  mainContentContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  sectionHeaderBox: {
    marginBottom: 10,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sectionSubheading: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.2,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
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
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  addBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  materialGlassCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  itemThumbImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemNameCol: {
    flex: 1,
    justifyContent: 'center',
  },
  itemNameText: {
    fontSize: 15.5,
    fontWeight: '900',
    lineHeight: 20,
    marginBottom: 4,
  },
  badgeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.40)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryPillText: {
    color: '#06b6d4',
    fontSize: 10.5,
    fontWeight: '800',
  },
  stockPill: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.40)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stockPillText: {
    color: '#eab308',
    fontSize: 10.5,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  cardMetaInfo: {
    gap: 8,
    marginBottom: 12,
  },
  metaRowExact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaLabelText: {
    fontSize: 11.5,
    fontWeight: '700',
    width: 66,
  },
  metaValueText: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  statePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stateGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  stateGreenPillText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  cardButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardNeumorphBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardBtnIcon: {
    fontSize: 13,
  },
  cardBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quickModalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 20,
  },
  quickModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickModalSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  quickOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickOptionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  quickOptionSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  quickModalCloseBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickModalCloseText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
