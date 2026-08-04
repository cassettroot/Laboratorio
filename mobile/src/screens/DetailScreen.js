import React, { useState, useContext, useEffect } from 'react';
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

  // Estados del Modal de Edición de Compuesto
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Campos del Formulario de Edición Completo
  const [editName, setEditName] = useState('');
  const [editFormula, setEditFormula] = useState('');
  const [editCas, setEditCas] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editContainerContent, setEditContainerContent] = useState('');
  const [editPhysicalState, setEditPhysicalState] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editStockUnits, setEditStockUnits] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editResponsible, setEditResponsible] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editExpiration, setEditExpiration] = useState('');
  const [editRisks, setEditRisks] = useState('');
  const [editExternalLinks, setEditExternalLinks] = useState('');
  const [editObservations, setEditObservations] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState(null);

  // Estado del Modal de Solicitud de Préstamo
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [loanQuantity, setLoanQuantity] = useState('1');
  const [loanNotes, setLoanNotes] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Estado del Modal Selector de Estante
  const [shelfPickerVisible, setShelfPickerVisible] = useState(false);

  const fetchDetail = async () => {
    if (!item || !item.id) return;
    try {
      const endpoint = (type === 'chemical-materials' || type === 'chemical_materials') ? `/api/chemical-materials/${item.id}` : ((type === 'didactic-materials' || type === 'didactic_materials') ? `/api/didactic-materials/${item.id}` : `/api/substances/${item.id}`);
      const res = await apiClient.get(endpoint);
      if (res.data && res.data.status === 'success') {
        setItem(res.data.data);
      }
    } catch (e) {
      console.warn("Error re-cargando detalle:", e);
    }
  };

  const handleAssignLocation = async (locationStr) => {
    try {
      const endpoint = (type === 'chemical-materials' || type === 'chemical_materials') ? `/api/chemical-materials/${item.id}` : ((type === 'didactic-materials' || type === 'didactic_materials') ? `/api/didactic-materials/${item.id}` : `/api/substances/${item.id}`);
      const res = await apiClient.put(endpoint, { location: locationStr });
      if (res.data && res.data.status === 'success') {
        Alert.alert('✅ Ubicación Actualizada', `Se registró la ubicación en: "${locationStr}"`);
        setShelfPickerVisible(false);
        setItem(prev => ({ ...prev, location: locationStr }));
      } else {
        Alert.alert('Error', res.data?.message || 'No se pudo actualizar la ubicación.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error actualizando ubicación: ' + e.message);
    }
  };

  const openEditModal = () => {
    setEditName(item.name || '');
    setEditFormula(item.chemical_formula || '');
    setEditCas(item.cas_number || '');
    setEditGroup(item.substance_group || '');
    setEditContainerContent(item.container_content || '');
    setEditPhysicalState(item.physical_state || 'Líquido');
    setEditQuantity(item.quantity ? item.quantity.toString() : '1.0');
    setEditUnit(item.unit || 'g');
    setEditStockUnits(item.stock_units ? item.stock_units.toString() : '1');
    setEditLocation(item.location || '');
    setEditResponsible(item.responsible || user || '');
    setEditEntryDate(item.entry_date || '');
    setEditExpiration(item.expiration_date || '');
    setEditRisks(item.risks_warnings || '');
    setEditExternalLinks(item.external_links || '');
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
        aspect: [1, 1],
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
      Alert.alert('Campo Obligatorio', 'El nombre del elemento es obligatorio.');
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
        substance_group: editGroup.trim(),
        container_content: editContainerContent.trim(),
        physical_state: editPhysicalState,
        quantity: parseFloat(editQuantity) || 1.0,
        unit: editUnit.trim() || 'g',
        stock_units: parseInt(editStockUnits, 10) || 1,
        location: editLocation.trim(),
        responsible: editResponsible.trim(),
        entry_date: editEntryDate.trim(),
        expiration_date: editExpiration.trim(),
        risks_warnings: editRisks.trim(),
        external_links: editExternalLinks.trim(),
        observations: editObservations.trim(),
        image_path: serverImagePath
      };

      let res;
      if (type === 'substance' || type === 'substances') {
        res = await apiService.updateSubstance(item.id, payload);
      } else {
        const endpoint = (type === 'chemical-materials' || type === 'chemical_materials') ? `/api/chemical-materials/${item.id}` : `/api/didactic-materials/${item.id}`;
        const apiRes = await apiClient.put(endpoint, payload);
        res = apiRes.data;
      }

      if (res && res.status === 'success') {
        Alert.alert('✅ Cambios Guardados', 'Los datos han sido actualizados exitosamente en el inventario.');
        setItem(res.data || { ...item, ...payload });
        setEditModalVisible(false);
      } else {
        Alert.alert('Error', res?.message || 'No se pudo guardar la edición.');
      }
    } catch (err) {
      Alert.alert('Error al guardar', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPresentationPhoto = async (fromCamera = false) => {
    try {
      const permRes = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permRes.granted) {
        Alert.alert('Permiso Requerido', 'Se necesitan permisos para acceder a la cámara o galería.');
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const localUri = result.assets[0].uri;
        const defaultLabel = item.container_content ? `Presentación ${item.container_content}` : 'Frasco / Presentación';

        setSubmitting(true);
        const filename = localUri.split('/').pop() || 'pres.jpg';
        const formData = new FormData();
        formData.append('photo', { uri: localUri, name: filename, type: 'image/jpeg' });

        const uploadRes = await apiService.uploadPhoto(formData);
        if (uploadRes.status === 'success') {
          const addRes = await apiClient.post(`/api/substances/${item.id}/presentation-images`, {
            image_path: uploadRes.image_path,
            label: defaultLabel
          });
          if (addRes.data && addRes.data.status === 'success') {
            Alert.alert('✅ Foto Agregada', 'Se añadió la imagen de presentación.');
            setItem(addRes.data.data);
          }
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto de presentación: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePresentationPhoto = (imgIdx) => {
    Alert.alert(
      '🗑️ Eliminar Foto de Presentación',
      '¿Desea eliminar esta imagen de presentación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/api/substances/${item.id}/presentation-images/${imgIdx}`);
              if (res.data && res.data.status === 'success') {
                Alert.alert('✅ Eliminada', 'La foto de presentación ha sido eliminada.');
                setItem(res.data.data);
              }
            } catch (e) {
              Alert.alert('Error', 'No se pudo eliminar la foto: ' + e.message);
            }
          }
        }
      ]
    );
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
              } else {
                const endpoint = type === 'chemical-materials' ? `/api/chemical-materials/${item.id}` : `/api/didactic-materials/${item.id}`;
                await apiClient.delete(endpoint);
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

  const openLoanModal = async () => {
    setLoanQuantity('1');
    setLoanNotes('');
    setLoanModalVisible(true);
  };

  const handleSubstanceLoanSubmit = async () => {
    const qty = parseInt(loanQuantity, 10);
    const availableUnits = (item.stock_units !== null && item.stock_units !== undefined && item.stock_units > 0) ? item.stock_units : Math.max(1, Math.floor(item.quantity || 1));
    
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Cantidad Inválida', 'Por favor ingrese un número entero de unidades mayor a 0.');
      return;
    }

    if (qty > availableUnits) {
      Alert.alert('Stock Insuficiente', `La cantidad solicitada (${qty} unidades) excede el stock disponible (${availableUnits} unidades).`);
      return;
    }

    setSubmittingLoan(true);
    try {
      const borrowerName = user || 'Responsable';

      const payload = {
        borrower_name: borrowerName,
        borrower_user_id: 0,
        borrower_type: 'Responsable',
        items_list: [
          {
            id: item.id,
            name: item.name,
            type: 'substance',
            quantity: qty,
            unit: item.unit || 'g',
            location: item.location || '',
            chemical_formula: item.chemical_formula || ''
          }
        ],
        notes: loanNotes.trim()
      };

      const res = await apiService.createLoan(payload);
      if (res.status === 'success') {
        Alert.alert(
          '✅ Préstamo Solicitado Exitosamente',
          'La solicitud de préstamo ha sido guardada y se notificó a los administradores.'
        );
        setLoanModalVisible(false);
      } else {
        Alert.alert('Error', res.message || 'No se pudo guardar la solicitud.');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo enviar el préstamo: ' + err.message);
    } finally {
      setSubmittingLoan(false);
    }
  };

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No se proporcionó información del elemento.</Text>
      </View>
    );
  }

  const photoUri = getImageUri(item.image_path);
  const pdfUri = getImageUri(item.pdf_path || item.external_links);

  const openPdfLink = () => {
    if (pdfUri) {
      Linking.openURL(pdfUri).catch(err => {
        console.warn("No se pudo abrir el PDF/Enlace:", err);
      });
    }
  };

  const isAdminOrResp = (role === 'admin' || role === 'responsable');

  let presentationImagesList = [];
  if (item && item.presentation_images) {
    try {
      presentationImagesList = typeof item.presentation_images === 'string' ? JSON.parse(item.presentation_images) : item.presentation_images;
      if (!Array.isArray(presentationImagesList)) presentationImagesList = [];
    } catch(e) {
      presentationImagesList = [];
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Imagen Destacada de la Sustancia o Material */}
      {photoUri ? (
        <View style={styles.imageHeaderContainer}>
          <Image source={{ uri: photoUri }} style={styles.headerImage} resizeMode="cover" />
        </View>
      ) : null}

      {/* Galería de Fotos por Presentación / Envase */}
      {(type === 'substance' || type === 'substances') ? (
        <View style={styles.presentationSectionCard}>
          <View style={styles.presentationHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.presentationSectionTitle}>
                📷 Presentaciones y Envases ({presentationImagesList.length})
              </Text>
              <Text style={styles.presentationSectionSubtitle}>
                {presentationImagesList.length > 0
                  ? `${presentationImagesList.length} foto(s) de presentaciones registradas`
                  : 'Agrega fotos de frascos o envases con distintas presentaciones'}
              </Text>
            </View>
          </View>

          {/* BOTONES DE ACCIÓN PARA AGREGAR FOTO */}
          {isAdminOrResp ? (
            <View style={styles.addPresentationBtnRow}>
              <TouchableOpacity
                style={styles.addPresCameraBtn}
                onPress={() => handleAddPresentationPhoto(true)}
              >
                <Text style={styles.addPresBtnText}>📷 Tomar Foto de Presentación</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addPresGalleryBtn}
                onPress={() => handleAddPresentationPhoto(false)}
              >
                <Text style={styles.addPresBtnText}>🖼️ Galería</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* CARROUSEL DE FOTOS HORIZONTAL */}
          {presentationImagesList.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingTop: 10 }}>
              {presentationImagesList.map((pImg, idx) => {
                const pUri = getImageUri(pImg.image_path);
                return pUri ? (
                  <View key={idx} style={styles.presentationCardItem}>
                    <Image source={{ uri: pUri }} style={styles.presentationImageThumb} resizeMode="cover" />
                    {isAdminOrResp ? (
                      <TouchableOpacity
                        style={styles.deletePresBadge}
                        onPress={() => handleDeletePresentationPhoto(idx)}
                      >
                        <Text style={styles.deletePresBadgeText}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                    <Text numberOfLines={1} style={styles.presentationLabelText}>
                      {pImg.label || `Presentación ${idx + 1}`}
                    </Text>
                  </View>
                ) : null;
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {/* HEADER DE TÍTULO Y BADGES */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace' }}>ID: LAB-{item.id}</Text>
          </View>

          {/* Botones de Administración (Editar / Eliminar) */}
          {isAdminOrResp ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={styles.editHeaderBtn} onPress={openEditModal}>
                <Text style={styles.editHeaderBtnText}>✏️ Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteHeaderBtn} onPress={handleDelete}>
                <Text style={styles.deleteHeaderBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        
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
              <Text style={styles.badgeUnitsText}>{item.stock_units} Unidades</Text>
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

      {/* SECCIÓN 1: UBICACIÓN E INVENTARIO */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>📍 Ubicación e Inventario</Text>
          {isAdminOrResp ? (
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}
              onPress={() => setShelfPickerVisible(true)}
            >
              <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold' }}>🗺️ Asignar en Estante</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Ubicación Física:</Text>
          <Text style={[styles.value, { color: '#fbbf24', fontWeight: 'bold' }]}>{item.location || 'No asignada'}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Responsable Custodia:</Text>
          <Text style={styles.value}>{item.responsible || 'No asignado'}</Text>
        </View>

        {item.container_content ? (
          <View style={styles.row}>
            <Text style={styles.label}>Contenido por Envase:</Text>
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

      {/* SECCIÓN 2: PROPIEDADES FÍSICAS Y QUÍMICAS */}
      {(type === 'substance' || item.physical_state) ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚗️ Propiedades Físicas y Químicas</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Estado Físico:</Text>
              <Text style={[styles.value, { color: '#10b981', fontWeight: 'bold' }]}>{item.physical_state || 'N/A'}</Text>
            </View>

            {item.composition ? (
              <View style={styles.row}>
                <Text style={styles.label}>Composición / Pureza:</Text>
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

          {/* RIESGOS SGA / ADVERTENCIAS */}
          {item.risks_warnings ? (
            <View style={[styles.section, { borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
              <Text style={[styles.sectionTitle, { color: '#f87171' }]}>⚠️ Riesgos y Advertencias (SGA)</Text>
              <Text style={styles.descText}>{item.risks_warnings}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* SECCIÓN 3: OBSERVACIONES */}
      {item.observations ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Observaciones</Text>
          <Text style={styles.descText}>{item.observations}</Text>
        </View>
      ) : null}

      {/* BOTÓN SOLICITAR PRÉSTAMO (Solo Docentes / Admin) */}
      {(type === 'substance' && isAdminOrResp) ? (
        <TouchableOpacity style={styles.loanRequestBtn} onPress={openLoanModal}>
          <Text style={styles.loanRequestBtnText}>🤝 Solicitar Préstamo de Sustancia</Text>
        </TouchableOpacity>
      ) : null}

      {/* BOTÓN VER FICHA HDS / PDF */}
      {pdfUri ? (
        <TouchableOpacity style={styles.pdfButton} onPress={openPdfLink}>
          <Text style={styles.pdfButtonText}>📄 Ver Hoja de Datos de Seguridad (HDS / FDS)</Text>
        </TouchableOpacity>
      ) : null}

      {/* MODAL COMPLETO DE EDICIÓN DEL ELEMENTO */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Elemento</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }}>
              <Text style={styles.inputLabel}>Nombre del Compuesto *</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} />

              <Text style={styles.inputLabel}>Fórmula Química</Text>
              <TextInput style={styles.input} value={editFormula} onChangeText={setEditFormula} />

              <Text style={styles.inputLabel}>Número CAS</Text>
              <TextInput style={styles.input} value={editCas} onChangeText={setEditCas} />

              <Text style={styles.inputLabel}>Grupo SGA / Almacenamiento</Text>
              <TextInput style={styles.input} value={editGroup} onChangeText={setEditGroup} placeholder="Ej. Grupo 3 Inflamables, Grupo 8 Corrosivos" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Contenido / Presentación del Envase</Text>
              <TextInput style={styles.input} value={editContainerContent} onChangeText={setEditContainerContent} placeholder="Ej. Frasco 500 mL, Garrafa 5 L" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Estado Físico</Text>
              <TextInput style={styles.input} value={editPhysicalState} onChangeText={setEditPhysicalState} placeholder="Líquido, Sólido..." placeholderTextColor="#64748b" />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Cantidad Total *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={editQuantity} onChangeText={setEditQuantity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unidad *</Text>
                  <TextInput style={styles.input} value={editUnit} onChangeText={setEditUnit} placeholder="g, mL, kg, L" placeholderTextColor="#64748b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unidades Stock</Text>
                  <TextInput style={styles.input} keyboardType="number-pad" value={editStockUnits} onChangeText={setEditStockUnits} placeholder="1" placeholderTextColor="#64748b" />
                </View>
              </View>

              <Text style={styles.inputLabel}>Ubicación Física</Text>
              <TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} />

              <Text style={styles.inputLabel}>Responsable de Custodia</Text>
              <TextInput style={styles.input} value={editResponsible} onChangeText={setEditResponsible} />

              <Text style={styles.inputLabel}>Fecha de Ingreso / Compra</Text>
              <TextInput style={styles.input} value={editEntryDate} onChangeText={setEditEntryDate} placeholder="AAAA-MM-DD" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Fecha de Caducidad</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={editExpiration}
                  onChangeText={setEditExpiration}
                  placeholder="AAAA-MM-DD o Sin caducidad"
                  placeholderTextColor="#64748b"
                />
                <TouchableOpacity
                  style={styles.noExpirationBtn}
                  onPress={() => setEditExpiration('Sin caducidad')}
                >
                  <Text style={styles.noExpirationBtnText}>✨ Sin Caducidad</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Riesgos y Advertencias SGA</Text>
              <TextInput style={styles.input} value={editRisks} onChangeText={setEditRisks} />

              <Text style={styles.inputLabel}>Enlace HDS / FDS (URL)</Text>
              <TextInput style={styles.input} value={editExternalLinks} onChangeText={setEditExternalLinks} placeholder="https://..." placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Observaciones</Text>
              <TextInput style={[styles.input, { height: 75, textAlignVertical: 'top' }]} multiline value={editObservations} onChangeText={setEditObservations} />

              {/* FOTO DEL COMPUESTO (CUADRADA 1:1) */}
              <Text style={styles.inputLabel}>Fotografía del Producto (Cuadrada 1:1)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1 }]} onPress={() => pickEditPhotoSquare(true)}>
                  <Text style={styles.photoPickerBtnText}>📷 Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => pickEditPhotoSquare(false)}>
                  <Text style={styles.photoPickerBtnText}>🖼️ Galería</Text>
                </TouchableOpacity>
              </View>

              {editPhotoUri ? (
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Image source={{ uri: editPhotoUri }} style={{ width: 120, height: 120, borderRadius: 12, borderWidth: 1, borderColor: '#10b981' }} />
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitLoanBtn, submitting && { opacity: 0.6 }]}
                disabled={submitting}
                onPress={handleSaveEdit}
              >
                {submitting ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.submitLoanBtnText}>💾 Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL SOLICITUD DE PRÉSTAMO */}
      <Modal
        visible={loanModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLoanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤝 Solicitar Préstamo de Sustancia</Text>
              <TouchableOpacity onPress={() => setLoanModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }}>
              <View style={styles.substanceSummaryBox}>
                <Text style={styles.substanceSummaryName}>{item.name}</Text>
                <Text style={styles.substanceSummaryStock}>
                  Stock Disponible: {(item.stock_units !== null && item.stock_units !== undefined && item.stock_units > 0) ? item.stock_units : Math.max(1, Math.floor(item.quantity || 1))} unidades
                </Text>
              </View>

              <View style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold' }}>
                  ⏳ La solicitud quedará en estado PENDIENTE DE APROBACIÓN POR ADMINISTRADOR.
                </Text>
              </View>

              <Text style={styles.inputLabel}>Unidades a Solicitar *</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={loanQuantity}
                onChangeText={setLoanQuantity}
              />

              <Text style={styles.inputLabel}>Responsable Solicitante *</Text>
              <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#10b981', fontSize: 14, fontWeight: 'bold' }}>👤 {user || 'Responsable'}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>(Sesión Iniciada)</Text>
              </View>

              <Text style={styles.inputLabel}>Motivo / Observaciones del Préstamo</Text>
              <TextInput
                style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                multiline
                placeholder="Ej. Práctica de laboratorio, investigación..."
                placeholderTextColor="#64748b"
                value={loanNotes}
                onChangeText={setLoanNotes}
              />

              <TouchableOpacity
                style={[styles.submitLoanBtn, submittingLoan && { opacity: 0.6 }]}
                disabled={submittingLoan}
                onPress={handleSubstanceLoanSubmit}
              >
                {submittingLoan ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.submitLoanBtnText}>Enviar Solicitud de Préstamo</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL MÓVIL DE SELECCIÓN DE ESTANTE */}
      <Modal
        visible={shelfPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShelfPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#f59e0b' }]}>🗺️ Estante Metálico Negro</Text>
              <TouchableOpacity onPress={() => setShelfPickerVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 10 }}>
                Selecciona la repisa donde se almacenará <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>{item.name}</Text>:
              </Text>

              <View style={{ gap: 8 }}>
                <TouchableOpacity style={{ backgroundColor: '#451a03', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#b45309' }} onPress={() => handleAssignLocation('Altillo - Cajas Horizontales')}>
                  <Text style={{ color: '#fde68a', fontWeight: 'bold', fontSize: 12 }}>📦 ALTILLO SUPERIOR (Cajas de Embalaje Largo)</Text>
                </TouchableOpacity>

                <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold', marginTop: 4 }}>ESTANTE IZQUIERDO (COLUMNA A - REACTIVOS SGA)</Text>
                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante A - Nivel 5 (Sólidos Inertes Grupo 9)')}>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>A5: Sólidos Inertes (Grupo 9)</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>Sales, Almidón, NaCl (Frascos Livianos)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante A - Nivel 4 (Peróxidos/Tóxicos Grupos 5/6)')}>
                  <Text style={{ color: '#facc15', fontSize: 12, fontWeight: 'bold' }}>A4: Comburentes y Tóxicos (Grupos 5 y 6)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante A - Nivel 3 (Líquidos Inflamables Grupo 3)')}>
                  <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold' }}>A3: Líquidos Inflamables (Grupo 3)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#451a03', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f59e0b' }} onPress={() => handleAssignLocation('Estante A - Nivel 2 (Corrosivos Ácidos/Bases Grupo 8)')}>
                  <Text style={{ color: '#f87171', fontSize: 12, fontWeight: 'bold' }}>A2: Corrosivos (Grupo 8 - Altura Cintura)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante A - Nivel 1 (Piso Estante / Cajas 2WAJ)')}>
                  <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 'bold' }}>A1: Cajas 2WAJ + Kit de Derrames</Text>
                </TouchableOpacity>

                <Text style={{ color: '#c084fc', fontSize: 11, fontWeight: 'bold', marginTop: 6 }}>ESTANTE DERECHO (COLUMNA B - REACTIVOS Y ORGÁNICOS)</Text>
                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante B - Nivel 5 (Indicadores y Colorantes)')}>
                  <Text style={{ color: '#c084fc', fontSize: 12, fontWeight: 'bold' }}>B5: Indicadores y Colorantes (Fenolftaleína, Azul Metileno)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante B - Nivel 4 (Metales y Sólidos Reactivos Grupo 4)')}>
                  <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold' }}>B4: Metales y Sólidos Reactivos (Magnesio, Carburo, Aluminio)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante B - Nivel 3 (Ácidos Orgánicos y Carbohidratos)')}>
                  <Text style={{ color: '#34d399', fontSize: 12, fontWeight: 'bold' }}>B3: Ácidos Orgánicos y Carbohidratos (Cítrico, Sacarosa)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#334155' }} onPress={() => handleAssignLocation('Estante B - Nivel 2 (Sales Inorgánicas N-Z Grupo 9)')}>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>B2: Sales Inorgánicas N-Z (Ferrocianuro, Sulfatos)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ backgroundColor: '#3b0764', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#a855f7' }} onPress={() => handleAssignLocation('Estante B - Nivel 1 (Soluciones Acuosas Gran Volumen)')}>
                  <Text style={{ color: '#e9d5ff', fontSize: 12, fontWeight: 'bold' }}>B1: Soluciones Acuosas (Agua Destilada, Jabón, Cobre)</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  header: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  formula: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '700',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badgePrimary: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  badgePrimaryText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeSecondary: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeSecondaryText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeUnits: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  badgeUnitsText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: 'bold',
  },
  groupBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  groupBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  groupBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  editHeaderBtn: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  editHeaderBtnText: {
    color: '#0f172a',
    fontWeight: 'bold',
    fontSize: 12,
  },
  deleteHeaderBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  deleteHeaderBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '700',
  },
  descText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  loanRequestBtn: {
    backgroundColor: '#d97706',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  loanRequestBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  pdfButton: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 16,
  },
  pdfButtonText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 13,
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
    color: '#f59e0b',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 20,
    fontWeight: 'bold',
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
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  submitLoanBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  submitLoanBtnText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15,
  },
  presentationSectionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  presentationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  presentationSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
  },
  presentationSectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  addPresentationBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6,
  },
  addPresCameraBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addPresGalleryBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addPresBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  presentationCardItem: {
    width: 110,
    alignItems: 'center',
    position: 'relative',
  },
  presentationImageThumb: {
    width: 110,
    height: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deletePresBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePresBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  presentationLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: 4,
    textAlign: 'center',
  },
  noExpirationBtn: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  noExpirationBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
