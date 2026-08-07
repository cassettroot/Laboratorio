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

export default function ChemicalMaterialRegisterModal({ visible, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cristalería');
  const [capacity, setCapacity] = useState('');
  const [material, setMaterial] = useState('');
  const [location, setLocation] = useState('');
  const [inventoryNumber, setInventoryNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [noSep, setNoSep] = useState('');
  const [stock, setStock] = useState('1');
  const [itemStatus, setItemStatus] = useState('Bueno');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setCategory('Cristalería');
    setCapacity('');
    setMaterial('');
    setLocation('');
    setInventoryNumber('');
    setSerialNumber('');
    setNoSep('');
    setStock('1');
    setItemStatus('Bueno');
    setNotes('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa el nombre del material químico.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        capacity: capacity.trim(),
        material: material.trim(),
        location: location.trim(),
        inventory_number: inventoryNumber.trim(),
        serial_number: serialNumber.trim(),
        no_sep: noSep.trim(),
        quantity: parseFloat(stock) || 1,
        status: itemStatus.trim(),
        observations: notes.trim(),
      };

      const res = await apiService.createChemicalMaterial(payload);
      if (res.status === 'success') {
        Alert.alert('Éxito', '💧 Material químico registrado correctamente.');
        resetForm();
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', res.message || 'No se pudo registrar el material químico.');
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
              <Text style={styles.headerIcon}>💧</Text>
              <View>
                <Text style={styles.title}>Registrar Material Químico</Text>
                <Text style={styles.subtitle}>Cristalería, Porcelana, Plásticos y Utensilios</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form ScrollView */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Datos del Material</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre del Material *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Matraz Erlenmeyer 250mL"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Categoría / Clasificación</Text>
              <View style={styles.chipsRow}>
                {['Cristalería', 'Porcelana', 'Plástico', 'Metal', 'Otro'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Capacidad / Volumen</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 250 mL"
                  placeholderTextColor="#94a3b8"
                  value={capacity}
                  onChangeText={setCapacity}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Composición / Material</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Vidrio Borosilicato"
                  placeholderTextColor="#94a3b8"
                  value={material}
                  onChangeText={setMaterial}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Control y Ubicación</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>No. Inventario</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. 115130001I51101000941309EUKVJ"
                placeholderTextColor="#94a3b8"
                value={inventoryNumber}
                onChangeText={setInventoryNumber}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>No. Serie</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 1P1822369599"
                  placeholderTextColor="#94a3b8"
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>No. SEP</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 12900397"
                  placeholderTextColor="#94a3b8"
                  value={noSep}
                  onChangeText={setNoSep}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Stock / Cantidad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  value={stock}
                  onChangeText={setStock}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Ubicación</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Gabinete 3"
                  placeholderTextColor="#94a3b8"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Estado Físico del Material</Text>
              <View style={styles.chipsRow}>
                {['Excelente', 'Bueno', 'Regular', 'Desgastado'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, itemStatus === st && styles.chipActive]}
                    onPress={() => setItemStatus(st)}
                  >
                    <Text style={[styles.chipText, itemStatus === st && styles.chipTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Observaciones</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Detalles sobre graduación, marcas o estado..."
                placeholderTextColor="#94a3b8"
                value={notes}
                onChangeText={setNotes}
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
                <Text style={styles.submitBtnText}>Guardar Material Químico</Text>
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
    backgroundColor: '#0369a1',
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
    color: '#e0f2fe',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#075985',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#e0f2fe',
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
    color: '#0284c7',
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
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
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
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0284c7',
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
