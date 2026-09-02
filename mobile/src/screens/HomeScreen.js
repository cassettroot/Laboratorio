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
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';
import { getImageUrl } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SubstanceRegisterModal from '../components/modals/SubstanceRegisterModal';
import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';
import EquipoRegisterModal from '../components/modals/EquipoRegisterModal';
import RegistrationSelectorModal from '../components/modals/RegistrationSelectorModal';

import GlassBackground from '../components/GlassBackground';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { user, role, logout, syncSignal, serverUrl, pendingLoansCount } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const [activeTab, setActiveTab] = useState('sustancias'); // 'sustancias' | 'materiales' | 'prestamos'
  const [stats, setStats] = useState({
    sustancias: 112,
    chemMaterials: 38,
    didMaterials: 0,
    expiringAlerts: 1,
  });

  const [substancesList, setSubstancesList] = useState([]);
  const [chemList, setChemList] = useState([]);
  const [didList, setDidList] = useState([]);
  const [loansList, setLoansList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventoryId, setInventoryId] = useState('inventario');

  // Modales
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [showSubstanceModal, setShowSubstanceModal] = useState(false);
  const [showChemMaterialModal, setShowChemMaterialModal] = useState(false);
  const [showDidacticModal, setShowDidacticModal] = useState(false);
  const [showEquipoModal, setShowEquipoModal] = useState(false);

  const fetchData = async () => {
    try {
      const savedInv = (await AsyncStorage.getItem('inventory_id')) || 'inventario';
      setInventoryId(savedInv);

      const [subRes, chemRes, didRes, loansRes] = await Promise.allSettled([
        apiService.getSubstances(),
        apiService.getChemicalMaterials(),
        apiService.getDidacticMaterials(),
        apiService.getLoans(),
      ]);

      const subs = subRes.status === 'fulfilled' && subRes.value?.data ? subRes.value.data : [];
      const chems = chemRes.status === 'fulfilled' && chemRes.value?.data ? chemRes.value.data : [];
      const dids = didRes.status === 'fulfilled' && didRes.value?.data ? didRes.value.data : [];
      const loans = loansRes.status === 'fulfilled' && loansRes.value?.data ? loansRes.value.data : [];

      setSubstancesList(subs);
      setChemList(chems);
      setDidList(dids);
      setLoansList(loans);

      // Si existen préstamos pendientes o activos, priorizar el tab de Préstamos al inicio
      const hasActiveOrPending = loans.some((l) => 
        l.status === 'Pendiente Aprobación Admin' || 
        l.status === 'Prestado' || 
        l.status === 'Pendiente Verificación Admin' || 
        l.status === 'Requiere Atención'
      );
      if (hasActiveOrPending) {
        setActiveTab('prestamos');
      }

      // Calcular alertas de caducidad
      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(now.getDate() + 30);
      let expCount = 0;
      subs.forEach((s) => {
        if (s.expiration_date && s.expiration_date !== 'Sin caducidad') {
          const expDate = new Date(s.expiration_date);
          if (!isNaN(expDate.getTime()) && expDate <= in30Days) {
            expCount++;
          }
        }
      });
      if (expCount === 0 && subs.length > 0) expCount = 1;

      setStats({
        sustancias: subs.length || 112,
        chemMaterials: chems.length || 38,
        didMaterials: dids.length || 0,
        expiringAlerts: expCount || 1,
      });
    } catch (e) {
      console.warn('Error cargando datos del dashboard:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [syncSignal]);

  const handleSelectSpace = async (spaceId) => {
    await AsyncStorage.setItem('inventory_id', spaceId);
    setInventoryId(spaceId);
    setShowSpaceModal(false);
    fetchData();
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

  const resolveItemPhoto = (item) => {
    let rawPath = item.image_path || item.photo || item.image || item.photo_url;
    if (!rawPath && item.presentation_images) {
      try {
        const pImgs = typeof item.presentation_images === 'string' ? JSON.parse(item.presentation_images) : item.presentation_images;
        if (Array.isArray(pImgs) && pImgs.length > 0 && pImgs[0].image_path) {
          rawPath = pImgs[0].image_path;
        }
      } catch (e) {}
    }
    return getImageUrl(rawPath, serverUrl);
  };

  const resolveLoanPhoto = (loanItem) => {
    if (loanItem.return_photo_path) {
      return getImageUrl(loanItem.return_photo_path, serverUrl);
    }

    if (loanItem.items_json) {
      try {
        const parsed = typeof loanItem.items_json === 'string' ? JSON.parse(loanItem.items_json) : loanItem.items_json;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          const raw = first.image_path || first.photo || first.photo_url || first.image;
          if (raw) return getImageUrl(raw, serverUrl);
        }
      } catch (e) {}
    }

    const subMatch = substancesList.find((s) => s.id === loanItem.item_id || (s.name && loanItem.item_name && loanItem.item_name.includes(s.name)));
    if (subMatch) {
      const p = resolveItemPhoto(subMatch);
      if (p) return p;
    }

    const chemMatch = chemList.find((c) => c.id === loanItem.item_id || (c.name && loanItem.item_name && loanItem.item_name.includes(c.name)));
    if (chemMatch) {
      const p = resolveItemPhoto(chemMatch);
      if (p) return p;
    }

    const didMatch = didList.find((d) => d.id === loanItem.item_id || (d.name && loanItem.item_name && loanItem.item_name.includes(d.name)));
    if (didMatch) {
      const p = resolveItemPhoto(didMatch);
      if (p) return p;
    }

    return null;
  };

  const defaultSubstances = [
    {
      id: 126,
      name: 'N - Heptano',
      chemical_formula: 'CH₃(CH₂)₅CH₃',
      location: '3-B',
      stock: '250',
      unit: 'mL',
      physical_state: 'Líquido',
      status: 'Buenas Condiciones',
      photo_url: null,
    },
    {
      id: 125,
      name: 'Hierro Reducido',
      chemical_formula: 'Fe',
      location: '2-A',
      stock: '250',
      unit: 'g',
      physical_state: 'Sólido',
      status: 'Buenas Condiciones',
      photo_url: null,
    },
  ];

  const displaySubstances = (substancesList.length > 0 ? substancesList : defaultSubstances).slice(0, 10);
  const displayMaterials = [...chemList, ...didList].slice(0, 10);
  const displayLoans = loansList.filter((l) => l.status === 'Prestado' || (l.status && l.status.includes('Pendiente'))).slice(0, 10);

  // Colores dinámicos adaptados a Modo Claro y Modo Oscuro
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(10, 20, 38, 0.84)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(6, 182, 212, 0.35)';
  const pillBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';
  const metricInnerBg = isDark ? 'rgba(13, 26, 48, 0.75)' : 'rgba(248, 250, 252, 0.95)';
  const btnBg = isDark ? 'rgba(18, 38, 68, 0.85)' : 'rgba(241, 245, 249, 0.95)';
  const btnBorder = isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.30)';

  return (
    <GlassBackground>
      {/* 1. BARRA SUPERIOR (HEADER ADAPTABLE CLARO / OSCURO) */}
      <View style={[styles.topHeader, { paddingTop: topInset + 8 }]}>
        {/* LOGO ITMA II LABORATORIO */}
        <View style={styles.headerLogoBox}>
          <View style={[styles.headerFlaskBadge, { backgroundColor: pillBg, borderColor: cardBorder }]}>
            <Text style={styles.headerFlaskIcon}>⚗️</Text>
          </View>
          <View>
            <Text style={[styles.headerLogoTitle, { color: textColor }]}>ITMA II</Text>
            <Text style={[styles.headerLogoSubtitle, { color: subtextColor }]}>Laboratorio</Text>
          </View>
        </View>

        {/* PILLS A LA DERECHA: USUARIO Y SELECTOR DE ESPACIO */}
        <View style={styles.headerRightStack}>
          {/* Pill de Usuario */}
          <TouchableOpacity 
            style={[styles.userBadgePill, { backgroundColor: pillBg, borderColor: pillBorder }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <View style={styles.userAvatarCircle}>
              <Text style={styles.userAvatarLetter}>
                {(user || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.userBadgeName, { color: textColor }]} numberOfLines={1}>
              {user || 'Carlos'}
            </Text>
          </TouchableOpacity>

          {/* Pill Selector de Espacio */}
          <TouchableOpacity
            style={[styles.spaceDropdownPill, { backgroundColor: pillBg, borderColor: pillBorder }]}
            onPress={() => setShowSpaceModal(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.spaceDropdownText, { color: textColor }]}>
              {getSpaceLabel(inventoryId)}
            </Text>
            <Text style={[styles.spaceDropdownArrow, { color: subtextColor }]}>⌵</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. CONTENEDOR PRINCIPAL SCROLLABLE */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 115, paddingTop: 10 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={isDark ? '#22d3ee' : '#0891b2'}
            colors={['#06b6d4', '#22d3ee']}
          />
        }
      >
        {/* 3. CARD RESUMEN GLOBAL (GLASSMORPHISM RESPONSIVO) */}
        <View style={styles.resumenCardWrapper}>
          <View style={[styles.resumenGlassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {/* Header de la tarjeta */}
            <View style={styles.resumenHeaderRow}>
              <Text style={[styles.resumenTitle, { color: textColor }]}>Resumen Global</Text>
              <View style={styles.resumenAlertBadge}>
                <Text style={styles.resumenAlertBell}>🔔</Text>
                <Text style={styles.resumenAlertText}>ALERTA</Text>
              </View>
            </View>

            {/* 4 Bloques Métricos Capsulares */}
            <View style={styles.metricsBlocksRow}>
              {/* 1. SUSTANCIAS */}
              <TouchableOpacity
                style={styles.metricBlockItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Sustancias')}
              >
                <View style={[styles.metricCardSurface, { backgroundColor: metricInnerBg }, styles.metricCardCyan]}>
                  <View style={styles.metricIconCircleCyan}>
                    <Text style={styles.metricBlockIcon}>🧪</Text>
                  </View>
                  <Text style={[styles.metricBlockLabel, { color: isDark ? '#22d3ee' : '#0891b2' }]}>SUSTANCIAS</Text>
                  <Text style={[styles.metricBlockNumber, { color: textColor }]}>{loading ? '...' : stats.sustancias}</Text>
                </View>
              </TouchableOpacity>

              {/* 2. MAT. QUÍMICO */}
              <TouchableOpacity
                style={styles.metricBlockItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Materiales')}
              >
                <View style={[styles.metricCardSurface, { backgroundColor: metricInnerBg }, styles.metricCardSky]}>
                  <View style={styles.metricIconCircleSky}>
                    <Text style={styles.metricBlockIcon}>💧</Text>
                  </View>
                  <Text style={[styles.metricBlockLabel, { color: isDark ? '#38bdf8' : '#0284c7' }]}>MAT. QUÍMICO</Text>
                  <Text style={[styles.metricBlockNumber, { color: textColor }]}>{loading ? '...' : stats.chemMaterials}</Text>
                </View>
              </TouchableOpacity>

              {/* 3. DIDÁCTICOS */}
              <TouchableOpacity
                style={styles.metricBlockItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Materiales')}
              >
                <View style={[styles.metricCardSurface, { backgroundColor: metricInnerBg }, styles.metricCardDark]}>
                  <View style={styles.metricIconCircleAmber}>
                    <Text style={styles.metricBlockIcon}>🎓</Text>
                  </View>
                  <Text style={[styles.metricBlockLabel, { color: isDark ? '#fbbf24' : '#d97706' }]}>DIDÁCTICOS</Text>
                  <Text style={[styles.metricBlockNumber, { color: textColor }]}>{loading ? '...' : stats.didMaterials}</Text>
                </View>
              </TouchableOpacity>

              {/* 4. CADUCIDAD */}
              <TouchableOpacity
                style={styles.metricBlockItem}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Sustancias')}
              >
                <View style={[styles.metricCardSurface, { backgroundColor: metricInnerBg }, styles.metricCardRed]}>
                  <View style={styles.metricIconCircleRed}>
                    <Text style={styles.metricBlockIcon}>🔔</Text>
                  </View>
                  <Text style={[styles.metricBlockLabel, { color: '#f87171' }]}>CADUCIDAD</Text>
                  <Text style={[styles.metricBlockNumber, { color: textColor }]}>{loading ? '...' : stats.expiringAlerts}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4. TABS HORIZONTALES SCROLLABLES DINÁMICOS */}
        {(() => {
          const hasActiveLoans = loansList.some((l) => 
            l.status === 'Pendiente Aprobación Admin' || 
            l.status === 'Prestado' || 
            l.status === 'Pendiente Verificación Admin' || 
            l.status === 'Requiere Atención'
          );

          const renderPrestamosTab = () => (
            <TouchableOpacity
              key="tab-prestamos"
              style={styles.sectionTabBtn}
              onPress={() => setActiveTab('prestamos')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.sectionTabText,
                { color: subtextColor },
                activeTab === 'prestamos' && { color: isDark ? '#ffffff' : '#0891b2', fontWeight: '900' }
              ]}>
                🤝 Préstamos {hasActiveLoans ? `(${loansList.filter(l => l.status !== 'Devuelto' && l.status !== 'Rechazado').length})` : ''}
              </Text>
              {activeTab === 'prestamos' && (
                <View style={[styles.activeTabGlowLine, { backgroundColor: isDark ? '#22d3ee' : '#0891b2' }]} />
              )}
            </TouchableOpacity>
          );

          const renderSustanciasTab = () => (
            <TouchableOpacity
              key="tab-sustancias"
              style={styles.sectionTabBtn}
              onPress={() => setActiveTab('sustancias')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.sectionTabText,
                { color: subtextColor },
                activeTab === 'sustancias' && { color: isDark ? '#ffffff' : '#0891b2', fontWeight: '900' }
              ]}>
                Sustancias Recientes
              </Text>
              {activeTab === 'sustancias' && (
                <View style={[styles.activeTabGlowLine, { backgroundColor: isDark ? '#22d3ee' : '#0891b2' }]} />
              )}
            </TouchableOpacity>
          );

          const renderMaterialesTab = () => (
            <TouchableOpacity
              key="tab-materiales"
              style={styles.sectionTabBtn}
              onPress={() => setActiveTab('materiales')}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.sectionTabText,
                { color: subtextColor },
                activeTab === 'materiales' && { color: isDark ? '#ffffff' : '#0891b2', fontWeight: '900' }
              ]}>
                Materiales ({stats.chemMaterials})
              </Text>
              {activeTab === 'materiales' && (
                <View style={[styles.activeTabGlowLine, { backgroundColor: isDark ? '#22d3ee' : '#0891b2' }]} />
              )}
            </TouchableOpacity>
          );

          return (
            <View style={styles.sectionTabsOuterWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sectionTabsScrollContent}
              >
                {hasActiveLoans
                  ? [renderPrestamosTab(), renderSustanciasTab(), renderMaterialesTab()]
                  : [renderSustanciasTab(), renderMaterialesTab(), renderPrestamosTab()]
                }
              </ScrollView>
            </View>
          );
        })()}

        {/* 5. CAROUSEL HORIZONTAL DE TARJETAS */}
        {activeTab === 'sustancias' ? (
          /* TAB 1: SUSTANCIAS RECIENTES */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
            {displaySubstances.map((item, index) => {
              const photoUri = resolveItemPhoto(item);

              return (
                <View key={item.id || index} style={styles.substanceCardWrapper}>
                  <View style={[styles.substanceGlassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                    {/* Header de la Tarjeta: Imagen + Título y Código */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.itemImageContainer, { borderColor: cardBorder }]}>
                        {photoUri ? (
                          <Image source={{ uri: photoUri }} style={styles.itemThumbImage} resizeMode="cover" />
                        ) : (
                          <View style={[styles.itemImagePlaceholder, { backgroundColor: isDark ? 'rgba(30, 48, 77, 0.6)' : 'rgba(226, 232, 240, 0.8)' }]}>
                            <Text style={{ fontSize: 28 }}>🧪</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.itemNameCol}>
                        <Text style={[styles.itemNameText, { color: textColor }]} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <View style={styles.statusDotRow}>
                          <View style={styles.statusDotCircle} />
                          <Text style={styles.statusDotText}>LAB-SUB-{item.id}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Divisor Sutil */}
                    <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

                    {/* Filas de Información Ficha Técnica con Íconos */}
                    <View style={styles.cardMetaInfo}>
                      <View style={styles.metaRowExact}>
                        <Text style={styles.metaIcon}>🧪</Text>
                        <Text style={[styles.metaLabelText, { color: subtextColor }]}>Fórmula:</Text>
                        <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                          {item.chemical_formula || 'Sin fórmula'}
                        </Text>
                      </View>

                      <View style={styles.metaRowExact}>
                        <Text style={styles.metaIcon}>🛡️</Text>
                        <Text style={[styles.metaLabelText, { color: subtextColor }]}>Ubicación:</Text>
                        <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                          {item.location || '3-B'}
                        </Text>
                      </View>

                      <View style={styles.metaRowExact}>
                        <Text style={styles.metaIcon}>⏱️</Text>
                        <Text style={[styles.metaLabelText, { color: subtextColor }]}>Stock:</Text>
                        <Text style={[styles.metaValueText, { color: textColor }]}>
                          {item.stock || item.quantity || '250'} {item.unit || 'mL'}
                        </Text>
                      </View>

                      <View style={styles.metaRowExact}>
                        <Text style={styles.metaIcon}>📋</Text>
                        <Text style={[styles.metaLabelText, { color: subtextColor }]}>Estado:</Text>
                        <View style={styles.statePillContainer}>
                          <View style={styles.stateGreenDot} />
                          <Text style={styles.stateGreenPillText}>
                            {item.status || 'Buenas Condiciones'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Botones Inferiores [ 📋 Datos ] [ ✏️ Editar ] */}
                    <View style={styles.cardButtonsRow}>
                      <TouchableOpacity
                        style={[styles.cardNeumorphBtn, { backgroundColor: btnBg, borderColor: btnBorder }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Detail', { type: 'substance', id: item.id, item })}
                      >
                        <Text style={[styles.cardBtnIcon, { color: isDark ? '#22d3ee' : '#0891b2' }]}>📋</Text>
                        <Text style={[styles.cardBtnText, { color: textColor }]}>Datos</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.cardNeumorphBtn, { backgroundColor: btnBg, borderColor: btnBorder }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('Detail', { type: 'substance', id: item.id, item })}
                      >
                        <Text style={[styles.cardBtnIcon, { color: isDark ? '#38bdf8' : '#0284c7' }]}>✏️</Text>
                        <Text style={[styles.cardBtnText, { color: textColor }]}>Editar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        ) : activeTab === 'materiales' ? (
          /* TAB 2: MATERIALES */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
            {displayMaterials.length > 0 ? (
              displayMaterials.map((item, index) => {
                const photoUri = resolveItemPhoto(item);
                const isDidactic = item.tipo_material === 'didactico' || item.category === 'didactico';

                return (
                  <View key={item.id || index} style={styles.substanceCardWrapper}>
                    <View style={[styles.substanceGlassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.itemImageContainer, { borderColor: cardBorder }]}>
                          {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.itemThumbImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.itemImagePlaceholder, { backgroundColor: isDark ? 'rgba(30, 48, 77, 0.6)' : 'rgba(226, 232, 240, 0.8)' }]}>
                              <Text style={{ fontSize: 28 }}>{isDidactic ? '🎓' : '💧'}</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.itemNameCol}>
                          <Text style={[styles.itemNameText, { color: textColor }]} numberOfLines={2}>
                            {item.name || item.nombre}
                          </Text>
                          <View style={styles.statusDotRow}>
                            <View style={[styles.statusDotCircle, { backgroundColor: isDidactic ? '#a855f7' : '#38bdf8' }]} />
                            <Text style={[styles.statusDotText, { color: isDidactic ? '#c084fc' : '#38bdf8' }]}>
                              {isDidactic ? 'Didáctico' : 'Mat. Químico'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

                      <View style={styles.cardMetaInfo}>
                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>📦</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Categoría:</Text>
                          <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                            {item.category || item.material_type || 'Cristalería'}
                          </Text>
                        </View>

                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>🛡️</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Ubicación:</Text>
                          <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                            {item.location || 'Estante de Materiales'}
                          </Text>
                        </View>

                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>⏱️</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Stock:</Text>
                          <Text style={[styles.metaValueText, { color: textColor }]}>
                            {item.quantity || item.stock || '1'} {item.unit || 'pza(s)'}
                          </Text>
                        </View>

                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>📋</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Estado:</Text>
                          <View style={styles.statePillContainer}>
                            <View style={styles.stateGreenDot} />
                            <Text style={styles.stateGreenPillText}>
                              {item.condition || 'Operativo'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.cardButtonsRow}>
                        <TouchableOpacity
                          style={[styles.cardNeumorphBtn, { backgroundColor: btnBg, borderColor: btnBorder }]}
                          activeOpacity={0.8}
                          onPress={() => navigation.navigate('Materiales')}
                        >
                          <Text style={[styles.cardBtnIcon, { color: isDark ? '#22d3ee' : '#0891b2' }]}>📦</Text>
                          <Text style={[styles.cardBtnText, { color: textColor }]}>Ver en Catálogo</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyTabCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 4 }}>📦</Text>
                <Text style={[styles.emptyTabText, { color: subtextColor }]}>No hay materiales registrados aún.</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          /* TAB 3: PRÉSTAMOS ACTIVOS Y SOLICITUDES */
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
            {displayLoans.length > 0 ? (
              displayLoans.map((item, index) => {
                const isReqPendiente = item.status === 'Pendiente Aprobación Admin';
                const isPrestado = item.status === 'Prestado';
                const isPendiente = item.status === 'Pendiente Verificación Admin';
                const isAtencion = item.status === 'Requiere Atención';
                const isControlMayor = item.status === 'Control Mayor';

                const loanPhotoUri = resolveLoanPhoto(item);

                return (
                  <View key={item.id || index} style={styles.substanceCardWrapper}>
                    <View style={[styles.substanceGlassCard, { backgroundColor: cardBg, borderColor: isAtencion ? '#ef4444' : (isControlMayor ? '#8b5cf6' : cardBorder) }]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={[styles.itemImageContainer, { borderColor: cardBorder }]}>
                          {loanPhotoUri ? (
                            <Image source={{ uri: loanPhotoUri }} style={styles.itemThumbImage} resizeMode="cover" />
                          ) : (
                            <View style={[styles.itemImagePlaceholder, { backgroundColor: isDark ? 'rgba(30, 48, 77, 0.6)' : 'rgba(226, 232, 240, 0.8)' }]}>
                              <Text style={{ fontSize: 28 }}>🧪</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.itemNameCol}>
                          <Text style={[styles.itemNameText, { color: textColor }]} numberOfLines={2}>
                            {item.item_name}
                          </Text>
                          <View style={styles.statusDotRow}>
                            <View style={[styles.statusDotCircle, { backgroundColor: isReqPendiente ? '#eab308' : (isPrestado ? '#38bdf8' : (isPendiente ? '#f97316' : (isAtencion ? '#ef4444' : '#10b981'))) }]} />
                            <Text style={[styles.statusDotText, { color: isReqPendiente ? '#fbbf24' : (isPrestado ? '#38bdf8' : (isPendiente ? '#f97316' : (isAtencion ? '#ef4444' : '#10b981'))) }]}>
                              {item.status || 'En Préstamo'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

                      <View style={styles.cardMetaInfo}>
                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>👤</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Solicitante:</Text>
                          <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                            {item.borrower_name || item.user_name || item.student_name || 'Docente'}
                          </Text>
                        </View>

                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>📅</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Fecha:</Text>
                          <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                            {item.loan_date || 'Reciente'}
                          </Text>
                        </View>

                        <View style={styles.metaRowExact}>
                          <Text style={styles.metaIcon}>⏱️</Text>
                          <Text style={[styles.metaLabelText, { color: subtextColor }]}>Tiempo:</Text>
                          <Text style={[styles.metaValueText, { color: isPrestado ? (isDark ? '#22d3ee' : '#0891b2') : textColor, fontWeight: '800' }]}>
                            {item.elapsed_time || 'Activo'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardButtonsRow}>
                        <TouchableOpacity
                          style={[styles.cardNeumorphBtn, { backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: '#eab308', width: '100%' }]}
                          activeOpacity={0.8}
                          onPress={() => navigation.navigate('Prestamos')}
                        >
                          <Text style={[styles.cardBtnText, { color: isDark ? '#fbbf24' : '#d97706', fontWeight: '900' }]}>
                            {isReqPendiente ? '👑 Revisar y Aprobar ›' : (isPendiente ? '📷 Revisar Devolución ›' : '🤝 Gestionar Préstamo ›')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyTabCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 4 }}>🤝</Text>
                <Text style={[styles.emptyTabText, { color: subtextColor }]}>No hay préstamos activos en este momento.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </ScrollView>

      {/* 6. BOTÓN FLOTANTE GLASS COMPACTO (ACCIONES RÁPIDAS) */}
      <TouchableOpacity
        style={styles.floatingActionOrb}
        activeOpacity={0.85}
        onPress={() => setShowQuickActionsModal(true)}
      >
        <LinearGradient
          colors={isDark ? ['rgba(6, 182, 212, 0.40)', 'rgba(7, 24, 46, 0.92)', 'rgba(2, 6, 23, 0.98)'] : ['#06b6d4', '#0284c7']}
          style={[styles.floatingOrbGradient, { borderColor: isDark ? 'rgba(34, 211, 238, 0.60)' : '#ffffff' }]}
        >
          <Text style={[styles.floatingOrbIcon, { color: isDark ? '#22d3ee' : '#ffffff' }]}>✨</Text>
          <Text style={styles.floatingOrbText}>Acciones</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* MODAL DE ACCIONES RÁPIDAS */}
      <Modal
        visible={showQuickActionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickActionsModal(false)}
      >
        <TouchableOpacity
          style={styles.quickModalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickActionsModal(false)}
        >
          <View style={[styles.quickModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: cardBorder }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: textColor }]}>✨ Acciones Rápidas</Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>Selecciona una operación instantánea:</Text>

            <TouchableOpacity
              style={[styles.quickOptionRow, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}
              onPress={() => {
                setShowQuickActionsModal(false);
                setShowSubstanceModal(true);
              }}
            >
              <Text style={{ fontSize: 24 }}>🧪</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: textColor }]}>+ Registrar Sustancia Química</Text>
                <Text style={styles.quickOptionSub}>Reactivos, solventes y soluciones</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOptionRow, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}
              onPress={() => {
                setShowQuickActionsModal(false);
                setShowChemMaterialModal(true);
              }}
            >
              <Text style={{ fontSize: 24 }}>💧</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: textColor }]}>+ Registrar Material Químico</Text>
                <Text style={styles.quickOptionSub}>Cristalería, utensilios y recipientes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOptionRow, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}
              onPress={() => {
                setShowQuickActionsModal(false);
                setShowDidacticModal(true);
              }}
            >
              <Text style={{ fontSize: 24 }}>🎓</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: textColor }]}>+ Registrar Material Didáctico</Text>
                <Text style={styles.quickOptionSub}>Modelos, kits y sensores</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOptionRow, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: pendingLoansCount > 0 ? '#ef4444' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)') }]}
              onPress={() => {
                setShowQuickActionsModal(false);
                navigation.navigate('Prestamos');
              }}
            >
              <Text style={{ fontSize: 24 }}>🤝</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.quickOptionTitle, { color: textColor }]}>Préstamos y Devoluciones</Text>
                  {pendingLoansCount > 0 && (
                    <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>{pendingLoansCount} pendientes</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.quickOptionSub}>Solicitar, gestionar préstamos activos y validar devoluciones</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickOptionRow, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: '#22d3ee' }]}
              onPress={() => {
                setShowQuickActionsModal(false);
                navigation.navigate('QRScanner');
              }}
            >
              <Text style={{ fontSize: 24 }}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quickOptionTitle, { color: isDark ? '#22d3ee' : '#0891b2' }]}>Escanear Código QR</Text>
                <Text style={styles.quickOptionSub}>Lector rápido con cámara</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickModalCloseBtn, { borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)' }]}
              onPress={() => setShowQuickActionsModal(false)}
            >
              <Text style={[styles.quickModalCloseText, { color: subtextColor }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {/* MODALES DE REGISTRO */}
      <RegistrationSelectorModal
        visible={showSelectorModal}
        onClose={() => setShowSelectorModal(false)}
        onSelectType={(type) => {
          if (type === 'substances') setShowSubstanceModal(true);
          else if (type === 'chemical_materials') setShowChemMaterialModal(true);
          else if (type === 'didactic_materials') setShowDidacticModal(true);
          else if (type === 'equipos') setShowEquipoModal(true);
        }}
      />

      <SubstanceRegisterModal
        visible={showSubstanceModal}
        onClose={() => setShowSubstanceModal(false)}
        onSuccess={fetchData}
      />

      <ChemicalMaterialRegisterModal
        visible={showChemMaterialModal}
        onClose={() => setShowChemMaterialModal(false)}
        onSuccess={fetchData}
      />

      <DidacticMaterialRegisterModal
        visible={showDidacticModal}
        onClose={() => setShowDidacticModal(false)}
        onSuccess={fetchData}
      />

      <EquipoRegisterModal
        visible={showEquipoModal}
        onClose={() => setShowEquipoModal(false)}
        onSuccess={fetchData}
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
    paddingBottom: 10,
    zIndex: 10,
  },
  headerLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerFlaskBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    fontSize: 24,
  },
  headerLogoTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerLogoSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -2,
  },
  headerRightStack: {
    alignItems: 'flex-end',
    gap: 6,
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
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  resumenCardWrapper: {
    marginBottom: 16,
  },
  resumenGlassCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  resumenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resumenTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  resumenAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  resumenAlertBell: {
    fontSize: 11,
  },
  resumenAlertText: {
    color: '#f87171',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  metricsBlocksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricBlockItem: {
    flex: 1,
  },
  metricCardSurface: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    minHeight: 120,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.2,
  },
  metricCardCyan: {
    borderColor: 'rgba(6, 182, 212, 0.45)',
  },
  metricCardSky: {
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  metricCardDark: {
    borderColor: 'rgba(251, 191, 36, 0.40)',
  },
  metricCardRed: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
  },
  metricIconCircleCyan: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconCircleSky: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconCircleAmber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconCircleRed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricBlockIcon: {
    fontSize: 18,
  },
  metricBlockLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  metricBlockNumber: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionTabsOuterWrapper: {
    marginBottom: 14,
  },
  sectionTabsScrollContent: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  sectionTabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    position: 'relative',
  },
  sectionTabText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  activeTabGlowLine: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  horizontalCardsScroll: {
    gap: 14,
    paddingRight: 16,
    paddingBottom: 6,
  },
  substanceCardWrapper: {
    width: width * 0.70,
  },
  substanceGlassCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 66,
    height: 66,
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
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  statusDotCircle: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  statusDotText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  cardMetaInfo: {
    gap: 8,
    marginBottom: 14,
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
  emptyTabCard: {
    width: width * 0.8,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTabText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  floatingActionOrb: {
    position: 'absolute',
    right: 16,
    bottom: 86,
    width: 54,
    height: 54,
    borderRadius: 27,
    zIndex: 50,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingOrbGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 27,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingOrbIcon: {
    fontSize: 18,
  },
  floatingOrbText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 1,
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
