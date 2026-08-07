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
  Platform,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../../api/services';

export default function DidacticMaterialRegisterModal({ visible, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('Química');
  const [materialType, setMaterialType] = useState('Kit Didáctico');
  const [contents, setContents] = useState('');
  const [location, setLocation] = useState('');
  const [stock, setStock] = useState('1');
  const [condition, setCondition] = useState('Excelente');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setSubject('Química');
    setMaterialType('Kit Didáctico');
    setContents('');
    setLocation('');
    setStock('1');
    setCondition('Excelente');
    setResponsible('');
    setNotes('');
    setPhotoUri(null);
  };

  const pickPhotoFromCamera = async () => {
    try {
      const permRes = await ImagePicker.requestCameraPermissionsAsync();
      if (!permRes.granted) {
        Alert.alert('Permiso Requerido', 'Se requiere permiso para acceder a la cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo tomar la foto: ' + e.message);
    }
  };

  const pickPhotoFromGallery = async () => {
    try {
      const permRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permRes.granted) {
        Alert.alert('Permiso Requerido', 'Se requiere permiso para acceder a la galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la foto: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Campo Obligatorio', 'Por favor ingresa el nombre del material didáctico.');
      return;
    }

    setLoading(true);
    try {
      let serverImagePath = '';

      if (photoUri) {
        const filename = photoUri.split('/').pop() || 'didactic_photo.jpg';
        const formData = new FormData();
        formData.append('photo', {
          uri: photoUri,
          name: filename,
          type: 'image/jpeg',
        });
        const uploadRes = await apiService.uploadPhoto(formData);
        if (uploadRes && uploadRes.status === 'success') {
          serverImagePath = uploadRes.image_path;
        }
      }

      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        type: materialType.trim(),
        category: `${materialType.trim()} - ${subject.trim()}`.trim(),
        contents: contents.trim(),
        location: location.trim(),
        stock: parseInt(stock, 10) || 1,
        quantity: parseInt(stock, 10) || 1,
        condition: condition.trim(),
        status: condition.trim(),
        responsible: responsible.trim(),
        notes: notes.trim(),
        observations: notes.trim(),
        image_path: serverImagePath
      };

      const res = await apiService.createDidacticMaterial(payload);
      if (res.status === 'success') {
        Alert.alert('Éxito', '🎓 Material didáctico registrado correctamente con su fotografía.');
        resetForm();
        onSuccess && onSuccess();
        onClose();
      } else {
        Alert.alert('Error', res.message || 'No se pudo registrar el material didáctico.');
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
              <Text style={styles.headerIcon}>🎓</Text>
              <View>
                <Text style={styles.title}>Registrar Material Didáctico</Text>
                <Text style={styles.subtitle}>Modelos, Maquetas, Kits y Sensores</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form ScrollView */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Datos del Material Didáctico</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nombre del Kit / Modelo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Kit de Geometría Molecular"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Asignatura / Área</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Química Orgánica"
                  placeholderTextColor="#94a3b8"
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tipo de Elemento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Modelo / Kit / Sensor"
                  placeholderTextColor="#94a3b8"
                  value={materialType}
                  onChangeText={setMaterialType}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contenido del Kit / Componentes</Text>
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ej. 50 esferas de carbono, 30 enlaces flexibles..."
                placeholderTextColor="#94a3b8"
                value={contents}
                onChangeText={setContents}
              />
            </View>

            <Text style={styles.sectionTitle}>Ubicación y Estado</Text>

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
                  placeholder="Ej. Estante B-4"
                  placeholderTextColor="#94a3b8"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Condición del Material</Text>
              <View style={styles.chipsRow}>
                {['Excelente', 'Bueno', 'Regular', 'Incompleto'].map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.chip, condition === cond && styles.chipActive]}
                    onPress={() => setCondition(cond)}
                  >
                    <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>{cond}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Responsable de Custodia</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Ing. Carlos Martínez"
                placeholderTextColor="#94a3b8"
                value={responsible}
                onChangeText={setResponsible}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Observaciones</Text>
              <TextInput
                style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
                multiline
                placeholder="Instrucciones o piezas faltantes..."
                placeholderTextColor="#94a3b8"
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            <Text style={styles.sectionTitle}>Fotografía del Material</Text>
            <View style={styles.fieldGroup}>
              {photoUri ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhotoFromCamera}>
                      <Text style={styles.changePhotoBtnText}>📷 Tomar Otra</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.changePhotoBtn} onPress={pickPhotoFromGallery}>
                      <Text style={styles.changePhotoBtnText}>🖼️ Galería</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                      <Text style={styles.removePhotoBtnText}>✕ Quitar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPickerBox}>
                  <Text style={styles.photoPickerHint}>
                    Captura una fotografía con la cámara de tu dispositivo o selecciona una de la galería.
                  </Text>
                  <View style={styles.photoButtonsRow}>
                    <TouchableOpacity style={styles.photoBtn} onPress={pickPhotoFromCamera}>
                      <Text style={styles.photoBtnIcon}>📷</Text>
                      <Text style={styles.photoBtnText}>Tomar Foto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.photoBtn, styles.galleryBtn]} onPress={pickPhotoFromGallery}>
                      <Text style={styles.photoBtnIcon}>🖼️</Text>
                      <Text style={styles.photoBtnText}>Galería</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
                <Text style={styles.submitBtnText}>Guardar Material Didáctico</Text>
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
    backgroundColor: '#6366f1',
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
    color: '#e0e7ff',
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
  },
  closeBtnText: {
    color: '#e0e7ff',
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
    color: '#4f46e5',
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
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
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
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4f46e5',
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
  photoPickerBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  photoPickerHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  galleryBtn: {
    backgroundColor: '#0284c7',
  },
  photoBtnIcon: {
    fontSize: 14,
  },
  photoBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  photoPreviewBox: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  photoPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  changePhotoBtn: {
    backgroundColor: '#475569',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePhotoBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  removePhotoBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removePhotoBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
