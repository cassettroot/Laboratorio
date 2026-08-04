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
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../api/services';
import apiClient, { getImageUrl } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { normalizeText } from '../utils/textUtils';

export default function LoansScreen() {
  const { role, user } = useContext(AuthContext);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'Pendiente Aprobación Admin' | 'Prestado' | 'Pendiente Verificación Admin' | 'Devuelto'

  // Estado del Modal de Devolución
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedLoanForReturn, setSelectedLoanForReturn] = useState(null);
  const [returnPhotoUri, setReturnPhotoUri] = useState(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchLoans = async () => {
    setLoading(true);
    try {
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
    if (!selectedLoanForReturn) return;
    if (!returnPhotoUri) {
      Alert.alert("Fotografía Requerida", "Por favor toma o selecciona una foto del compuesto guardado en su estante.");
      return;
    }
    if (!returnNotes.trim()) {
      Alert.alert("Descripción Requerida", "Por favor ingresa una breve descripción sobre la entrega o estado del compuesto.");
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
        normalizeText(l.borrower_name).includes(qNorm) ||
        normalizeText(l.loan_date).includes(qNorm) ||
        normalizeText(l.notes).includes(qNorm)
      );
    }
    return true;
  });

  const renderLoanCard = ({ item }) => {
    const isReqPendiente = item.status === 'Pendiente Aprobación Admin';
    const isPrestado = item.status === 'Prestado';
    const isPendiente = item.status === 'Pendiente Verificación Admin';
    const isDevuelto = item.status === 'Devuelto';

    const photoUri = getImageUrl(item.return_photo_path);
    const isAdmin = (role === 'admin');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.item_name}</Text>
            <Text style={styles.quantityText}>ID Préstamo: #PR-{item.id}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            isReqPendiente ? styles.badgeYellow : (isPrestado ? styles.badgeAmber : (isPendiente ? styles.badgeOrange : styles.badgeGreen))
          ]}>
            <Text style={[
              styles.statusBadgeText, 
              isReqPendiente ? styles.textYellow : (isPrestado ? styles.textAmber : (isPendiente ? styles.textOrange : styles.textGreen))
            ]}>
              {isReqPendiente ? '⏳ Pendiente Aprobación' : (isPrestado ? '🟡 En Préstamo' : (isPendiente ? '📷 Pendiente Verificación' : '🟢 Devuelto'))}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Responsable Solicitante:</Text>
            <Text style={styles.detailVal}>{item.borrower_name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Fecha / Hora:</Text>
            <Text style={styles.detailVal}>{item.loan_date || 'No iniciada'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏱️ Tiempo Transcurrido:</Text>
            <Text style={[
              styles.detailVal, 
              isPrestado ? styles.timeActive : (isReqPendiente ? { color: '#fbbf24' } : {})
            ]}>
              {item.elapsed_time}
            </Text>
          </View>

          {item.notes ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📝 Observaciones:</Text>
              <Text style={[styles.detailVal, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>{item.notes}</Text>
            </View>
          ) : null}

          {photoUri ? (
            <View style={styles.photoContainer}>
              <Text style={styles.detailLabel}>📸 Evidencia en Estante:</Text>
              <Image source={{ uri: photoUri }} style={styles.returnPhoto} resizeMode="cover" />
            </View>
          ) : null}

          {item.return_notes ? (
            <View style={{ backgroundColor: '#0f172a', padding: 8, borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}>💬 Descripción de Entrega:</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 11, italic: true, marginTop: 2 }}>"{item.return_notes}"</Text>
            </View>
          ) : null}
        </View>

        {/* ACCIONES DE TARJETA */}
        <View style={{ marginTop: 10, gap: 6 }}>
          {isPrestado ? (
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => openReturnModal(item)}
            >
              <Text style={styles.returnBtnText}>📸 Devolver Compuesto (Foto y Descripción)</Text>
            </TouchableOpacity>
          ) : null}

          {isAdmin && isReqPendiente ? (
            <TouchableOpacity
              style={styles.approveReqBtn}
              onPress={() => handleApproveLoan(item.id)}
            >
              <Text style={styles.approveReqBtnText}>👑 Aprobar Préstamo (Iniciar Tiempo)</Text>
            </TouchableOpacity>
          ) : null}

          {isAdmin && isPendiente ? (
            <TouchableOpacity
              style={styles.approveReturnBtn}
              onPress={() => handleApproveReturn(item.id)}
            >
              <Text style={styles.approveReturnBtnText}>🟢 Aprobar Devolución en Estante</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.badge}>📋 Custodia & Evidencia de Préstamos</Text>
        <Text style={styles.title}>Préstamos y Devoluciones</Text>
        <Text style={styles.subtitle}>
          Control de tiempos transcurridos, solicitudes de préstamo y verificación de entrega con foto y descripción.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterBtn, filter === 'all' ? styles.filterBtnActive : {}]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterBtnText, filter === 'all' ? styles.filterBtnTextActive : {}]}>Todos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, filter === 'Pendiente Aprobación Admin' ? styles.filterBtnActiveYellow : {}]}
              onPress={() => setFilter('Pendiente Aprobación Admin')}
            >
              <Text style={[styles.filterBtnText, filter === 'Pendiente Aprobación Admin' ? styles.filterBtnTextActive : {}]}>⏳ Solicitudes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, filter === 'Prestado' ? styles.filterBtnActiveAmber : {}]}
              onPress={() => setFilter('Prestado')}
            >
              <Text style={[styles.filterBtnText, filter === 'Prestado' ? styles.filterBtnTextActive : {}]}>🟡 En Préstamo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, filter === 'Pendiente Verificación Admin' ? styles.filterBtnActiveOrange : {}]}
              onPress={() => setFilter('Pendiente Verificación Admin')}
            >
              <Text style={[styles.filterBtnText, filter === 'Pendiente Verificación Admin' ? styles.filterBtnTextActive : {}]}>📷 Pendientes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterBtn, filter === 'Devuelto' ? styles.filterBtnActiveGreen : {}]}
              onPress={() => setFilter('Devuelto')}
            >
              <Text style={[styles.filterBtnText, filter === 'Devuelto' ? styles.filterBtnTextActive : {}]}>🟢 Devueltos</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar compuesto o responsable..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* LISTADO */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredLoans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLoanCard}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoans(); }} tintColor="#f59e0b" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay registros de préstamos que coincidan.</Text>
          }
        />
      )}

      {/* MODAL DE DEVOLUCIÓN MÓVIL (FOTO + DESCRIPCIÓN) */}
      <Modal
        visible={returnModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReturnModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 Devolución en Estante</Text>
              <TouchableOpacity onPress={() => setReturnModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedLoanForReturn && (
              <ScrollView style={{ maxHeight: 460 }}>
                <View style={styles.substanceSummaryBox}>
                  <Text style={styles.substanceSummaryName}>{selectedLoanForReturn.item_name}</Text>
                  <Text style={styles.substanceSummaryStock}>
                    Folio: #PR-{selectedLoanForReturn.id} | Solicitante: {selectedLoanForReturn.borrower_name}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Fotografía del Reactivo en Estante *</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                  <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1 }]} onPress={takeReturnPhoto}>
                    <Text style={styles.photoPickerBtnText}>📷 Tomar Foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={pickReturnPhoto}>
                    <Text style={styles.photoPickerBtnText}>🖼️ Abrir Galería</Text>
                  </TouchableOpacity>
                </View>

                {returnPhotoUri ? (
                  <View style={styles.previewImageContainer}>
                    <Image source={{ uri: returnPhotoUri }} style={styles.previewImage} resizeMode="cover" />
                    <Text style={styles.previewSuccessText}>✅ Fotografía de evidencia cargada</Text>
                  </View>
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Text style={{ color: '#64748b', fontSize: 12 }}>Sin imagen seleccionada</Text>
                  </View>
                )}

                <Text style={styles.inputLabel}>Descripción / Estado de Entrega *</Text>
                <TextInput
                  style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Ej. Envase sellado y devuelto a charola A-2 sin derrames..."
                  placeholderTextColor="#64748b"
                  value={returnNotes}
                  onChangeText={setReturnNotes}
                />

                <TouchableOpacity
                  style={[styles.submitLoanBtn, submittingReturn && { opacity: 0.6 }]}
                  disabled={submittingReturn}
                  onPress={handleSubmitReturn}
                >
                  {submittingReturn ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.submitLoanBtnText}>Subir Evidencia y Entregar</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  badge: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterBtnActive: {
    backgroundColor: '#334155',
  },
  filterBtnActiveYellow: {
    backgroundColor: '#d97706',
  },
  filterBtnActiveAmber: {
    backgroundColor: '#b45309',
  },
  filterBtnActiveOrange: {
    backgroundColor: '#ea580c',
  },
  filterBtnActiveGreen: {
    backgroundColor: '#10b981',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  quantityText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderWidth: 1,
    borderColor: '#eab308',
  },
  badgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  badgeOrange: {
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    borderWidth: 1,
    borderColor: '#ea580c',
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textYellow: {
    color: '#facc15',
  },
  textAmber: {
    color: '#fbbf24',
  },
  textOrange: {
    color: '#fb923c',
  },
  textGreen: {
    color: '#34d399',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  timeActive: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  photoContainer: {
    marginTop: 6,
    gap: 4,
  },
  returnPhoto: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  returnBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  returnBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  approveReqBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveReqBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
  },
  approveReturnBtn: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  approveReturnBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  substanceSummaryBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  substanceSummaryName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  substanceSummaryStock: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  photoPickerBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  photoPickerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  previewImageContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  previewSuccessText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  noImagePlaceholder: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  submitLoanBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  submitLoanBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
  },
});

