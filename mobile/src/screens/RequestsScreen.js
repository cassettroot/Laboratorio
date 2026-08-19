import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

export default function RequestsScreen() {
  const { role, syncSignal } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal para rechazar/pedir corrección
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await apiService.getChangeRequests();
      if (res.status === 'success') {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.warn("Error al cargar solicitudes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [syncSignal]);

  const handleApprove = (reqId) => {
    Alert.alert(
      'Aprobar Solicitud',
      '¿Está seguro de aplicar los cambios de esta solicitud al inventario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await apiService.approveRequest(reqId);
              if (res.status === 'success') {
                Alert.alert('Éxito', 'Solicitud aprobada correctamente.');
                fetchRequests();
              } else {
                Alert.alert('Error', res.message || 'No se pudo aprobar la solicitud.');
              }
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRejectSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Atención', 'Por favor ingrese las observaciones o motivo.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiService.rejectRequest(selectedReq.id, feedback.trim());
      if (res.status === 'success') {
        Alert.alert('Éxito', 'Solicitud devuelta para corrección.');
        setRejectModalVisible(false);
        setFeedback('');
        fetchRequests();
      } else {
        Alert.alert('Error', res.message || 'No se pudo rechazar la solicitud.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === 'PENDIENTE';
    const isApproved = item.status === 'APROBADO';
    
    let badgeBg = 'rgba(234, 179, 8, 0.15)';
    let badgeBorder = 'rgba(234, 179, 8, 0.35)';
    let badgeText = '#eab308';
    
    if (isApproved) {
      badgeBg = 'rgba(16, 185, 129, 0.15)';
      badgeBorder = 'rgba(16, 185, 129, 0.35)';
      badgeText = '#34d399';
    } else if (item.status === 'RECHAZADO' || item.status === 'CORRECCIÓN SOLICITADA') {
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeBorder = 'rgba(239, 68, 68, 0.35)';
      badgeText = '#f87171';
    }

    return (
      <View style={{ marginBottom: 12 }}>
        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.reqId, { color: theme.text }]}>Solicitud #{item.id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
              <Text style={[styles.statusBadgeText, { color: badgeText }]}>{item.status}</Text>
            </View>
          </View>

          <Text style={[styles.actionText, { color: theme.subtext }]}>
            Acción: <Text style={{ fontWeight: '800', color: theme.text }}>{item.action} ({item.type})</Text>
          </Text>
          <Text style={[styles.targetText, { color: theme.brand }]} numberOfLines={2}>
            Elemento: {item.target_name || 'Nuevo registro'}
          </Text>
          <Text style={[styles.requesterText, { color: theme.subtext }]}>
            Solicitante: <Text style={{ fontWeight: '700', color: theme.text }}>{item.requester_username}</Text>
          </Text>
          {item.approved_by ? (
            <Text style={[styles.approvedByText, { color: isApproved ? '#34d399' : '#38bdf8' }]}>
              👤 {isApproved ? 'Aprobado por:' : 'Revisado por:'} <Text style={{ fontWeight: '800' }}>{item.approved_by}</Text>
            </Text>
          ) : null}

          {item.feedback ? (
            <View style={[styles.feedbackBox, { backgroundColor: theme.glassPill, borderColor: theme.glassBorder }]}>
              <Text style={styles.feedbackTitle}>💬 Retroalimentación:</Text>
              <Text style={[styles.feedbackText, { color: theme.text }]}>{item.feedback}</Text>
            </View>
          ) : null}

          {role === 'admin' && isPending ? (
            <View style={[styles.adminActions, { borderTopColor: theme.glassBorder }]}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnApprove]}
                onPress={() => handleApprove(item.id)}
              >
                <Text style={styles.btnText}>Aprobar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btn, styles.btnReject]}
                onPress={() => {
                  setSelectedReq(item);
                  setFeedback('');
                  setRejectModalVisible(true);
                }}
              >
                <Text style={styles.btnText}>Devolver / Corregir</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </GlassCard>
      </View>
    );
  };

  return (
    <GlassBackground>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor={theme.brand} />}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.subtext }]}>No hay solicitudes de cambio registradas.</Text>
            }
          />
        )}

        {/* Modal para solicitar corrección */}
        <Modal
          visible={rejectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRejectModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Solicitar Corrección</Text>
              <Text style={[styles.modalDesc, { color: theme.subtext }]}>
                Indique los motivos o correcciones necesarias que debe realizar el usuario:
              </Text>

              <TextInput
                style={[styles.inputArea, { backgroundColor: theme.glassInput, color: theme.text, borderColor: theme.glassBorder }]}
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Ej. Falta especificar el número CAS correcto..."
                multiline
                numberOfLines={4}
                placeholderTextColor={theme.subtext}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.btnModal, styles.btnCancel]}
                  onPress={() => setRejectModalVisible(false)}
                >
                  <Text style={styles.btnModalText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.btnModal, { backgroundColor: theme.brand }]}
                  onPress={handleRejectSubmit}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnModalText}>Enviar Retroalimentación</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContainer: {
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
  reqId: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionText: {
    fontSize: 13,
    marginBottom: 4,
  },
  targetText: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  requesterText: {
    fontSize: 13,
    marginBottom: 4,
  },
  approvedByText: {
    fontSize: 12.5,
    marginTop: 2,
    marginBottom: 4,
    fontWeight: '600',
  },
  feedbackBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  feedbackTitle: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 3,
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnApprove: {
    backgroundColor: '#059669',
  },
  btnReject: {
    backgroundColor: '#dc2626',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  btnModal: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancel: {
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
  },
  btnModalText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  }
});
