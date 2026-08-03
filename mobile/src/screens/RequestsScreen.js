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
import { apiService } from '../api/services';

export default function RequestsScreen() {
  const { role } = useContext(AuthContext);
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

    let statusColor = '#94a3b8';
    if (isPending) statusColor = '#f59e0b';
    if (isApproved) statusColor = '#10b981';
    if (isCorrection) statusColor = '#ef4444';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.reqId}>Solicitud #{item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.actionText}>
          Acción: <Text style={{fontWeight: 'bold', color: '#ffffff'}}>{item.action} ({item.type})</Text>
        </Text>
        <Text style={styles.targetText}>Elemento: {item.target_name || 'Nuevo registro'}</Text>
        <Text style={styles.requesterText}>Solicitante: {item.requester_username}</Text>

        {item.feedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackTitle}>Retroalimentación:</Text>
            <Text style={styles.feedbackText}>{item.feedback}</Text>
          </View>
        ) : null}

        {role === 'admin' && isPending ? (
          <View style={styles.adminActions}>
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
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} tintColor="#0284c7" />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay solicitudes de cambio registradas.</Text>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Solicitar Corrección</Text>
            <Text style={styles.modalDesc}>
              Indique los motivos o correcciones necesarias que debe realizar el usuario:
            </Text>

            <TextInput
              style={styles.inputArea}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Ej. Falta especificar el número CAS correcto..."
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.btnModal, styles.btnCancel]}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.btnModalText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btnModal, styles.btnSend]}
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
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingTop: 12,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  reqId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  actionText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  targetText: {
    fontSize: 13,
    color: '#38bdf8',
    marginBottom: 4,
  },
  requesterText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  feedbackBox: {
    backgroundColor: '#451a03',
    borderColor: '#b45309',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  feedbackTitle: {
    color: '#fde047',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  feedbackText: {
    color: '#fef08a',
    fontSize: 12,
  },
  adminActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
    fontWeight: '700',
    fontSize: 13,
  },
  emptyText: {
    color: '#94a3b8',
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
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  inputArea: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    textAlignVertical: 'top',
    height: 100,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
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
    backgroundColor: '#334155',
  },
  btnSend: {
    backgroundColor: '#0284c7',
  },
  btnModalText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
