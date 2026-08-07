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

export default function RequestsScreen() {
  const { role } = useContext(AuthContext);
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
  }, []);

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
                Alert.alert('Éxito', 'La solicitud ha sido aprobada y los cambios se aplicaron.');
                fetchRequests();
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (e) {
              Alert.alert('Error', 'No se pudo procesar la aprobación.');
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
      Alert.alert('Atención', 'Ingrese un mensaje de retroalimentación.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiService.rejectRequest(selectedReq.id, feedback.trim());
      if (res.status === 'success') {
        setRejectModalVisible(false);
        setFeedback('');
        Alert.alert('Solicitud Devuelta', 'Se solicitó corrección al usuario.');
        fetchRequests();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar la corrección.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isPending = item.status === 'PENDIENTE';
    const isApproved = item.status === 'APROBADO';
    const isCorrection = item.status === 'CORRECCION';

    let badgeBg = 'rgba(56, 189, 248, 0.15)';
    let badgeBorder = 'rgba(56, 189, 248, 0.35)';
    let badgeText = '#38bdf8';

    if (isApproved) {
      badgeBg = 'rgba(16, 185, 129, 0.15)';
      badgeBorder = 'rgba(16, 185, 129, 0.35)';
      badgeText = '#34d399';
    } else if (isCorrection) {
      badgeBg = 'rgba(245, 158, 11, 0.15)';
      badgeBorder = 'rgba(245, 158, 11, 0.35)';
      badgeText = '#fbbf24';
    } else if (item.status === 'RECHAZADO') {
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeBorder = 'rgba(239, 68, 68, 0.35)';
      badgeText = '#f87171';
    }

    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
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
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackTitle}>💬 Retroalimentación:</Text>
            <Text style={styles.feedbackText}>{item.feedback}</Text>
          </View>
        ) : null}

        {role === 'admin' && isPending ? (
          <View style={[styles.adminActions, { borderTopColor: theme.cardBorder }]}>
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
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
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
              style={[styles.inputArea, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.cardBorder }]}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: 12,
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
    color: '#fef08a',
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
    borderRadius: 10,
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
    fontSize: 12.5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12.5,
    marginBottom: 12,
  },
  inputArea: {
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    height: 100,
    borderWidth: 1,
    marginBottom: 16,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btnModal: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnCancel: {
    backgroundColor: '#475569',
  },
  btnModalText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5,
  },
});
