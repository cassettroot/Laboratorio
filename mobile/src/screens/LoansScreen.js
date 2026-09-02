import React, { useState, useEffect, useContext } from 'react';
import { useIsFocused } from '@react-navigation/native';
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

function formatLiveTimer(loanDateStr, status, returnDateStr = null) {
  if (status === 'Pendiente Aprobación Admin') return '⏳ En Espera de Aprobación';
  if (status === 'Rechazado') return '✕ Rechazado';
  if (status === 'Control Mayor' || status === 'Devuelto') {
    const cleanStart = (loanDateStr || '').replace('T', ' ');
    const cleanEnd = (returnDateStr || '').replace('T', ' ');
    const start = new Date(cleanStart).getTime();
    const end = cleanEnd ? new Date(cleanEnd).getTime() : NaN;
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      const diffMs = end - start;
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const pad = (n) => String(n).padStart(2, '0');
      const durStr = days > 0 ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
      return `${status === 'Control Mayor' ? '🏛️ Control Mayor' : '🟢 Concluido'} (${durStr})`;
    }
    return status === 'Control Mayor' ? '🏛️ Control Mayor (Concluido)' : '🟢 Concluido';
  }
  if (!loanDateStr) return '00h 00m 00s';

  try {
    const cleanDate = loanDateStr.replace('T', ' ');
    const start = new Date(cleanDate).getTime();
    if (isNaN(start)) return loanDateStr;

    const now = Date.now();
    const diffMs = Math.max(0, now - start);

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (days > 0) {
      return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } catch (e) {
    return loanDateStr;
  }
}

export default function LoansScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const isFocused = useIsFocused();
  const { role, user, logout, serverUrl, syncSignal } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'Pendiente Aprobación Admin' | 'Prestado' | 'Pendiente Verificación Admin' | 'Requiere Atención' | 'Devuelto'

  const [inventoryId, setInventoryId] = useState('inventario');
  const [showSpaceModal, setShowSpaceModal] = useState(false);

  // Reloj en tiempo real ultra-eficiente: solo corre si la pantalla está activa y hay préstamos en curso
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const hasActivePrestado = loans.some(l => l.status === 'Prestado');
    if (!isFocused || !hasActivePrestado) return;

    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isFocused, loans]);

  // Modal de Nueva Solicitud de Préstamo
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemNotes, setItemNotes] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modal de Devolución con Evidencia Foto + Descripción
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);
  const [returnPhotoUri, setReturnPhotoUri] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Modal de Rechazo / Observación por Admin
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedLoanForReject, setSelectedLoanForReject] = useState(null);
  const [rejectActionType, setRejectActionType] = useState('loan'); // 'loan' | 'return'
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Modal de Control Mayor (Caso Especial) por Admin
  const [controlMayorModalVisible, setControlMayorModalVisible] = useState(false);
  const [selectedLoanForControlMayor, setSelectedLoanForControlMayor] = useState(null);
  const [controlMayorNotes, setControlMayorNotes] = useState('');
  const [controlMayorPhotoUri, setControlMayorPhotoUri] = useState(null);
  const [submittingControlMayor, setSubmittingControlMayor] = useState(false);

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

  const loadRegisteredUsers = async () => {
    try {
      const res = await apiService.getRegisteredUsers();
      if (res.status === 'success') {
        setRegisteredUsers(res.data || []);
        if (res.data && res.data.length > 0 && !selectedUser) {
          setSelectedUser(res.data[0]);
        }
      }
    } catch (e) {
      console.warn("Error cargando usuarios responsables:", e);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [syncSignal]);

  const handleOpenCreateModal = () => {
    loadRegisteredUsers();
    setItemName('');
    setItemQuantity('1');
    setItemNotes('');
    setCreateModalVisible(true);
  };

  const handleCreateLoan = async () => {
    if (!itemName.trim()) {
      Alert.alert("Campo Requerido", "Por favor ingresa el nombre del compuesto o material a solicitar.");
      return;
    }
    if (!selectedUser) {
      Alert.alert("Campo Requerido", "Por favor selecciona un responsable o solicitante.");
      return;
    }

    setSubmittingCreate(true);
    try {
      const payload = {
        borrower_name: selectedUser.username,
        borrower_user_id: selectedUser.id,
        items_list: [
          {
            id: 0,
            name: itemName.trim(),
            quantity: parseFloat(itemQuantity) || 1,
            type: 'substance'
          }
        ],
        notes: itemNotes.trim()
      };

      const res = await apiService.createLoan(payload);
      if (res && res.status === 'success') {
        Alert.alert(
          '✅ Solicitud Enviada',
          'La solicitud de préstamo fue enviada al Administrador. Recibirás una notificación en cuanto sea aprobada.'
        );
        setCreateModalVisible(false);
        fetchLoans();
      } else {
        Alert.alert('Error', res?.message || 'No se pudo crear la solicitud.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error al enviar solicitud: ' + e.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

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

  const openReturnModal = (loanItem) => {
    setSelectedLoanForReturn(loanItem);
    setReturnPhotoUri(null);
    setReturnNotes(loanItem.return_notes || '');
    setReturnModalVisible(true);
  };

  const openRejectModal = (loanItem, type) => {
    setSelectedLoanForReject(loanItem);
    setRejectActionType(type);
    setRejectionReason('');
    setRejectModalVisible(true);
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
        Alert.alert("Permiso Requerido", "Se requiere permiso de cámara para tomar la fotografía de devolución.");
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
    if (!returnPhotoUri && !selectedLoanForReturn?.return_photo_path) {
      Alert.alert("Evidencia Requerida", "Por favor toma o selecciona una fotografía del compuesto/material devuelto.");
      return;
    }
    if (!returnNotes.trim()) {
      Alert.alert("Descripción Requerida", "Por favor describe el uso o estado en que devuelves el compuesto (ej. Práctica #3, envase limpio y cerrado).");
      return;
    }

    setSubmittingReturn(true);
    try {
      const formData = new FormData();
      if (returnPhotoUri) {
        const filename = returnPhotoUri.split('/').pop() || 'return_photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('photo', {
          uri: returnPhotoUri,
          name: filename,
          type: type,
        });
      }
      formData.append('notes', returnNotes.trim());

      const res = await apiService.requestReturnLoan(selectedLoanForReturn.id, formData);

      if (res && res.status === 'success') {
        Alert.alert(
          '✅ Devolución Registrada',
          'La evidencia de foto y la descripción fueron registradas. El Administrador verificará y concluirá el préstamo.'
        );
        setReturnModalVisible(false);
        setReturnPhotoUri(null);
        setReturnNotes('');
        fetchLoans();
      } else {
        Alert.alert('Error', res?.message || 'No se pudo guardar la devolución.');
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
      `¿Confirmas aprobar la solicitud #PR-${loanId}? A partir de este instante el reloj comenzará a contar tiempo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Aprobar',
          onPress: async () => {
            try {
              const res = await apiService.approveLoan(loanId);
              if (res && res.status === 'success') {
                Alert.alert('🟢 Préstamo Aprobado', 'La solicitud ha sido aprobada y el conteo de tiempo ha iniciado.');
                fetchLoans();
              } else {
                Alert.alert('Error', res?.message || 'No se pudo aprobar.');
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
      '🟢 Aprobar Devolución Final',
      `¿Confirmas que verificaste en estante la entrega de la evidencia del préstamo #PR-${loanId}? Esto detendrá el tiempo y concluirá el registro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Aprobar y Concluir',
          onPress: async () => {
            try {
              const res = await apiService.approveReturnLoan(loanId);
              if (res && res.status === 'success') {
                Alert.alert('🟢 Devolución Verificada', 'La devolución ha sido aprobada, el tiempo se detuvo y se guardó en el historial.');
                fetchLoans();
              } else {
                Alert.alert('Error', res?.message || 'No se pudo verificar.');
              }
            } catch (e) {
              Alert.alert('Error', 'Error al aprobar la devolución: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const handleSubmitRejection = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert("Justificación Requerida", "Debes ingresar una razón o justificación clara del rechazo/observación.");
      return;
    }

    setSubmittingReject(true);
    try {
      let res;
      if (rejectActionType === 'loan') {
        res = await apiService.rejectLoan(selectedLoanForReject.id, rejectionReason.trim());
      } else {
        res = await apiService.rejectReturnLoan(selectedLoanForReject.id, rejectionReason.trim());
      }

      if (res && res.status === 'success') {
        Alert.alert(
          rejectActionType === 'loan' ? '✕ Solicitud Rechazada' : '⚠️ Marcado Con Atención',
          res.message || 'Se actualizó el estado del préstamo y se notificó la justificación.'
        );
        setRejectModalVisible(false);
        setRejectionReason('');
        fetchLoans();
      } else {
        Alert.alert('Error', res?.message || 'No se pudo procesar la acción.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error al procesar rechazo: ' + e.message);
    } finally {
      setSubmittingReject(false);
    }
  };

  const openControlMayorModal = (item) => {
    setSelectedLoanForControlMayor(item);
    setControlMayorNotes('');
    setControlMayorPhotoUri(null);
    setControlMayorModalVisible(true);
  };

  const pickControlMayorPhoto = async (useCamera = false) => {
    try {
      let result;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permiso Denegado", "Se requiere permiso de cámara para capturar la evidencia.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setControlMayorPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo seleccionar la fotografía: " + e.message);
    }
  };

  const handleSubmitControlMayor = async () => {
    if (!controlMayorNotes.trim()) {
      Alert.alert("Justificación Requerida", "Debes ingresar una nota o justificación clara para el registro de Control Mayor.");
      return;
    }

    setSubmittingControlMayor(true);
    try {
      const formData = new FormData();
      formData.append('notes', controlMayorNotes.trim());

      if (controlMayorPhotoUri) {
        const filename = controlMayorPhotoUri.split('/').pop() || 'control_mayor.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', {
          uri: Platform.OS === 'ios' ? controlMayorPhotoUri.replace('file://', '') : controlMayorPhotoUri,
          name: filename,
          type: type
        });
      }

      const res = await apiService.processControlMayor(selectedLoanForControlMayor.id, formData);
      if (res && res.status === 'success') {
        Alert.alert(
          '🏛️ Control Mayor Registrado',
          res.message || 'El registro concluyó bajo la etiqueta de Control Mayor.'
        );
        setControlMayorModalVisible(false);
        setControlMayorNotes('');
        setControlMayorPhotoUri(null);
        fetchLoans();
      } else {
        Alert.alert('Error', res?.message || 'No se pudo procesar el registro de Control Mayor.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error procesando Control Mayor: ' + e.message);
    } finally {
      setSubmittingControlMayor(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      "🧹 Limpiar Historial Concluido",
      "¿Deseas eliminar de la lista todos los registros concluidos (Devueltos y Rechazados)?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, Limpiar",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiService.clearLoansHistory();
              if (res && res.status === 'success') {
                Alert.alert("Limpieza Exitosa", res.message);
                fetchLoans();
              } else {
                Alert.alert("Error", res?.message || "No se pudo limpiar el historial.");
              }
            } catch (e) {
              Alert.alert("Error", "Error limpiando historial: " + e.message);
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
        normalizeText(l.notes || '').includes(qNorm) ||
        normalizeText(l.rejection_reason || '').includes(qNorm)
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

  const renderLoanCard = ({ item }) => {
    const isReqPendiente = item.status === 'Pendiente Aprobación Admin';
    const isPrestado = item.status === 'Prestado';
    const isPendiente = item.status === 'Pendiente Verificación Admin';
    const isAtencion = item.status === 'Requiere Atención';
    const isControlMayor = item.status === 'Control Mayor';
    const isRechazado = item.status === 'Rechazado';
    const isDevuelto = item.status === 'Devuelto';

    const photoUri = getImageUrl(item.return_photo_path, serverUrl);
    const controlMayorPhotoUri = getImageUrl(item.control_mayor_photo, serverUrl);
    const isAdmin = (role === 'admin');
    const isBorrower = Boolean(
      user && item.borrower_name && 
      user.trim().toLowerCase() === item.borrower_name.trim().toLowerCase()
    );

    const timerText = formatLiveTimer(item.loan_date, item.status, item.return_date || item.verified_at);

    return (
      <View style={{ marginBottom: 14 }}>
        <View style={[
          styles.loanGlassCard, 
          { backgroundColor: cardBg, borderColor: isControlMayor ? '#8b5cf6' : (isAtencion ? '#ef4444' : cardBorder) }
        ]}>
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
              isReqPendiente ? styles.badgeYellow : 
              (isPrestado ? styles.badgeAmber : 
              (isPendiente ? styles.badgeOrange : 
              (isAtencion ? styles.badgeRed : 
              (isControlMayor ? { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: '#8b5cf6' } :
              (isRechazado ? styles.badgeDarkRed : styles.badgeGreen)))))
            ]}>
              <Text style={[
                styles.loanStatusBadgeText, 
                isReqPendiente ? styles.textYellow : 
                (isPrestado ? styles.textAmber : 
                (isPendiente ? styles.textOrange : 
                (isAtencion ? styles.textRed : 
                (isControlMayor ? { color: '#a78bfa' } :
                (isRechazado ? styles.textDarkRed : styles.textGreen)))))
              ]}>
                {isReqPendiente ? '⏳ Solicitud' : 
                 (isPrestado ? '🟡 En Préstamo' : 
                 (isPendiente ? '📷 Por Verificar' : 
                 (isAtencion ? '⚠️ Requiere Atención' : 
                 (isControlMayor ? '🏛️ Control Mayor' :
                 (isRechazado ? '✕ Rechazado' : '🟢 Devuelto')))))}
              </Text>
            </View>
          </View>

          {/* RELOJ EN TIEMPO REAL */}
          <View style={[styles.timerLiveBox, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)', borderColor: isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.25)' }]}>
            <Text style={{ fontSize: 14 }}>⏱️</Text>
            <Text style={[styles.timerLiveLabel, { color: subtextColor }]}>Tiempo Transcurrido:</Text>
            <Text style={[styles.timerLiveValue, { color: isPrestado ? (isDark ? '#22d3ee' : '#0891b2') : (isControlMayor ? '#a78bfa' : textColor) }]}>
              {timerText}
            </Text>
          </View>

          {/* Divisor Sutil */}
          <View style={[styles.cardDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]} />

          {/* Filas de Información */}
          <View style={styles.loanMetaInfo}>
            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>👤</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Solicitante:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                {item.borrower_name || item.student_name || 'Docente'} ({item.borrower_type || 'Responsable'})
              </Text>
            </View>

            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>📦</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Cantidad:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]}>
                {item.quantity_borrowed || item.quantity || 1} elemento(s)
              </Text>
            </View>

            <View style={styles.metaRowExact}>
              <Text style={styles.metaIcon}>📅</Text>
              <Text style={[styles.metaLabelText, { color: subtextColor }]}>Fecha y Hora:</Text>
              <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={1}>
                {item.loan_date || 'Reciente'}
              </Text>
            </View>

            {item.notes ? (
              <View style={styles.metaRowExact}>
                <Text style={styles.metaIcon}>📝</Text>
                <Text style={[styles.metaLabelText, { color: subtextColor }]}>Observaciones:</Text>
                <Text style={[styles.metaValueText, { color: textColor }]} numberOfLines={2}>
                  {item.notes}
                </Text>
              </View>
            ) : null}

            {/* Banner de Observación del Admin cuando Requiere Atención o Rechazado */}
            {(isAtencion || isRechazado) && item.rejection_reason ? (
              <View style={styles.rejectionWarningBox}>
                <Text style={styles.rejectionWarningTitle}>
                  {isAtencion ? '⚠️ Observación del Administrador:' : '✕ Justificación de Rechazo:'}
                </Text>
                <Text style={[styles.rejectionWarningText, { color: textColor }]}>
                  "{item.rejection_reason}"
                </Text>
              </View>
            ) : null}

            {/* Banner de Registro de Control Mayor si aplica */}
            {item.control_mayor_notes ? (
              <View style={[styles.evidenceBox, { backgroundColor: 'rgba(139, 92, 246, 0.12)', borderColor: '#8b5cf6' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>🏛️</Text>
                  <Text style={[styles.evidenceHeading, { color: '#a78bfa' }]}>
                    Resguardo Especial (Control Mayor)
                  </Text>
                </View>
                <Text style={[styles.evidenceText, { color: textColor }]}>
                  "{item.control_mayor_notes}"
                </Text>
                {controlMayorPhotoUri ? (
                  <Image source={{ uri: controlMayorPhotoUri }} style={styles.evidenceThumb} resizeMode="cover" />
                ) : null}
              </View>
            ) : null}

            {/* Evidencia de Entrega si existe */}
            {item.return_notes || photoUri ? (
              <View style={[styles.evidenceBox, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.10)' : 'rgba(6, 182, 212, 0.08)', borderColor: isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.30)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 13 }}>📸</Text>
                  <Text style={[styles.evidenceHeading, { color: isDark ? '#22d3ee' : '#0891b2' }]}>
                    Evidencia de Devolución
                  </Text>
                </View>
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

          {/* Botones de Acción Organizados */}
          <View style={styles.cardButtonsColumn}>
            {/* Si es solicitud pendiente y es admin: Botones de Aprobar o Rechazar */}
            {isReqPendiente && isAdmin ? (
              <View style={styles.btnDualRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: '#ef4444', flex: 1 }]}
                  activeOpacity={0.8}
                  onPress={() => openRejectModal(item, 'loan')}
                >
                  <Text style={{ fontSize: 13 }}>✕</Text>
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Rechazar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#eab308', borderColor: '#ca8a04', flex: 1.4 }]}
                  activeOpacity={0.8}
                  onPress={() => handleApproveLoan(item.id)}
                >
                  <Text style={{ fontSize: 13 }}>👑</Text>
                  <Text style={[styles.actionBtnText, { color: '#0f172a', fontWeight: '900' }]}>Aprobar Préstamo</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Si está prestado y EL USUARIO ES EL SOLICITANTE */}
            {isPrestado && isBorrower ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#06b6d4', borderColor: '#0891b2', width: '100%' }]}
                activeOpacity={0.8}
                onPress={() => openReturnModal(item)}
              >
                <Text style={{ fontSize: 13 }}>📸</Text>
                <Text style={[styles.actionBtnText, { color: '#ffffff', fontWeight: '900' }]}>Entregar con Foto y Descripción</Text>
              </TouchableOpacity>
            ) : null}

            {/* Si requiere atención y EL USUARIO ES EL SOLICITANTE */}
            {isAtencion && isBorrower ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f59e0b', borderColor: '#d97706', width: '100%' }]}
                activeOpacity={0.8}
                onPress={() => openReturnModal(item)}
              >
                <Text style={{ fontSize: 13 }}>🛠️</Text>
                <Text style={[styles.actionBtnText, { color: '#0f172a', fontWeight: '900' }]}>Corregir Evidencia y Re-entregar</Text>
              </TouchableOpacity>
            ) : null}

            {/* Si está pendiente de verificación y es admin */}
            {isPendiente && isAdmin ? (
              <View style={styles.btnDualRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: '#ef4444', flex: 1 }]}
                  activeOpacity={0.8}
                  onPress={() => openRejectModal(item, 'return')}
                >
                  <Text style={{ fontSize: 13 }}>⚠️</Text>
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Observar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10b981', borderColor: '#059669', flex: 1.4 }]}
                  activeOpacity={0.8}
                  onPress={() => handleApproveReturn(item.id)}
                >
                  <Text style={{ fontSize: 13 }}>🟢</Text>
                  <Text style={[styles.actionBtnText, { color: '#ffffff', fontWeight: '900' }]}>Aprobar Devolución</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Si es Admin y el préstamo YA FUE ACEPTADO previante (está prestado, en atención o verificación) */}
            {isAdmin && (isPrestado || isPendiente || isAtencion) ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(139, 92, 246, 0.22)', borderColor: '#8b5cf6', width: '100%' }]}
                activeOpacity={0.8}
                onPress={() => openControlMayorModal(item)}
              >
                <Text style={{ fontSize: 13 }}>🏛️</Text>
                <Text style={[styles.actionBtnText, { color: isDark ? '#c4b5fd' : '#6d28d9', fontWeight: '800' }]}>Cierre por Control Mayor (Caso Especial)</Text>
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
        <View style={styles.headerLogoBox}>
          <View style={[styles.headerFlaskBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)', borderColor: cardBorder }]}>
            <Text style={styles.headerFlaskIcon}>🤝</Text>
          </View>
          <View>
            <Text style={[styles.headerLogoTitle, { color: textColor }]}>ITMA II</Text>
            <Text style={[styles.headerLogoSubtitle, { color: subtextColor }]}>Préstamos</Text>
          </View>
        </View>

        {/* Botón Prominente "+ Solicitar Préstamo" */}
        <TouchableOpacity
          style={styles.newLoanBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#06b6d4', '#0284c7']} style={styles.newLoanGradient}>
            <Text style={styles.newLoanText}>+ Solicitar Préstamo</Text>
          </LinearGradient>
        </TouchableOpacity>
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
                filter === 'Requiere Atención' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }
              ]}
              onPress={() => setFilter('Requiere Atención')}
            >
              <Text style={[styles.filterPillText, filter === 'Requiere Atención' ? { color: '#ffffff', fontWeight: '900' } : { color: textColor }]}>
                ⚠️ Requiere Atención
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
            placeholder="Buscar por solicitante, compuesto, notas..."
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
                  No se encontraron registros de préstamos en el filtro seleccionado.
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* MODAL DE NUEVA SOLICITUD DE PRÉSTAMO */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <TouchableOpacity style={styles.quickModalOverlay} activeOpacity={1} onPress={() => setCreateModalVisible(false)}>
          <View style={[styles.returnModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: cardBorder }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: textColor }]}>📋 Nueva Solicitud de Préstamo</Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>
              Ingresa el material o compuesto solicitado y la persona responsable:
            </Text>

            {/* Selección de Responsable */}
            <Text style={[styles.inputLabel, { color: subtextColor }]}>Persona Responsable / Solicitante:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {registeredUsers.length > 0 ? (
                  registeredUsers.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[
                        styles.userPickChip,
                        selectedUser?.id === u.id && { backgroundColor: '#06b6d4', borderColor: '#22d3ee' }
                      ]}
                      onPress={() => setSelectedUser(u)}
                    >
                      <Text style={[styles.userPickText, selectedUser?.id === u.id && { color: '#ffffff', fontWeight: 'bold' }]}>
                        👤 {u.username}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ color: subtextColor, fontSize: 12 }}>Cargando usuarios...</Text>
                )}
              </View>
            </ScrollView>

            {/* Input de Nombre del Material */}
            <Text style={[styles.inputLabel, { color: subtextColor }]}>Nombre del Compuesto o Material:</Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: cardBorder, color: textColor }]}
              placeholder="Ej. Ácido Clorhídrico 1M / Pipeta Graduada..."
              placeholderTextColor={subtextColor}
              value={itemName}
              onChangeText={setItemName}
            />

            {/* Input de Cantidad */}
            <Text style={[styles.inputLabel, { color: subtextColor, marginTop: 8 }]}>Cantidad:</Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: cardBorder, color: textColor }]}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor={subtextColor}
              value={itemQuantity}
              onChangeText={setItemQuantity}
            />

            {/* Input de Notas / Práctica */}
            <Text style={[styles.inputLabel, { color: subtextColor, marginTop: 8 }]}>Notas / Práctica de Laboratorio:</Text>
            <TextInput
              style={[styles.returnNotesInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: cardBorder, color: textColor }]}
              placeholder="Ej. Uso en la práctica #4 de Química Orgánica..."
              placeholderTextColor={subtextColor}
              value={itemNotes}
              onChangeText={setItemNotes}
              multiline
            />

            {/* Botones */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.quickModalCloseBtn, { flex: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)' }]} onPress={() => setCreateModalVisible(false)}>
                <Text style={[styles.quickModalCloseText, { color: subtextColor }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitReturnBtn, { flex: 2 }]} onPress={handleCreateLoan} disabled={submittingCreate}>
                <LinearGradient colors={['#06b6d4', '#0284c7']} style={styles.submitReturnGradient}>
                  {submittingCreate ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitReturnText}>Enviar Solicitud 🚀</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL DE DEVOLUCIÓN CON FOTOGRAFÍA Y DESCRIPCIÓN */}
      <Modal
        visible={returnModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <TouchableOpacity style={styles.quickModalOverlay} activeOpacity={1} onPress={() => setReturnModalVisible(false)}>
          <View style={[styles.returnModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: cardBorder }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: textColor }]}>📸 Protocolo de Devolución</Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>
              Adjunta la foto del compuesto devuelto y describe su estado final según el protocolo de laboratorio:
            </Text>

            {/* Preview de Foto */}
            {returnPhotoUri || selectedLoanForReturn?.return_photo_path ? (
              <View style={styles.photoPreviewContainer}>
                <Image 
                  source={{ uri: returnPhotoUri || getImageUrl(selectedLoanForReturn?.return_photo_path, serverUrl) }} 
                  style={styles.photoPreviewImage} 
                  resizeMode="cover" 
                />
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

            {/* Input de Notas de Devolución */}
            <Text style={[styles.inputLabel, { color: subtextColor, marginTop: 8 }]}>Descripción de Uso y Estado Final (*Obligatorio):</Text>
            <TextInput
              style={[styles.returnNotesInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: cardBorder, color: textColor }]}
              placeholder="Describe lo realizado con la sustancia y el estado del envase (ej. Se utilizó en práctica #3, frasco limpio)..."
              placeholderTextColor={subtextColor}
              value={returnNotes}
              onChangeText={setReturnNotes}
              multiline
            />

            {/* Botones */}
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

      {/* MODAL DE RECHAZO / OBSERVACIÓN POR ADMIN */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <TouchableOpacity style={styles.quickModalOverlay} activeOpacity={1} onPress={() => setRejectModalVisible(false)}>
          <View style={[styles.returnModalCard, { backgroundColor: isDark ? '#071226' : '#ffffff', borderColor: '#ef4444' }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.quickModalTitle, { color: '#ef4444' }]}>
              {rejectActionType === 'loan' ? '✕ Rechazar Solicitud' : '⚠️ Observación en Devolución'}
            </Text>
            <Text style={[styles.quickModalSub, { color: subtextColor }]}>
              {rejectActionType === 'loan' 
                ? 'Ingresa la justificación para rechazar esta solicitud de préstamo:'
                : 'Ingresa la razón por la cual no se acepta la devolución (el préstamo se marcará como Requiere Atención):'}
            </Text>

            <TextInput
              style={[styles.returnNotesInput, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', borderColor: '#ef4444', color: textColor, minHeight: 90 }]}
              placeholder="Ej. Foto borrosa / Falta limpieza del envase / Pieza faltante..."
              placeholderTextColor={subtextColor}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.quickModalCloseBtn, { flex: 1, borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)' }]} onPress={() => setRejectModalVisible(false)}>
                <Text style={[styles.quickModalCloseText, { color: subtextColor }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitReturnBtn, { flex: 2 }]} onPress={handleSubmitRejection} disabled={submittingReject}>
                <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.submitReturnGradient}>
                  {submittingReject ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitReturnText}>Confirmar Observación ⚠️</Text>
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

      {/* 8. MODAL REGISTRO CONTROL MAYOR (CASO ESPECIAL) POR ADMIN */}
      <Modal
        visible={controlMayorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setControlMayorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalGlassCard, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)', borderColor: '#8b5cf6' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🏛️</Text>
                <Text style={[styles.modalTitleText, { color: isDark ? '#a78bfa' : '#7c3aed' }]}>
                  Protocolo Control Mayor
                </Text>
              </View>
              <TouchableOpacity onPress={() => setControlMayorModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={{ color: subtextColor, fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: subtextColor, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                Este protocolo concluye el préstamo cuando el compuesto/material fue entregado pero no permanece en el estante del laboratorio (ej: llevado a revisión técnica externa, calibración o resguardo en otra área).
              </Text>

              <Text style={[styles.inputLabel, { color: textColor }]}>📝 Nota Explicativa / Justificación de Resguardo *</Text>
              <TextInput
                style={[styles.modalTextArea, { color: textColor, borderColor: cardBorder }]}
                placeholder="Describe el motivo y ubicación del equipo (ej: Enviado a calibración técnica externa o resguardado en Bodega Central B-04)..."
                placeholderTextColor={subtextColor}
                multiline={true}
                numberOfLines={3}
                value={controlMayorNotes}
                onChangeText={setControlMayorNotes}
              />

              <Text style={[styles.inputLabel, { color: textColor, marginTop: 12 }]}>📸 Evidencia / Documento de Resguardo (Opcional)</Text>
              
              {controlMayorPhotoUri ? (
                <View style={{ marginBottom: 12, alignItems: 'center' }}>
                  <Image source={{ uri: controlMayorPhotoUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setControlMayorPhotoUri(null)} style={{ marginTop: 6 }}>
                    <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>✕ Quitar foto</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={[styles.photoPickerBtn, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.9)', borderColor: cardBorder, flex: 1 }]}
                    onPress={() => pickControlMayorPhoto(true)}
                  >
                    <Text style={{ fontSize: 18 }}>📷</Text>
                    <Text style={{ color: textColor, fontSize: 11, fontWeight: 'bold' }}>Tomar Foto</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.photoPickerBtn, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(241, 245, 249, 0.9)', borderColor: cardBorder, flex: 1 }]}
                    onPress={() => pickControlMayorPhoto(false)}
                  >
                    <Text style={{ fontSize: 18 }}>🖼️</Text>
                    <Text style={{ color: textColor, fontSize: 11, fontWeight: 'bold' }}>Galería</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: cardBorder }]}
                onPress={() => setControlMayorModalVisible(false)}
              >
                <Text style={{ color: textColor, fontWeight: 'bold', fontSize: 13 }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#7c3aed', flex: 1.5 }]}
                disabled={submittingControlMayor}
                onPress={handleSubmitControlMayor}
              >
                {submittingControlMayor ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13 }}>🏛️ Registrar Control Mayor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  newLoanBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  newLoanGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newLoanText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  mainContentContainer: {
    flex: 1,
    paddingHorizontal: 14,
  },
  filtersScrollContainer: {
    marginVertical: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
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
    fontWeight: '600',
    textAlign: 'center',
  },
  loanGlassCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 14,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  loanCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  loanTitleCol: {
    flex: 1,
  },
  loanIdPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.18)',
    borderColor: '#06b6d4',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  loanIdPillText: {
    color: '#06b6d4',
    fontSize: 10.5,
    fontWeight: '900',
  },
  loanItemTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  loanStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  loanStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeYellow: { backgroundColor: 'rgba(234, 179, 8, 0.15)', borderColor: '#eab308' },
  textYellow: { color: '#eab308' },
  badgeAmber: { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8' },
  textAmber: { color: '#38bdf8' },
  badgeOrange: { backgroundColor: 'rgba(249, 115, 22, 0.15)', borderColor: '#f97316' },
  textOrange: { color: '#f97316' },
  badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' },
  textRed: { color: '#ef4444' },
  badgeDarkRed: { backgroundColor: 'rgba(153, 27, 27, 0.3)', borderColor: '#991b1b' },
  textDarkRed: { color: '#fca5a5' },
  badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' },
  textGreen: { color: '#10b981' },
  timerLiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  timerLiveLabel: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  timerLiveValue: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    marginVertical: 10,
  },
  loanMetaInfo: {
    gap: 6,
  },
  metaRowExact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 13,
  },
  metaLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaValueText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  rejectionWarningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
  },
  rejectionWarningTitle: {
    color: '#ef4444',
    fontSize: 11.5,
    fontWeight: '900',
  },
  rejectionWarningText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    fontWeight: '600',
  },
  evidenceBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  evidenceHeading: {
    fontSize: 12,
    fontWeight: '800',
  },
  evidenceText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  evidenceThumb: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 8,
  },
  cardButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cardNeumorphBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  cardBtnIcon: {
    fontSize: 14,
  },
  cardBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  quickModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 20,
  },
  returnModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 20,
  },
  quickModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  quickModalSub: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalTextInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  userPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  userPickText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  photoPreviewContainer: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: 180,
  },
  retakePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  retakePhotoText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
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
  returnNotesInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    fontWeight: '600',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  quickModalCloseBtn: {
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickModalCloseText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  submitReturnBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitReturnGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReturnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '900',
  },
  cardButtonsColumn: {
    marginTop: 12,
    gap: 8,
    width: '100%',
  },
  btnDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.2,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalGlassCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTextArea: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoPickerBtn: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  quickOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickOptionSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
});
