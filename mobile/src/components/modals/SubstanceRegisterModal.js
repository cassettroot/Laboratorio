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

export default function SubstanceRegisterModal({ visible, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [cas, setCas] = useState('');
  const [formula, setFormula] = useState('');
  const [purity, setPurity] = useState('');
  const [container, setContainer] = useState('');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('mL');
  const [notes, setNotes] = useState('');
  
  const [healthRisk, setHealthRisk] = useState('0');
  const [flammability, setFlammability] = useState('0');
  const [reactivity, setReactivity] = useState('0');

  const [stockUnits, setStockUnits] = useState('1');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setCas('');
    setFormula('');
    setPurity('');
    setContainer('');
    setLocation('');
    setAmount('');
    setUnit('g');
    setStockUnits('1');
    setNotes('');
    setHealthRisk('0');
    setFlammability('0');
    setReactivity('0');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa el nombre de la sustancia.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        chemical_formula: formula.trim(),
        cas_number: cas.trim(),
        concentration: purity.trim(),
        container_content: container.trim() || `${stockUnits || '1'} envase(s) de ${amount || '1'} ${unit || 'g'}`,
        location: location.trim(),
        quantity: parseFloat(amount) || 1.0,
        unit: unit.trim() || 'g',
        stock_units: parseInt(stockUnits, 10) || 1,
        observations: notes.trim(),
        risks_warnings: `Salud: ${healthRisk || 0}, Inflamabilidad: ${flammability || 0}, Reactividad: ${reactivity || 0}`,
      };

      const res = await apiService.createSubstance(payload);
      if (res.status === 'success') {
        Alert.alert('Éxito', '🧪 Sustancia química registrada correctamente.');
        resetForm();
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', res.message || 'No se pudo registrar la sustancia.');
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
              <Text style={styles.headerIcon}>🧪</Text>
              <View>
                <Text style={styles.title}>Registrar Sustancia Química</Text>
                <Text style={styles.subtitle}>Laboratorio de Química</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form ScrollView */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Información General</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre del Reactivo / Sustancia *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Ácido Clorhídrico"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Fórmula Química</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. HCl"
                  placeholderTextColor="#94a3b8"
                  value={formula}
                  onChangeText={setFormula}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>No. CAS</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 7647-01-0"
                  placeholderTextColor="#94a3b8"
                  value={cas}
                  onChangeText={setCas}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Pureza / Conc.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 37%"
                  placeholderTextColor="#94a3b8"
                  value={purity}
                  onChangeText={setPurity}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Envase / Empaque</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Frasco de Ámbar"
                  placeholderTextColor="#94a3b8"
                  value={container}
                  onChangeText={setContainer}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Ubicación y Existencias</Text>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.label}>Cantidad Inicial</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1000"
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Unidad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="mL / g"
                  placeholderTextColor="#94a3b8"
                  value={unit}
                  onChangeText={setUnit}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Ubicación / Estante</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Armario A - Estante 2"
                placeholderTextColor="#94a3b8"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <Text style={styles.sectionTitle}>Peligrosidad NFPA 704</Text>
            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={[styles.label, { color: '#ef4444' }]}>Salud (0-4)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  maxLength={1}
                  value={healthRisk}
                  onChangeText={setHealthRisk}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 6 }]}>
                <Text style={[styles.label, { color: '#f97316' }]}>Inflamabilidad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  maxLength={1}
                  value={flammability}
                  onChangeText={setFlammability}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: '#eab308' }]}>Reactividad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  maxLength={1}
                  value={reactivity}
                  onChangeText={setReactivity}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Observaciones / Notas</Text>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                multiline
                placeholder="Especificaciones o cuidados especiales..."
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
                <Text style={styles.submitBtnText}>Guardar Sustancia</Text>
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
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1e293b',
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
    color: '#0d9488',
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
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#0d9488',
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
