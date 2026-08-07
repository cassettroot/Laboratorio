import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { apiService } from '../../api/services';

export default function EquipoRegisterModal({ visible, onClose, onSuccess }) {
  const [nombre, setNombre] = useState('');
  const [noInventario, setNoInventario] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serie, setSerie] = useState('');
  const [caracteristicas, setCaracteristicas] = useState('');
  const [estadoBien, setEstadoBien] = useState('Bueno');
  const [valor, setValor] = useState('');

  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setNombre('');
    setNoInventario('');
    setMarca('');
    setModelo('');
    setSerie('');
    setCaracteristicas('');
    setEstadoBien('Bueno');
    setValor('');
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa el nombre del bien o equipo.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        no_inventario: noInventario.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        serie: serie.trim(),
        caracteristicas_bien: caracteristicas.trim(),
        estado_bien: estadoBien.trim(),
        valor: parseFloat(valor) || 0.0,
      };

      const res = await apiService.createEquipo(payload);
      if (res.status === 'success') {
        Alert.alert('Éxito', '💻 Bien o equipo registrado correctamente.');
        resetForm();
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', res.message || 'No se pudo registrar el bien o equipo.');
      }
    } catch (err) {
      Alert.alert('Error de conexión', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.headerIcon}>💻</Text>
              <View>
                <Text style={styles.title}>Registrar Bien / Equipo</Text>
                <Text style={styles.subtitle}>Inventario de Oficina y Sistemas</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form ScrollView */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Identificación del Equipo</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre / Descripción del Bien *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Computadora de Escritorio Dell OptiPlex"
                placeholderTextColor="#94a3b8"
                value={nombre}
                onChangeText={setNombre}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Número de Inventario / Placa</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. ITMAII-SIS-2026-004"
                placeholderTextColor="#94a3b8"
                value={noInventario}
                onChangeText={setNoInventario}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Marca</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Dell / HP / Lenovo"
                  placeholderTextColor="#94a3b8"
                  value={marca}
                  onChangeText={setMarca}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Modelo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. OptiPlex 7090"
                  placeholderTextColor="#94a3b8"
                  value={modelo}
                  onChangeText={setModelo}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Número de Serie</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. SN-8839201"
                  placeholderTextColor="#94a3b8"
                  value={serie}
                  onChangeText={setSerie}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Valor Estimado ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="15000.00"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  value={valor}
                  onChangeText={setValor}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Estado y Características</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Estado del Bien</Text>
              <View style={styles.chipsRow}>
                {['Excelente', 'Bueno', 'Regular', 'Mantenimiento', 'Baja'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, estadoBien === st && styles.chipActive]}
                    onPress={() => setEstadoBien(st)}
                  >
                    <Text style={[styles.chipText, estadoBien === st && styles.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Características / Componentes</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ej. Core i7 11th Gen, 16GB RAM, SSD 512GB..."
                placeholderTextColor="#94a3b8"
                value={caracteristicas}
                onChangeText={setCaracteristicas}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Guardar bien / equipo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
});
