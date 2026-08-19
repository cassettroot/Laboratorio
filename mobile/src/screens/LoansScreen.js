import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
  Alert,
  Modal,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../api/services';
import apiClient, { getImageUrl } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { normalizeText } from '../utils/textUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function LoansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { role, user, logout, serverUrl } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'Pendiente Aprobación Admin' | 'Prestado' | 'Pendiente Verificación Admin' | 'Devuelto'

  const [inventoryId, setInventoryId] = useState('inventario');
  const [showSpaceModal, setShowSpaceModal] = useState(false);

  // Estado del Modal de Devolución
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);
  const [returnPhotoUri, setReturnPhotoUri] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const savedInv = (await AsyncStorage.getItem('inventory_id')) || 'inventario';
      setInventoryId(savedInv);

      const res = await apiService.getLoans();
      if (res.status === 'success') {
        setLoans(res.data || []);
      }
    } catch (e) {
      console.warn("Error cargando préstamos en móvil:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleSelectSpace = async (spaceId) => {
    await AsyncStorage.setItem('inventory_id', spaceId);
    setInventoryId(spaceId);
    setShowSpaceModal(false);
    fetchLoans();
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

  const openReturnModal = (loanItem) => {
    setSelectedLoanForReturn(loanItem);
    setReturnPhotoUri(null);
    setReturnNotes('');
    setReturnModalVisible(true);
  };

  const pickReturnPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permiso Requerido", "Se requiere acceso a la galería para subir la evidencia de entrega.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReturnPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Error seleccionando foto:", e);
    }
  };

  const takeReturnPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permiso Requerido", "Se requiere permiso de cámara para tomar la fotografía del estante.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReturnPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Error tomando foto:", e);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnPhotoUri) {
      Alert.alert("Evidencia Requerida", "Por favor toma o sube una fotografía del compuesto colocado en su estante correspondiente.");
      return;
    }

    setSubmittingReturn(true);
    try {
      const formData = new FormData();
      const filename = returnPhotoUri.split('/').pop() || 'return_photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('photo', {
        uri: returnPhotoUri,
        name: filename,
        type: type,
      });
      formData.append('notes', returnNotes.trim());

      const response = await apiClient.post(`/api/loans/${selectedLoanForReturn.id}/request-return`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.status === 'success') {
        Alert.alert(
          '✅ Devolución Registrada',
          'La evidencia de foto y la descripción se enviaron correctamente. El Administrador validará la devolución.'
        );
        setReturnModalVisible(false);
        setReturnPhotoUri(null);
        setReturnNotes('');
        fetchLoans();
      } else {
        Alert.alert('Error', response.data?.message || 'No se pudo guardar la devolución.');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar la evidencia de devolución: ' + err.message);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleApproveLoan = async (loanId) => {
    Alert.alert(
      '👑 Aprobar Solicitud de Préstamo',
      `¿Confirmas aprobar la solicitud #PR-${loanId}? A partir de este momento comenzará a contar el tiempo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Aprobar',
          onPress: async () => {
            try {
              const res = await apiClient.put(`/api/loans/${loanId}/approve-loan`);
              if (res.data && res.data.status === 'success') {
                Alert.alert('🟢 Préstamo Aprobado', 'La solicitud ha sido aprobada y el conteo de tiempo ha iniciado.');
                fetchLoans();
              } else {
                Alert.alert('Error', res.data?.message || 'No se pudo aprobar.');
              }
            } catch (e) {
              Alert.alert('Error', 'Error al aprobar la solicitud: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const handleApproveReturn = async (loanId) => {
    Alert.alert(
      '🟢 Aprobar Devolución',
      `¿Confirmas que verificaste físicamente en el estante el compuesto del préstamo #PR-${loanId}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Aprobar',
          onPress: async () => {
            try {
              const res = await apiClient.put(`/api/loans/${loanId}/approve-return`);
              if (res.data && res.data.status === 'success') {
                Alert.alert('🟢 Devolución Verificada', 'La devolución ha sido aprobada y registrada en el historial.');
                fetchLoans();
              } else {
                Alert.alert('Error', res.data?.message || 'No se pudo verificar.');
              }
            } catch (e) {
              Alert.alert('Error', 'Error al aprobar la devolución: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const filteredLoans = loans.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search.trim()) {
      const qNorm = normalizeText(search);
      return (
        normalizeText(l.item_name).includes(qNorm) ||
        normalizeText(l.borrower_name || l.student_name || '').includes(qNorm) ||
        normalizeText(l.loan_date || '').includes(qNorm) ||
        normalizeText(l.notes || '').includes(qNorm)
      );
    }
    return true;
  });

  // Dynamic Theme Colors
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(10, 20, 38, 0.84)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(6, 182, 212, 0.35)';
  const pillBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';
  const btnBg = isDark ? 'rgba(18, 38, 68, 0.85)' : 'rgba(241, 245, 249, 0.95)';
  const btnBorder = isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.30)';

  const renderLoanCard = ({ item }) => {
    const isReqPendiente = item.status === 'Pendiente Aprobación Admin';
    const isPrestado = item.status === 'Prestado';
    const isPendiente = item.status === 'Pendiente Verificación Admin';
    const isDevuelto = item.status === 'Devuelto';

    const photoUri = getImageUrl(item.return_photo_path, serverUrl);
    const isAdmin = (role === 'admin');

    return (
      <View style={{ marginBottom: 14 }}>
        <View style={[styles.loanGlassCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Header del Préstamo */}
          <View style={styles.loanCardHeaderRow}>
            <View style={styles.loanTitleCol}>
              <View style={styles.loanIdPill}>
                <Text style={styles.loanIdPillText}>#PR-{item.id}</Text>
              </View>
              <Text style={[styles.loanItemTitle, { color: textColor }]} numberOfLines={2}>
                {item.item_name}
              </Text>
            </View>

            <View style={[
              styles.loanStatusBadge, 
              isReqPendiente ? styles.badgeYellow : (isPrestado ? styles.badgeAmber : (isPendiente ? styles.badgeOrange : styles.badgeGreen))
            ]}>
              <Text style={[
                styles.loanStatusBadgeText, 
                isReqPendiente ? styles.textYellow : (isPrestado ? styles.textAmber : (isPendiente ? styles.textOrange : styles.textGreen))
              ]}>
                {isReqPendiente ? '⏳ Solicitud' : (isPrestado ? '🟡 En Préstamo' : (isPendiente ? '📷 Por Verificar' : '🟢 Devuelto'))}
              </Text>
            </View>
          </View>

          {/* Divisor Sutil */}
          <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

          {/* Filas de Información */}
          <View style={styles.loanMetaInfo}>
            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>👤</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Solicitante:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                {item.borrower_name || item.student_name || 'Laura'} ({item.borrower_type || 'Estudiante'})
              </Text>
            </View>

            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Cantidad:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]}>
                {item.quantity || 1} {item.unit || 'piezas'}
              </Text>
            </View>

            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Fecha:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                {item.loan_date || '2026-08-05 10:30:03'}
              </Text>
            </View>

            {/* Evidencia de Entrega si existe */}
            {item.return_delivery_date || item.return_notes || photoUri ? (
              <View style={[styles.evidenceBox, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.10)' : 'rgba(6, 182, 212, 0.08)', borderColor: isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.30)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>📸</Text>
                  <Text style={[styles.evidenceHeading, { color: isDark ? '#22d3ee' : '#0891b2' }]}>
                    Evidencia de Entrega en Estante
                  </Text>
                </View>
                {item.return_delivery_date ? (
                  <Text style={[styles.evidenceText, { color: subtextColor }]}>
                    Entregado: {item.return_delivery_date}
                  </Text>
                ) : null}
                {item.return_notes ? (
                  <Text style={[styles.evidenceText, { color: textColor, fontStyle: 'italic' }]}>
                    "{item.return_notes}"
                  </Text>
                ) : null}
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.evidenceThumb} resizeMode="cover" />
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Botones de Acción */}
          <View style={styles.cardButtonsRow}>
            {/* Si es solicitud pendiente y es admin: Botón de Aprobar Préstamo */}
            {isReqPendiente && isAdmin ? (
              <TouchableOpacity
                style={[styles.cardNeumorphBtn, { backgroundColor: 'rgba(234, 179, 8, 0.2)', borderColor: 'rgba(234, 179, 8, 0.5)' }]}
                activeOpacity={0.8}
                onPress={() => handleApproveLoan(item.id)}
              >
                <Text style={[styles.cardBtnIcon, { color: '#eab308' }]}>👑</Text>
                <Text style={[styles.cardBtnText, { color: '#eab308' }]}>Aprobar Solicitud</Text>
              </TouchableOpacity>
            ) : null}

            {/* Si está prestado: Botón para subir evidencia de devolución */}
            {isPrestado ? (
              <TouchableOpacity
                style={[styles.cardNeumorphBtn, { backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: 'rgba(6, 182, 212, 0.5)' }]}
                activeOpacity={0.8}
                onPress={() => openReturnModal(item)}
              >
                <Text style={[styles.cardBtnIcon, { color: '#22d3ee' }]}>📸</Text>
                <Text style={[styles.cardBtnText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>Entregar en Estante</Text>
              </TouchableOpacity>
            ) : null}

            {/* Si está pendiente de verificación y es admin: Botón de Validar Devolución */}
            {isPendiente && isAdmin ? (
              <TouchableOpacity
                style={[styles.cardNeumorphBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.5)' }]}
                activeOpacity={0.8}
                onPress={() => handleApproveReturn(item.id)}
              >
                <Text style={[styles.cardBtnIcon, { color: '#10b981' }]}>🟢</Text>
                <Text style={[styles.cardBtnText, { color: '#10b981' }]}>Verificar y Finalizar</Text>
              </TouchableOpacity>
            ) : null}
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
            Control de Préstamos
          </Text>
        </View>
      </View>

      {/* 2. CONTENIDO PRINCIPAL */}
      <View style={styles.mainContentContainer}>
        {/* 3. Filtros Scrollables */}
        <View style={[styles.filtersScrollContainer, { marginTop: 2, marginBottom: 8 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            <TouchableOpacity
              style={[
                styles.filterPill, 
                { backgroundColor: pillBg, borderColor: cardBorder },
                filter === 'all' && { backgroundColor: isDark ? '#06b6d4' : '#0891b2', borderColor: isDark ? '#22d3ee' : '#0891b2' }
              ]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterPillText, filter === 'all' ? { color: '#ffffff', fontWeight: '900' } : { color: textColor }]}>
                Todos ({loans.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill, 
                { backgroundColor: pillBg, borderColor: cardBorder },
                filter === 'Pendiente Aprobación Admin' && { backgroundColor: isDark ? '#eab308' : '#d97706', borderColor: '#eab308' }
              ]}
              onPress={() => setFilter('Pendiente Aprobación Admin')}
            >
              <Text style={[styles.filterPillText, filter === 'Pendiente Aprobación Admin' ? { color: '#ffffff', fontWeight: '900' } : { color: textColor }]}>
                ⏳ Solicitudes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill, 
                { backgroundColor: pillBg, borderColor: cardBorder },
                filter === 'Prestado' && { backgroundColor: isDark ? '#38bdf8' : '#0284c7', borderColor: '#38bdf8' }
              ]}
              onPress={() => setFilter('Prestado')}
            >
              <Text style={[styles.filterPillText, filter === 'Prestado' ? { color: '#ffffff', fontWeight: '900' } : { color: textColor }]}>
                🟡 En Préstamo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill, 
                { backgroundColor: pillBg, borderColor: cardBorder },
                filter === 'Pendiente Verificación Admin' && { backgroundColor: isDark ? '#f97316' : '#ea580c', borderColor: '#f97316' }
              ]}
              onPress={() => setFilter('Pendiente Verificación Admin')}
            >
              <Text style={[styles.filterPillText, filter === 'Pendiente Verificación Admin' ? { color: '#ffffff', fontWeight: '900' } : { color: textColor }]}>
                📷 Por Verificar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill, 
                { backgroundColor: pillBg, borderColor: cardBorder },
                filter === 'Devuelto' && { backgroundColor: isDark ? '#10b981' : '#059669', borderColor: '#10b981' }
              ]}
              onPress={() => setFilter('Devuelto')}
            >
              <Text style={[styles.filterPillText, filter === 'Devuelto' ? { color: '#ffffff', fontWeight: '900' } : { color: textColor }]}>
                🟢 Devueltos
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 4. Buscador Glassmorphic */}
        <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(13, 26, 48, 0.75)' : 'rgba(241, 245, 249, 0.90)', borderColor: cardBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Buscar por solicitante, ítem o ID..."
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

        {/* 5. Lista de Préstamos */}
        {loading ? (
          <ActivityIndicator size="large" color={isDark ? '#22d3ee' : '#0891b2'} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredLoans}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderLoanCard}
            contentContainerStyle={{ paddingBottom: insets.bottom + 115, paddingTop: 4 }}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchLoans(); }}
                tintColor={isDark ? '#22d3ee' : '#0891b2'}
              />
            }
            ListEmptyComponent={
              <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>🤝</Text>
                <Text style={[styles.emptyText, { color: subtextColor }]}>
                  No se encontraron préstamos o servicios registrados.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* MODAL DE DEVOLUCIÓN CON FOTOGRAFÍA */}
      <Modal
        visible={returnModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <TouchableOpacity style={styles.quickModalOverlay} activeOpacity={1} onPress={() => setReturnModalVisible(false)}>
          <View style={[styles.returnModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: cardBorder }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: textColor }]}>📸 Entrega en Estante</Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>
              Toma una foto del compuesto colocado en su estante para que el Administrador valide la devolución.
            </Text>

            {/* Preview de Foto */}
            {returnPhotoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: returnPhotoUri }} style={styles.photoPreviewImage} resizeMode="cover" />
                <TouchableOpacity style={styles.retakePhotoBtn} onPress={() => setReturnPhotoUri(null)}>
                  <Text style={styles.retakePhotoText}>Cambiar Foto ✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoButtonsRow}>
                <TouchableOpacity style={[styles.pickPhotoBtn, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.10)', borderColor: '#06b6d4' }]} onPress={takeReturnPhoto}>
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>📷</Text>
                  <Text style={[styles.pickPhotoText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>Tomar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.pickPhotoBtn, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.10)', borderColor: '#8b5cf6' }]} onPress={pickReturnPhoto}>
                  <Text style={{ fontSize: 24, marginBottom: 4 }}>🖼️</Text>
                  <Text style={[styles.pickPhotoText, { color: isDark ? '#c084fc' : '#7c3aed' }]}>De la Galería</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input de Notas */}
            <TextInput
              style={[styles.returnNotesInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: cardBorder, color: textColor }]}
              placeholder="Notas opcionales (ej. Frasco cerrado, estante 3-B)..."
              placeholderTextColor={subtextColor}
              value={returnNotes}
              onChangeText={setReturnNotes}
              multiline
            />

            {/* Botones de Envío */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.quickModalCloseBtn, { flex: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)' }]} onPress={() => setReturnModalVisible(false)}>
                <Text style={[styles.quickModalCloseText, { color: subtextColor }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitReturnBtn, { flex: 2 }]} onPress={handleSubmitReturn} disabled={submittingReturn}>
                <LinearGradient colors={['#06b6d4', '#0284c7']} style={styles.submitReturnGradient}>
                  {submittingReturn ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitReturnText}>Enviar Evidencia ✅</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    marginBottom: 8,
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
  filtersScrollContainer: {
    marginBottom: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.2,
    marginBottom: 12,
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
  loanGlassCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  loanCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  loanTitleCol: {
    flex: 1,
  },
  loanIdPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 211, 238, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.40)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  loanIdPillText: {
    color: '#22d3ee',
    fontSize: 11,
    fontWeight: '900',
  },
  loanItemTitle: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  loanStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.45)',
  },
  textYellow: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeAmber: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  textAmber: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeOrange: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.45)',
  },
  textOrange: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  textGreen: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  loanMetaInfo: {
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
    width: 76,
  },
  metaValueText: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  evidenceBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  evidenceHeading: {
    fontSize: 12,
    fontWeight: '800',
  },
  evidenceText: {
    fontSize: 11,
    marginTop: 2,
  },
  evidenceThumb: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    marginTop: 8,
  },
  cardButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
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
  returnModalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 20,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pickPhotoBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickPhotoText: {
    fontSize: 12,
    fontWeight: '800',
  },
  photoPreviewContainer: {
    width: '100%',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  retakePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retakePhotoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  returnNotesInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 12.5,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitReturnBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitReturnGradient: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReturnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
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
