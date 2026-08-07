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
  const { type, id: paramId, item: initialItem } = route.params || {};

  const [item, setItem] = useState(initialItem || null);

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
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Estado del Modal de Solicitud de Préstamo
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [loanQuantity, setLoanQuantity] = useState('1');
  const [loanNotes, setLoanNotes] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Modal Selector de Fecha con Calendario Interactivo
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateTargetField, setDateTargetField] = useState('entry'); // 'entry' | 'expiration'
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [showMonthYearGrid, setShowMonthYearGrid] = useState(false);

  const openDatePicker = (targetField) => {
    setDateTargetField(targetField);
    const currentDateVal = targetField === 'entry' ? editEntryDate : editExpiration;
    if (currentDateVal && /^\d{4}-\d{2}(-\d{2})?$/.test(currentDateVal.trim())) {
      const parts = currentDateVal.trim().split('-');
      setPickerYear(parseInt(parts[0], 10) || new Date().getFullYear());
      setPickerMonth(parseInt(parts[1], 10) || (new Date().getMonth() + 1));
      if (parts[2]) {
        setPickerDay(parseInt(parts[2], 10) || 1);
      }
    } else {
      const now = new Date();
      setPickerYear(now.getFullYear());
      setPickerMonth(now.getMonth() + 1);
      setPickerDay(now.getDate());
    }
    setShowMonthYearGrid(false);
    setDateModalVisible(true);
  };

  const applySelectedDate = () => {
    const formattedMonth = pickerMonth < 10 ? `0${pickerMonth}` : `${pickerMonth}`;
    const formattedDay = pickerDay < 10 ? `0${pickerDay}` : `${pickerDay}`;
    const formattedDate = `${pickerYear}-${formattedMonth}-${formattedDay}`;

    if (dateTargetField === 'entry') {
      setEditEntryDate(formattedDate);
    } else {
      setEditExpiration(formattedDate);
    }
    setDateModalVisible(false);
  };

  const applyMonthYearDate = () => {
    const formattedMonth = pickerMonth < 10 ? `0${pickerMonth}` : `${pickerMonth}`;
    const formattedDate = `${pickerYear}-${formattedMonth}`;

    if (dateTargetField === 'entry') {
      setEditEntryDate(formattedDate);
    } else {
      setEditExpiration(formattedDate);
    }
    setDateModalVisible(false);
  };

  const fetchDetail = async () => {
    const targetId = initialItem?.id || paramId || item?.id;
    if (!targetId) return;
    try {
      const endpoint = (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material') 
        ? `/api/chemical-materials/${targetId}` 
        : ((type === 'didactic-materials' || type === 'didactic_materials' || type === 'did_material') 
            ? `/api/didactic-materials/${targetId}` 
            : `/api/substances/${targetId}`);
      const res = await apiClient.get(endpoint);
      if (res.data && res.data.status === 'success') {
        setItem(res.data.data);
      }
    } catch (e) {
      console.warn("Error cargando detalle:", e);
    }
  };

  useEffect(() => {
    if (initialItem) setItem(initialItem);
    fetchDetail();
  }, [paramId, initialItem]);

  const handleAssignLocation = async (locationStr) => {
    try {
      const endpoint = (type === 'chemical-materials' || type === 'chemical_materials') ? `/api/chemical-materials/${item.id}` : ((type === 'didactic-materials' || type === 'didactic_materials') ? `/api/didactic-materials/${item.id}` : `/api/substances/${item.id}`);
      const res = await apiClient.put(endpoint, { location: locationStr });
      if (res.data && res.data.status === 'success') {
        Alert.alert('✅ Ubicación Actualizada', `Se registró la ubicación en: "${locationStr}"`);
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
    setEditFormula(item.chemical_formula || item.subject || '');
    setEditCas(item.cas_number || '');
    setEditGroup(item.substance_group || item.category || item.type || '');
    setEditContainerContent(item.container_content || item.contents || '');
    setEditPhysicalState(item.physical_state || item.status || item.condition || 'Excelente');
    setEditQuantity(item.quantity ? item.quantity.toString() : (item.stock ? item.stock.toString() : '1'));
    setEditUnit(item.unit || '');
    setEditStockUnits(item.stock_units ? item.stock_units.toString() : (item.stock ? item.stock.toString() : '1'));
    setEditLocation(item.location || '');
    setEditResponsible(item.responsible || user || '');
    setEditEntryDate(item.entry_date || '');
    setEditExpiration(item.expiration_date || '');
    setEditRisks(item.risks_warnings || '');
    setEditExternalLinks(item.external_links || '');
    setEditObservations(item.observations || item.notes || '');
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
        if (uploadRes && uploadRes.status === 'success') {
          serverImagePath = uploadRes.image_path;
        }
      }

      let payload;
      let res;
      if (type === 'substance' || type === 'substances') {
        payload = {
          name: editName.trim(),
          chemical_formula: editFormula.trim(),
          cas_number: editCas.trim(),
          substance_group: editGroup.trim(),
          container_content: `${editStockUnits || '1'} envase(s) de ${editQuantity || '1'} ${editUnit || 'g'}`.trim(),
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
        res = await apiService.updateSubstance(item.id, payload);
      } else if (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material') {
        payload = {
          name: editName.trim(),
          category: editGroup.trim(),
          quantity: parseInt(editQuantity, 10) || 1,
          unit: editUnit.trim(),
          location: editLocation.trim(),
          status: editPhysicalState,
          responsible: editResponsible.trim(),
          observations: editObservations.trim(),
          image_path: serverImagePath
        };
        const apiRes = await apiClient.put(`/api/chemical-materials/${item.id}`, payload);
        res = apiRes.data;
      } else {
        payload = {
          name: editName.trim(),
          category: editGroup.trim(),
          type: editGroup.trim(),
          subject: editFormula.trim(),
          contents: editContainerContent.trim(),
          quantity: parseInt(editQuantity, 10) || 1,
          stock: parseInt(editQuantity, 10) || 1,
          location: editLocation.trim(),
          status: editPhysicalState,
          condition: editPhysicalState,
          responsible: editResponsible.trim(),
          observations: editObservations.trim(),
          notes: editObservations.trim(),
          image_path: serverImagePath
        };
        const apiRes = await apiClient.put(`/api/didactic-materials/${item.id}`, payload);
        res = apiRes.data;
      }

      if (res && res.status === 'success') {
        if (res.pending) {
          Alert.alert('⏳ Solicitud Enviada', res.message || 'La edición requiere aprobación de un administrador.');
          setEditModalVisible(false);
        } else {
          Alert.alert('✅ Cambios Guardados', 'Los datos han sido actualizados exitosamente en el inventario.');
          setItem(res.data || { ...item, ...payload });
          setEditModalVisible(false);
        }
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
        if (uploadRes && uploadRes.status === 'success') {
          const addRes = await apiClient.post(`/api/substances/${item.id}/presentation-images`, {
            image_path: uploadRes.image_path,
            label: defaultLabel
          });
          if (addRes.data && addRes.data.status === 'success') {
            Alert.alert('✅ Foto Agregada', 'Se añadió la imagen de presentación.');
            setItem(addRes.data.data);
          } else {
            Alert.alert('Error', addRes.data?.message || 'No se pudo vincular la foto a la sustancia.');
          }
        } else {
          Alert.alert('Error', uploadRes?.message || 'No se pudo subir el archivo de imagen.');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto de presentación: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const promptAddPresentationPhoto = () => {
    Alert.alert(
      '📷 Agregar Foto de Envase / Presentación',
      '¿Desde dónde deseas capturar o seleccionar la imagen?',
      [
        { text: '📷 Cámara', onPress: () => handleAddPresentationPhoto(true) },
        { text: '🖼️ Galería', onPress: () => handleAddPresentationPhoto(false) },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
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

  let mainPhotoPath = item.image_path || item.photo || item.image;
  if (!mainPhotoPath && presentationImagesList.length > 0 && presentationImagesList[0].image_path) {
    mainPhotoPath = presentationImagesList[0].image_path;
  }
  const photoUri = getImageUri(mainPhotoPath);
  const pdfUri = getImageUri(item.pdf_path || item.external_links);

  const openPdfLink = () => {
    if (pdfUri) {
      Linking.openURL(pdfUri).catch(err => {
        console.warn("No se pudo abrir el PDF/Enlace:", err);
      });
    }
  };

  // Arreglo consolidado de todas las imágenes disponibles para la vista de información
  const allDetailImages = [];
  const addedUris = new Set();

  if (photoUri && typeof photoUri === 'string' && photoUri.trim() !== '') {
    allDetailImages.push({ uri: photoUri, label: 'Fotografía Principal' });
    addedUris.add(photoUri);
  }

  if (Array.isArray(presentationImagesList)) {
    presentationImagesList.forEach((pImg, pIdx) => {
      if (pImg && pImg.image_path) {
        const pUri = getImageUri(pImg.image_path);
        if (pUri && typeof pUri === 'string' && pUri.trim() !== '' && !addedUris.has(pUri)) {
          allDetailImages.push({ uri: pUri, label: pImg.label || `Presentación ${pIdx + 1}` });
          addedUris.add(pUri);
        }
      }
    });
  }

  const safePhotoIndex = allDetailImages.length > 0 ? Math.max(0, Math.min(activePhotoIndex, allDetailImages.length - 1)) : 0;
  const currentDetailImg = allDetailImages[safePhotoIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* VISOR Y GALERÍA MULTI-IMAGEN DE LA SUSTANCIA */}
      {allDetailImages.length > 0 && currentDetailImg && currentDetailImg.uri ? (
        <View style={styles.imageHeaderContainer}>
          <Image
            source={{ uri: currentDetailImg.uri }}
            style={styles.headerImage}
            resizeMode="cover"
          />

          <View style={styles.imageBadgeOverlay}>
            <Text style={styles.imageBadgeOverlayText}>
              📷 {currentDetailImg.label} ({safePhotoIndex + 1}/{allDetailImages.length})
            </Text>
          </View>

          {allDetailImages.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 8, backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
              {allDetailImages.map((imgObj, idx) => {
                const isActive = idx === safePhotoIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setActivePhotoIndex(idx)}
                    style={{
                      borderWidth: 2,
                      borderColor: isActive ? '#38bdf8' : '#334155',
                      borderRadius: 10,
                      overflow: 'hidden',
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    <Image source={{ uri: imgObj.uri }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : (
        <View style={[styles.imageHeaderContainer, { height: 130, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' }]}>
          <Text style={{ fontSize: 36 }}>🧪</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Sin fotografía cargada</Text>
        </View>
      )}

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
            <Text style={styles.badgePrimaryText}>📦 {item.stock_units || 1} envase(s) ({item.quantity || 1} {item.unit || 'g'})</Text>
          </View>

          {item.cas_number ? (
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>CAS: {item.cas_number}</Text>
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

      {/* SECCIÓN 1: INVENTARIO Y CUSTODIA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Inventario y Custodia</Text>

        {item.inventory_number ? (
          <View style={styles.row}>
            <Text style={styles.label}>No. Inventario:</Text>
            <Text style={[styles.value, { color: '#f59e0b', fontFamily: 'monospace' }]}>{item.inventory_number}</Text>
          </View>
        ) : null}

        {item.serial_number ? (
          <View style={styles.row}>
            <Text style={styles.label}>No. Serie:</Text>
            <Text style={[styles.value, { color: '#3b82f6', fontFamily: 'monospace' }]}>{item.serial_number}</Text>
          </View>
        ) : null}

        {item.no_sep ? (
          <View style={styles.row}>
            <Text style={styles.label}>No. SEP:</Text>
            <Text style={[styles.value, { color: '#10b981', fontFamily: 'monospace' }]}>{item.no_sep}</Text>
          </View>
        ) : null}

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

              <Text style={styles.inputLabel}>Estado Físico</Text>
              <View style={styles.stateSelector}>
                {['Líquido', 'Sólido', 'Gaseoso', 'Solución'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stateOption, editPhysicalState === st && styles.stateOptionActive]}
                    onPress={() => setEditPhysicalState(st)}
                  >
                    <Text style={[styles.stateOptionText, editPhysicalState === st && styles.stateOptionTextActive]}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* BLOQUE MEJORADO DE CANTIDAD, UNIDAD Y ENVASES EN STOCK */}
              <View style={{ backgroundColor: '#0f172a', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginVertical: 10, gap: 12 }}>
                <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '800' }}>
                  📦 Cantidad y Stock en Inventario
                </Text>

                {/* 1. NÚMERO DE ENVASES / FRASCOS (STOCK FÍSICO) */}
                <View>
                  <Text style={styles.inputLabel}>1. Número de Envases / Frascos en Stock</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      style={styles.pickerStepBtn}
                      onPress={() => {
                        const val = parseInt(editStockUnits, 10) || 1;
                        setEditStockUnits(Math.max(1, val - 1).toString());
                      }}
                    >
                      <Text style={styles.pickerStepBtnText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold' }]}
                      keyboardType="number-pad"
                      value={editStockUnits}
                      onChangeText={setEditStockUnits}
                      placeholder="1"
                      placeholderTextColor="#64748b"
                    />
                    <TouchableOpacity
                      style={styles.pickerStepBtn}
                      onPress={() => {
                        const val = parseInt(editStockUnits, 10) || 1;
                        setEditStockUnits((val + 1).toString());
                      }}
                    >
                      <Text style={styles.pickerStepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 2. CANTIDAD / CONTENIDO POR ENVASE */}
                <View>
                  <Text style={styles.inputLabel}>2. Contenido / Cantidad por Envase</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editQuantity}
                    onChangeText={setEditQuantity}
                    placeholder="Ej. 500"
                    placeholderTextColor="#64748b"
                  />
                </View>

                {/* 3. UNIDAD DE MEDIDA */}
                <View>
                  <Text style={styles.inputLabel}>3. Unidad de Medida</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {['g', 'mL', 'kg', 'L', 'piezas', 'solución'].map((u) => (
                      <TouchableOpacity
                        key={u}
                        style={{
                          backgroundColor: editUnit === u ? '#0284c7' : '#1e293b',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: editUnit === u ? '#38bdf8' : '#334155',
                        }}
                        onPress={() => setEditUnit(u)}
                      >
                        <Text style={{ color: editUnit === u ? '#ffffff' : '#cbd5e1', fontSize: 12, fontWeight: 'bold' }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    value={editUnit}
                    onChangeText={setEditUnit}
                    placeholder="o escribe otra unidad (mg, galón...)"
                    placeholderTextColor="#64748b"
                  />
                </View>

                {/* RESUMEN CLARO */}
                <View style={{ backgroundColor: '#1e293b', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#0284c7', alignItems: 'center' }}>
                  <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '800' }}>
                    💡 Registro: {editStockUnits || '1'} envase(s) de {editQuantity || '0'} {editUnit || ''}
                  </Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Responsable de Custodia</Text>
              <TextInput style={styles.input} value={editResponsible} onChangeText={setEditResponsible} />

              <Text style={styles.inputLabel}>Fecha de Ingreso / Compra</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={editEntryDate} onChangeText={setEditEntryDate} placeholder="AAAA-MM-DD" placeholderTextColor="#64748b" />
                <TouchableOpacity style={styles.datePickerTriggerBtn} onPress={() => openDatePicker('entry')}>
                  <Text style={styles.datePickerTriggerBtnText}>📅 Fecha</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Fecha de Caducidad</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={editExpiration}
                  onChangeText={setEditExpiration}
                  placeholder="AAAA-MM-DD o Sin caducidad"
                  placeholderTextColor="#64748b"
                />
                <TouchableOpacity style={styles.datePickerTriggerBtn} onPress={() => openDatePicker('expiration')}>
                  <Text style={styles.datePickerTriggerBtnText}>📅 Fecha</Text>
                </TouchableOpacity>
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

              {/* SECCIÓN UNIFICADA DE FOTOGRAFÍAS */}
              <View style={{ backgroundColor: '#0f172a', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginTop: 14, gap: 10 }}>
                <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '800' }}>
                  📷 Fotografías del Producto y Presentaciones
                </Text>

                {/* 1. FOTO PRINCIPAL (PORTADA) */}
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>1. Foto Principal (Portada)</Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1 }]} onPress={() => pickEditPhotoSquare(true)}>
                    <Text style={styles.photoPickerBtnText}>📷 Cámara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => pickEditPhotoSquare(false)}>
                    <Text style={styles.photoPickerBtnText}>🖼️ Galería</Text>
                  </TouchableOpacity>
                </View>

                {editPhotoUri ? (
                  <View style={{ alignItems: 'center', marginVertical: 4 }}>
                    <Image source={{ uri: editPhotoUri }} style={{ width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: '#10b981' }} />
                  </View>
                ) : null}

                {/* 2. FOTOS ADICIONALES DE PRESENTACIONES */}
                {(type === 'substance' || type === 'substances') ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 10, marginTop: 6, gap: 8 }}>
                    <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>
                      2. Fotos Adicionales de Envases / Presentaciones ({presentationImagesList.length})
                    </Text>

                    {/* BOTÓN ÚNICO Y CLARO PARA AGREGAR OTRAS FOTOS CUANDO SEA NECESARIO */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#0284c7',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#38bdf8'
                      }}
                      onPress={promptAddPresentationPhoto}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                        ➕ Agregar otra foto (Envase / Presentación)
                      </Text>
                    </TouchableOpacity>

                    {presentationImagesList.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 6 }}>
                        {presentationImagesList.map((pImg, idx) => {
                          const pUri = getImageUri(pImg.image_path);
                          return pUri ? (
                            <View key={idx} style={{ position: 'relative', width: 75, alignItems: 'center' }}>
                              <Image source={{ uri: pUri }} style={{ width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderColor: '#38bdf8' }} resizeMode="cover" />
                              <TouchableOpacity
                                style={styles.deletePresBadge}
                                onPress={() => handleDeletePresentationPhoto(idx)}
                              >
                                <Text style={styles.deletePresBadgeText}>✕</Text>
                              </TouchableOpacity>
                              <Text numberOfLines={1} style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>
                                {pImg.label || `Envase ${idx + 1}`}
                              </Text>
                            </View>
                          ) : null;
                        })}
                      </ScrollView>
                    ) : null}
                  </View>
                ) : null}
              </View>

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

      {/* MODAL SELECTOR DE FECHA CON CALENDARIO INTERACTIVO Y NAVEGACIÓN MES-AÑO */}
      <Modal
        visible={dateModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 360 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📅 Seleccionar Fecha ({dateTargetField === 'entry' ? 'Ingreso' : 'Caducidad'})
              </Text>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 6, gap: 10 }}>
              {/* BARRA SUPERIOR DE SELECCIÓN RÁPIDA AÑO - MES */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#334155' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.calendarNavBtn, { paddingHorizontal: 8 }]}
                    onPress={() => setPickerYear(pickerYear - 1)}
                  >
                    <Text style={styles.calendarNavBtnText}>-1 Año</Text>
                  </TouchableOpacity>
                  
                  <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: '800' }}>
                    {pickerYear}
                  </Text>
                  
                  <TouchableOpacity
                    style={[styles.calendarNavBtn, { paddingHorizontal: 8 }]}
                    onPress={() => setPickerYear(pickerYear + 1)}
                  >
                    <Text style={styles.calendarNavBtnText}>+1 Año</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: '#0284c7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                  onPress={() => setShowMonthYearGrid(!showMonthYearGrid)}
                >
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                    {showMonthYearGrid ? '📅 Ver Días' : '🗓️ Cambiar Mes'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showMonthYearGrid ? (
                /* VISTA DE REJILLA DE 12 MESES */
                <View style={{ backgroundColor: '#0f172a', borderRadius: 16, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                    Selecciona un Mes para {pickerYear}:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((mName, mIdx) => {
                      const isCurrentMonth = (mIdx + 1) === pickerMonth;
                      return (
                        <TouchableOpacity
                          key={mName}
                          style={{
                            width: '28%',
                            backgroundColor: isCurrentMonth ? '#0284c7' : '#1e293b',
                            paddingVertical: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isCurrentMonth ? '#38bdf8' : '#334155',
                          }}
                          onPress={() => {
                            setPickerMonth(mIdx + 1);
                            setShowMonthYearGrid(false);
                          }}
                        >
                          <Text style={{ color: isCurrentMonth ? '#ffffff' : '#cbd5e1', fontSize: 13, fontWeight: 'bold' }}>
                            {mName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* VISTA DE CALENDARIO MENSUAL */
                <View style={styles.calendarContainer}>
                  {/* Cabecera del Mes y Año */}
                  <View style={styles.calendarHeaderRow}>
                    <TouchableOpacity
                      style={styles.calendarNavBtn}
                      onPress={() => {
                        if (pickerMonth > 1) {
                          setPickerMonth(pickerMonth - 1);
                        } else {
                          setPickerMonth(12);
                          setPickerYear(pickerYear - 1);
                        }
                      }}
                    >
                      <Text style={styles.calendarNavBtnText}>◀ Mes</Text>
                    </TouchableOpacity>

                    <Text style={styles.calendarMonthYearText}>
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][pickerMonth - 1]} {pickerYear}
                    </Text>

                    <TouchableOpacity
                      style={styles.calendarNavBtn}
                      onPress={() => {
                        if (pickerMonth < 12) {
                          setPickerMonth(pickerMonth + 1);
                        } else {
                          setPickerMonth(1);
                          setPickerYear(pickerYear + 1);
                        }
                      }}
                    >
                      <Text style={styles.calendarNavBtnText}>Mes ▶</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Días de la semana */}
                  <View style={styles.weekRow}>
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dayName, idx) => (
                      <Text key={idx} style={styles.weekDayText}>{dayName}</Text>
                    ))}
                  </View>

                  {/* Matriz de Días del Mes */}
                  <View style={styles.daysGrid}>
                    {(() => {
                      const totalDaysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();
                      const firstDayIndex = new Date(pickerYear, pickerMonth - 1, 1).getDay();
                      const cells = [];

                      for (let i = 0; i < firstDayIndex; i++) {
                        cells.push(<View key={`empty-${i}`} style={styles.dayCellEmpty} />);
                      }

                      for (let d = 1; d <= totalDaysInMonth; d++) {
                        const isSelected = d === pickerDay;
                        cells.push(
                          <TouchableOpacity
                            key={`day-${d}`}
                            style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                            onPress={() => setPickerDay(d)}
                          >
                            <Text style={[styles.dayCellText, isSelected && styles.dayCellTextSelected]}>
                              {d}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                      return cells;
                    })()}
                  </View>
                </View>
              )}

              {/* Insignia de Fecha Seleccionada */}
              <View style={styles.selectedDateBadge}>
                <Text style={styles.selectedDateBadgeText}>
                  Selección: {pickerYear}-{pickerMonth < 10 ? `0${pickerMonth}` : pickerMonth}-{pickerDay < 10 ? `0${pickerDay}` : pickerDay}
                </Text>
              </View>

              {/* Botones de Acción */}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={[styles.applyDateBtn, { flex: 1, backgroundColor: '#334155' }]}
                  onPress={() => {
                    const now = new Date();
                    setPickerYear(now.getFullYear());
                    setPickerMonth(now.getMonth() + 1);
                    setPickerDay(now.getDate());
                  }}
                >
                  <Text style={styles.applyDateBtnText}>📍 Hoy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applyDateBtn, { flex: 1.2, backgroundColor: '#0284c7' }]}
                  onPress={applyMonthYearDate}
                >
                  <Text style={styles.applyDateBtnText}>🗓️ Solo Mes-Año</Text>
                </TouchableOpacity>

                {dateTargetField === 'expiration' ? (
                  <TouchableOpacity
                    style={[styles.applyDateBtn, { flex: 1.2, backgroundColor: '#0369a1', borderColor: '#38bdf8', borderWidth: 1 }]}
                    onPress={() => {
                      setEditExpiration('Sin caducidad');
                      setDateModalVisible(false);
                    }}
                  >
                    <Text style={[styles.applyDateBtnText, { color: '#ffffff' }]}>✨ Sin Caducidad</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity style={[styles.applyDateBtn, { flex: 1.5, backgroundColor: '#10b981' }]} onPress={applySelectedDate}>
                  <Text style={styles.applyDateBtnText}>✓ Completa</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  headerImage: {
    width: '100%',
    height: 220,
  },
  imageBadgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  imageBadgeOverlayText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
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
  datePickerTriggerBtn: {
    backgroundColor: '#0f172a',
    borderColor: '#38bdf8',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  datePickerTriggerBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  applyDateBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyDateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  calendarContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarNavBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  calendarNavBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  calendarMonthYearText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 6,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 34,
  },
  dayCell: {
    width: '14.28%',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    borderRadius: 17,
  },
  dayCellSelected: {
    backgroundColor: '#0284c7',
  },
  dayCellText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  dayCellTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  selectedDateBadge: {
    backgroundColor: '#0f172a',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
  },
  selectedDateBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  stateSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  stateOption: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stateOptionActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  stateOptionText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  stateOptionTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
