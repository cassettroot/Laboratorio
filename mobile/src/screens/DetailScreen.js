import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { apiService } from '../api/services';
import apiClient, { DEFAULT_API_BASE, getImageUrl } from '../api/client';

export default function DetailScreen({ route, navigation }) {
  const { role, user, serverUrl } = useContext(AuthContext);
  const { type, item: initialItem } = route.params || {};

  const [item, setItem] = useState(initialItem);

  const getImageUri = (imagePath) => {
    return getImageUrl(imagePath, serverUrl);
  };
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campos del Formulario de Edición
  const [editName, setEditName] = useState('');
  const [editFormula, setEditFormula] = useState('');
  const [editCas, setEditCas] = useState('');
  const [editPhysicalState, setEditPhysicalState] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editExpiration, setEditExpiration] = useState('');
  const [editRisks, setEditRisks] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState(null);

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No se proporcionó información del elemento.</Text>
      </View>
    );
  }

  const openEditModal = () => {
    setEditName(item.name || '');
    setEditFormula(item.chemical_formula || '');
    setEditCas(item.cas_number || '');
    setEditPhysicalState(item.physical_state || 'Líquido');
    setEditQuantity(item.quantity ? item.quantity.toString() : '1.0');
    setEditUnit(item.unit || 'g');
    setEditLocation(item.location || '');
    setEditResponsible(item.responsible || user || '');
    setEditExpiration(item.expiration_date || '');
    setEditRisks(item.risks_warnings || '');
    setEditObservations(item.observations || '');
    setEditPhotoUri(null);
    setEditModalVisible(true);
  };

  const pickEditPhotoSquare = async (fromCamera = false) => {
    try {
      const permRes = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permRes.granted) {
        Alert.alert('Permiso Requerido', 'Se necesitan permisos para acceder a la cámara o galería.');
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // CORTE CUADRADO 1:1
        quality: 0.8,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + e.message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Campo Obligatorio', 'El nombre de la sustancia es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      let serverImagePath = item.image_path || '';

      if (editPhotoUri) {
        const filename = editPhotoUri.split('/').pop() || 'photo.jpg';
        const formData = new FormData();
        formData.append('photo', {
          uri: editPhotoUri,
          name: filename,
          type: 'image/jpeg'
        });

        const uploadRes = await apiService.uploadPhoto(formData);
        if (uploadRes.status === 'success') {
          serverImagePath = uploadRes.image_path;
        }
      }

      const payload = {
        name: editName.trim(),
        chemical_formula: editFormula.trim(),
        cas_number: editCas.trim(),
        physical_state: editPhysicalState,
        quantity: parseFloat(editQuantity) || 1.0,
        unit: editUnit,
        location: editLocation.trim(),
        responsible: editResponsible.trim(),
        expiration_date: editExpiration.trim(),
        risks_warnings: editRisks.trim(),
        observations: editObservations.trim(),
        image_path: serverImagePath
      };

      let res;
      if (type === 'substance') {
        res = await apiService.updateSubstance(item.id, payload);
      } else {
        res = { status: 'success', data: { ...item, ...payload } };
      }

      if (res.status === 'success') {
        Alert.alert('✅ Cambios Guardados', 'Los datos del compuesto han sido actualizados en el inventario.');
        setItem(res.data || { ...item, ...payload });
        setEditModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'No se pudo guardar la edición.');
      }
    } catch (err) {
      Alert.alert('Error al guardar', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '🗑️ Eliminar Registro',
      `¿Está seguro de que desea eliminar "${item.name}" del inventario? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'substance') {
                await apiService.deleteSubstance(item.id);
              }
              Alert.alert('Éxito', 'Registro eliminado del inventario.');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar el registro: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const photoUri = getImageUri(item.image_path);
  const pdfUri = getImageUri(item.pdf_path || item.external_links);

  const openPdfLink = () => {
    if (pdfUri) {
      Linking.openURL(pdfUri).catch(err => {
        console.warn("No se pudo abrir el PDF/Enlace:", err);
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Imagen Destacada de la Sustancia o Material */}
      {photoUri ? (
        <View style={styles.imageHeaderContainer}>
          <Image source={{ uri: photoUri }} style={styles.headerImage} resizeMode="cover" />
        </View>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>{item.name}</Text>
        
        {item.chemical_formula ? (
          <Text style={styles.formula}>🧪 Fórmula: {item.chemical_formula}</Text>
        ) : null}

        <View style={styles.badgeRow}>
          <View style={styles.badgePrimary}>
            <Text style={styles.badgePrimaryText}>📦 {item.quantity} {item.unit || 'piezas'}</Text>
          </View>
          {item.cas_number ? (
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>CAS: {item.cas_number}</Text>
            </View>
          ) : null}
          {item.stock_units && item.stock_units > 1 ? (
            <View style={styles.badgeUnits}>
              <Text style={styles.badgeUnitsText}>{item.stock_units} Envases</Text>
            </View>
          ) : null}
        </View>

        {/* Grupos Químicos o Categorías */}
        {item.substance_group ? (
          <View style={styles.groupBadgesContainer}>
            {item.substance_group.split(/[,/;|]/).map(g => g.trim()).filter(Boolean).map((group, idx) => (
              <View key={idx} style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{group}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Ubicación e Inventario */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Ubicación e Inventario</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Ubicación Física:</Text>
          <Text style={styles.value}>{item.location || 'No asignada'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Responsable Custodia:</Text>
          <Text style={styles.value}>{item.responsible || 'No asignado'}</Text>
        </View>
        {item.container_content ? (
          <View style={styles.row}>
            <Text style={styles.label}>Contenido Envase:</Text>
            <Text style={styles.value}>{item.container_content}</Text>
          </View>
        ) : null}
        {item.entry_date ? (
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de Entrada:</Text>
            <Text style={styles.value}>{item.entry_date}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.label}>Fecha de Caducidad:</Text>
          <Text style={[
            styles.value, 
            (item.expiration_date === 'Sin caducidad' || item.expiration_date === 'No aplica') ? { color: '#38bdf8' } : {}
          ]}>
            {item.expiration_date || 'No especificada'}
          </Text>
        </View>
      </View>

      {/* Secciones específicas de sustancias químicas */}
      {type === 'substance' || item.physical_state ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚗️ Propiedades Físicas y Químicas</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Estado Físico:</Text>
              <Text style={styles.value}>{item.physical_state || 'N/A'}</Text>
            </View>
            {item.composition ? (
              <View style={styles.row}>
                <Text style={styles.label}>Composición / Puntuación:</Text>
                <Text style={styles.value}>{item.composition}</Text>
              </View>
            ) : null}
            {item.concentration ? (
              <View style={styles.row}>
                <Text style={styles.label}>Concentración:</Text>
                <Text style={styles.value}>{item.concentration}</Text>
              </View>
            ) : null}
            {item.color ? (
              <View style={styles.row}>
                <Text style={styles.label}>Color:</Text>
                <Text style={styles.value}>{item.color}</Text>
              </View>
            ) : null}
            {item.odor ? (
              <View style={styles.row}>
                <Text style={styles.label}>Olor:</Text>
                <Text style={styles.value}>{item.odor}</Text>
              </View>
            ) : null}
          </View>

          {item.risks_warnings ? (
            <View style={[styles.section, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
              <Text style={[styles.sectionTitle, { color: '#f87171' }]}>⚠️ Riesgos y Advertencias (SGA)</Text>
              <Text style={styles.descText}>{item.risks_warnings}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {item.observations ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Observaciones</Text>
          <Text style={styles.descText}>{item.observations}</Text>
        </View>
      ) : null}

      {/* Botón para Hoja de Datos de Seguridad (PDF / Enlace) */}
      {pdfUri ? (
        <TouchableOpacity style={styles.pdfButton} onPress={openPdfLink}>
          <Text style={styles.pdfButtonText}>📄 Ver Hoja de Datos de Seguridad (HDS / FDS)</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  imageHeaderContainer: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  formula: {
    fontSize: 15,
    color: '#38bdf8',
    marginBottom: 12,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badgePrimary: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgePrimaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  badgeSecondary: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeSecondaryText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 13,
  },
  badgeUnits: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeUnitsText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  groupBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  groupBadge: {
    backgroundColor: '#0f172a',
    borderColor: '#38bdf8',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  groupBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  label: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  value: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  descText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  pdfButton: {
    backgroundColor: '#0284c7',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  pdfButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  editButton: {
    backgroundColor: '#0284c7',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteButtonText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    fontSize: 20,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateSelector: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  stateOption: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateOptionActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  stateOptionText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  stateOptionTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  photoPickerRow: {
    marginTop: 6,
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  photoBtnOutline: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoBtnOutlineText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  squarePreviewContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38bdf8',
  },
  squarePreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
});
