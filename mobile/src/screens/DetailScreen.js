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
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';
import apiClient, { DEFAULT_API_BASE, getImageUrl } from '../api/client';
import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

const { width } = Dimensions.get('window');

export default function DetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { role, user, serverUrl } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(10, 20, 38, 0.84)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(6, 182, 212, 0.35)';
  const pillBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';
  const btnBg = isDark ? 'rgba(18, 38, 68, 0.85)' : 'rgba(241, 245, 249, 0.95)';
  const btnBorder = isDark ? 'rgba(34, 211, 238, 0.25)' : 'rgba(6, 182, 212, 0.30)';

  const { type, id: paramId, item: initialItem } = route.params || {};

  const [item, setItem] = useState(initialItem || null);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showEditChemModal, setShowEditChemModal] = useState(false);

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

  // Visor de foto a pantalla completa
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);
  const [previewPhotoLabel, setPreviewPhotoLabel] = useState('');

  const openPhotoPreview = (url, label = 'Fotografía') => {
    if (!url) return;
    setPreviewPhotoUrl(url);
    setPreviewPhotoLabel(label);
    setPreviewModalVisible(true);
  };

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

  const fetchDetail = async (targetIdParam) => {
    const targetId = targetIdParam || initialItem?.id || paramId || item?.id;
    if (!targetId) return;
    try {
      let endpoint = `/api/substances/${targetId}`;
      if (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material') {
        endpoint = `/api/chemical-materials/${targetId}`;
      } else if (type === 'didactic-materials' || type === 'didactic_materials' || type === 'did_material') {
        endpoint = `/api/didactic-materials/${targetId}`;
      } else if (type === 'equipos' || type === 'equipo') {
        endpoint = `/api/equipos/${targetId}`;
      }
      const res = await apiClient.get(endpoint);
      if (res.data && res.data.status === 'success') {
        setItem(res.data.data);
      }
    } catch (e) {
      console.warn("Error cargando detalle:", e);
    }
  };

  const [siblingsList, setSiblingsList] = useState([]);

  const fetchSiblings = async (targetId) => {
    if (!targetId) return;
    const isChem = (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material');
    const isSub = (!type || type === 'substance' || type === 'substances');
    if (!isChem && !isSub) {
      setSiblingsList([]);
      return;
    }
    try {
      const endpoint = isChem 
        ? `/api/chemical-materials/${targetId}/siblings` 
        : `/api/substances/${targetId}/siblings`;
      const res = await apiClient.get(endpoint);
      if (res.data && res.data.status === 'success') {
        const list = res.data.siblings || res.data.data || [];
        if (Array.isArray(list)) {
          setSiblingsList(list);
        }
      }
    } catch (e) {
      console.warn("Siblings fetch error:", e);
    }
  };

  useEffect(() => {
    if (initialItem) setItem(initialItem);
    fetchDetail();
    const tid = initialItem?.id || paramId;
    if (tid) fetchSiblings(tid);
  }, [paramId, initialItem]);

  const handleAssignLocation = async (locationStr) => {
    try {
      let endpoint = `/api/substances/${item.id}`;
      if (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material') {
        endpoint = `/api/chemical-materials/${item.id}`;
      } else if (type === 'didactic-materials' || type === 'didactic_materials' || type === 'did_material') {
        endpoint = `/api/didactic-materials/${item.id}`;
      } else if (type === 'equipos' || type === 'equipo') {
        endpoint = `/api/equipos/${item.id}`;
      }
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

  const handleQuickQuantityChange = async (delta) => {
    const currentQty = parseInt(item.quantity || item.stock || 1, 10);
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === currentQty) return;
    try {
      const endpoint = (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material') 
        ? `/api/chemical-materials/${item.id}` 
        : ((type === 'didactic-materials' || type === 'didactic_materials' || type === 'did_material')
            ? `/api/didactic-materials/${item.id}`
            : `/api/substances/${item.id}`);
      
      const payload = (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material')
        ? { quantity: newQty, stock: newQty }
        : { quantity: newQty, stock: newQty, stock_units: newQty };
      
      const res = await apiClient.put(endpoint, payload);
      if (res.data && res.data.status === 'success') {
        setItem(prev => ({ ...prev, quantity: newQty, stock: newQty }));
      } else {
        Alert.alert('Error', res.data?.message || 'No se pudo actualizar la cantidad.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar la cantidad: ' + e.message);
    }
  };

  const openEditModal = () => {
    if (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material') {
      setShowEditChemModal(true);
      return;
    }
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
              const isSub = (type === 'substance' || type === 'substances');
              const isChem = (type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material');
              const isDid = (type === 'didactic-materials' || type === 'didactic_materials' || type === 'did_material');

              let endpoint = `/api/substances/${item.id}`;
              if (isChem) {
                endpoint = `/api/chemical-materials/${item.id}`;
              } else if (isDid) {
                endpoint = `/api/didactic-materials/${item.id}`;
              }

              const res = await apiClient.delete(endpoint);
              if (res.data && res.data.status === 'success') {
                if (res.data.pending) {
                  Alert.alert('⏳ Solicitud Enviada', res.data.message || 'La solicitud de eliminación fue enviada al administrador.');
                } else {
                  Alert.alert('✅ Éxito', 'Registro eliminado del inventario.');
                }
                navigation.goBack();
              } else {
                Alert.alert('Error', res.data?.message || 'No se pudo eliminar el registro.');
              }
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

  const renderCabinetGrid = () => {
    if (type !== 'substance') return null;
    if (!item.location || !/^[1-3]-[AB]$/.test(item.location)) return null;
    
    const [rowStr, colStr] = item.location.split('-');
    const itemRow = parseInt(rowStr);
    const itemCol = colStr;
    
    const rows = [1, 2, 3];
    const cols = ['A', 'B'];
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Ubicación: Almacén</Text>
        <View style={{ backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
          {rows.map(r => (
            <View key={r} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              {cols.map(c => {
                const isTarget = (r === itemRow && c === itemCol);
                return (
                  <View key={c} style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: isTarget ? '#10b981' : '#cbd5e1',
                    backgroundColor: isTarget ? '#d1fae5' : '#ffffff',
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: isTarget ? '#10b981' : 'transparent',
                    shadowOpacity: isTarget ? 0.3 : 0,
                    shadowRadius: 4,
                    elevation: isTarget ? 3 : 0
                  }}>
                    <Text style={{ 
                      fontSize: 16, 
                      fontWeight: 'bold', 
                      color: isTarget ? '#047857' : '#94a3b8'
                    }}>
                      {r}-{c}
                    </Text>
                    {isTarget && (
                      <View style={{ position: 'absolute', top: -10, right: -10, backgroundColor: '#10b981', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
                         <Text style={{fontSize: 12}}>📍</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          <Text style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 4 }}>
            El reactivo se encuentra en la posición resaltada en verde.
          </Text>
        </View>
      </View>
    );
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

  // Extraer sub-objetos del kit si existen en contents o container_content
  let kitContentsList = [];
  let plainTextKitContent = '';
  const rawKitContents = item?.contents || item?.container_content || '';

  if (rawKitContents) {
    if (typeof rawKitContents === 'string') {
      const trimmed = rawKitContents.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            kitContentsList = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            kitContentsList = [parsed];
          }
        } catch (e) {
          plainTextKitContent = trimmed;
        }
      } else {
        plainTextKitContent = trimmed;
      }
    } else if (Array.isArray(rawKitContents)) {
      kitContentsList = rawKitContents;
    }
  }

  if (Array.isArray(kitContentsList)) {
    kitContentsList.forEach((sub, idx) => {
      if (sub && (sub.imageUri || sub.image_path)) {
        const subUri = getImageUri(sub.imageUri || sub.image_path);
        if (subUri && typeof subUri === 'string' && subUri.trim() !== '' && !addedUris.has(subUri)) {
          allDetailImages.push({ uri: subUri, label: `Sub-objeto: ${sub.name || `#${idx + 1}`}` });
          addedUris.add(subUri);
        }
      }
    });
  }

  const totalSubPieces = Array.isArray(kitContentsList) ? kitContentsList.reduce((acc, sub) => acc + (parseInt(sub.quantity, 10) || 1), 0) : 0;

  const safePhotoIndex = allDetailImages.length > 0 ? Math.max(0, Math.min(activePhotoIndex, allDetailImages.length - 1)) : 0;
  const currentDetailImg = allDetailImages[safePhotoIndex];

  const renderRiskBadges = () => {
    if (!item) return null;
    const name = (item.name || '').toLowerCase();
    const risks = (item.risks_warnings || '').toLowerCase();
    
    const isCorrosive = name.includes('sulfúrico') || name.includes('clorhídrico') || name.includes('fórmico') || name.includes('fosfórico') || name.includes('propiónico') || name.includes('butírico') || name.includes('hidróxido') || name.includes('cal sodada') || risks.includes('corrosiv') || risks.includes('ghs05');
    const isToxic = risks.includes('tóxic') || risks.includes('toxic') || risks.includes('veneno') || risks.includes('ghs06');
    const isFlammable = risks.includes('inflamable') || risks.includes('combustible') || risks.includes('ghs02');
    const isExplosive = risks.includes('explosiv') || risks.includes('ghs01');
    const isOxidizing = risks.includes('comburente') || risks.includes('oxidante') || risks.includes('ghs03');

    const badges = [];
    if (isCorrosive) badges.push({ id: 'corrosive', label: 'CORROSIVO', color: '#ef4444', icon: '⚠️' });
    if (isToxic) badges.push({ id: 'toxic', label: 'TÓXICO', color: '#b91c1c', icon: '☠️' });
    if (isFlammable) badges.push({ id: 'flammable', label: 'INFLAMABLE', color: '#f97316', icon: '🔥' });
    if (isExplosive) badges.push({ id: 'explosive', label: 'EXPLOSIVO', color: '#ea580c', icon: '💥' });
    if (isOxidizing) badges.push({ id: 'oxidizing', label: 'COMBURENTE', color: '#fbbf24', icon: '⭕🔥' });

    if (badges.length === 0) return null;

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 4 }}>
        {badges.map(b => (
          <View key={b.id} style={{ backgroundColor: b.color + '20', borderColor: b.color, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 16 }}>{b.icon}</Text>
            <Text style={{ color: b.color, fontWeight: 'bold', fontSize: 14 }}>{b.label}</Text>
          </View>
        ))}
      </View>
    );
  };


  return (
    <GlassBackground>
      {/* 1. BARRA SUPERIOR ELEGANTE CON BOTÓN DE REGRESO Y TÍTULO */}
      <View style={[styles.topHeader, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity 
          style={[styles.backBtnPill, { backgroundColor: pillBg, borderColor: cardBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={[styles.backBtnText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>‹ Volver</Text>
        </TouchableOpacity>

        {/* LOGO ITMA II */}
        <View style={styles.headerLogoBox}>
          <View style={[styles.headerFlaskBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)', borderColor: cardBorder }]}>
            <Text style={styles.headerFlaskIcon}>⚗️</Text>
          </View>
          <View>
            <Text style={[styles.headerLogoTitle, { color: textColor }]}>ITMA II</Text>
            <Text style={[styles.headerLogoSubtitle, { color: subtextColor }]}>Laboratorio</Text>
          </View>
        </View>

        {/* Título de Pantalla al Costado */}
        <View style={[styles.screenTitleBadgePill, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(6, 182, 212, 0.10)', borderColor: cardBorder }]}>
          <Text style={[styles.screenTitleBadgeText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>
            Ficha Técnica
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 115, paddingHorizontal: 14, paddingTop: 6 }} showsVerticalScrollIndicator={false}>
      {/* VISOR Y GALERÍA MULTI-IMAGEN DE LA SUSTANCIA */}
      {allDetailImages.length > 0 && currentDetailImg && currentDetailImg.uri ? (
        <View style={[styles.imageHeaderContainer, { borderColor: cardBorder, backgroundColor: cardBg }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => openPhotoPreview(currentDetailImg.uri, currentDetailImg.label)}>
            <Image
              source={{ uri: currentDetailImg.uri }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>

          <View style={styles.imageBadgeOverlay}>
            <Text style={styles.imageBadgeOverlayText}>
              📷 {currentDetailImg.label} ({safePhotoIndex + 1}/{allDetailImages.length}) • Toca para ampliar 🔍
            </Text>
          </View>

          {allDetailImages.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 8, backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.90)' }}>
              {allDetailImages.filter(imgObj => imgObj && imgObj.uri).map((imgObj, idx) => {
                const isActive = idx === safePhotoIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setActivePhotoIndex(idx)}
                    style={{
                      borderWidth: 2,
                      borderColor: isActive ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.15)'),
                      borderRadius: 12,
                      overflow: 'hidden',
                      opacity: isActive ? 1 : 0.65,
                    }}
                  >
                    <Image source={{ uri: imgObj.uri }} style={{ width: 54, height: 54 }} resizeMode="cover" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      {/* HEADER DE TÍTULO Y BADGES */}
      <View style={[styles.glassDetailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: textColor }]}>{item.name}</Text>
            <View style={styles.idBadgePill}>
              <Text style={styles.idBadgePillText}>ID: LAB-{item.id}</Text>
            </View>
          </View>

          {/* Botones de Administración (Editar / Eliminar) */}
          {isAdminOrResp ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.editHeaderBtn} onPress={openEditModal}>
                <LinearGradient colors={['#06b6d4', '#0284c7']} style={styles.editGradientBtn}>
                  <Text style={styles.editHeaderBtnText}>✏️ Editar</Text>
                </LinearGradient>
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
          {item.category ? (
            <View style={[styles.badgePrimary, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.12)', borderColor: isDark ? 'rgba(34, 211, 238, 0.40)' : 'rgba(6, 182, 212, 0.35)' }]}>
              <Text style={[styles.badgePrimaryText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>📦 {item.category}</Text>
            </View>
          ) : null}

          <View style={[styles.badgePrimary, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.12)', borderColor: isDark ? 'rgba(234, 179, 8, 0.40)' : 'rgba(234, 179, 8, 0.35)' }]}>
            <Text style={[styles.badgePrimaryText, { color: '#fbbf24' }]}>
              📦 Stock: {totalSubPieces > 0 ? `${totalSubPieces} piezas en kit` : `${item.quantity || item.stock || 1} ${item.unit || 'piezas'}`}
            </Text>
          </View>

          {item.capacity ? (
            <View style={[styles.badgeSecondary, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.90)', borderColor: cardBorder }]}>
              <Text style={[styles.badgeSecondaryText, { color: subtextColor }]}>🧪 Capacidad: {item.capacity}</Text>
            </View>
          ) : null}

          {item.status || item.condition ? (
            <View style={[styles.badgeSecondary, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.40)' }]}>
              <Text style={[styles.badgeSecondaryText, { color: '#34d399' }]}>🟢 {item.status || item.condition}</Text>
            </View>
          ) : null}

          {item.cas_number ? (
            <View style={[styles.badgeSecondary, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(241, 245, 249, 0.90)', borderColor: cardBorder }]}>
              <Text style={[styles.badgeSecondaryText, { color: subtextColor }]}>CAS: {item.cas_number}</Text>
            </View>
          ) : null}
        </View>

        {/* Grupos Químicos o Categorías */}
        {item.substance_group ? (
          <View style={styles.groupBadgesContainer}>
            {item.substance_group.split(/[,/;|]/).map(g => g.trim()).filter(Boolean).map((group, idx) => (
              <View key={idx} style={[styles.groupBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(241, 245, 249, 0.9)', borderColor: cardBorder }]}>
                <Text style={[styles.groupBadgeText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>{group}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {renderRiskBadges()}
      </View>

      {/* SECCIÓN 1: INVENTARIO Y CUSTODIA */}
      <View style={[styles.glassDetailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>📦 Inventario y Custodia</Text>

        {item.category ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>Categoría:</Text>
            <Text style={[styles.value, { color: isDark ? '#22d3ee' : '#0891b2' }]}>{item.category}</Text>
          </View>
        ) : null}

        {item.capacity ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>Capacidad / Especificación:</Text>
            <Text style={[styles.value, { color: textColor }]}>{item.capacity}</Text>
          </View>
        ) : null}

        <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
          <Text style={[styles.label, { color: subtextColor }]}>Ubicación Física:</Text>
          <Text style={[styles.value, { color: '#10b981' }]}>{item.location || 'Laboratorio Principal'}</Text>
        </View>

        {item.inventory_number ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>No. Inventario:</Text>
            <Text style={[styles.value, { color: '#fbbf24', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>{item.inventory_number}</Text>
          </View>
        ) : null}

        {item.serial_number ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>No. Serie:</Text>
            <Text style={[styles.value, { color: isDark ? '#38bdf8' : '#0284c7', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>{item.serial_number}</Text>
          </View>
        ) : null}

        {item.no_sep ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>No. SEP:</Text>
            <Text style={[styles.value, { color: '#10b981', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>{item.no_sep}</Text>
          </View>
        ) : null}

        {item.original_id ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>ID CB / Excel:</Text>
            <Text style={[styles.value, { color: '#c084fc', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>{item.original_id}</Text>
          </View>
        ) : null}

        <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
          <Text style={[styles.label, { color: subtextColor }]}>Responsable Custodia:</Text>
          <Text style={[styles.value, { color: textColor }]}>{item.responsible || 'No asignado'}</Text>
        </View>

        {item.status || item.condition ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>Estado / Condición:</Text>
            <Text style={[styles.value, { color: '#10b981' }]}>{item.status || item.condition}</Text>
          </View>
        ) : null}

        {item.container_content ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>Contenido por Envase:</Text>
            <Text style={[styles.value, { color: textColor }]}>{item.container_content}</Text>
          </View>
        ) : null}

        {item.entry_date ? (
          <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <Text style={[styles.label, { color: subtextColor }]}>Fecha de Entrada:</Text>
            <Text style={[styles.value, { color: textColor }]}>{item.entry_date}</Text>
          </View>
        ) : null}

        {item.expiration_date ? (
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[styles.label, { color: subtextColor }]}>Fecha de Caducidad:</Text>
            <Text style={[
              styles.value, 
              (item.expiration_date === 'Sin caducidad' || item.expiration_date === 'No aplica') ? { color: isDark ? '#38bdf8' : '#0284c7' } : { color: textColor }
            ]}>
              {item.expiration_date}
            </Text>
          </View>
        ) : null}
      </View>

      {/* SECCIÓN CONTENIDO DEL KIT Y SUB-OBJETOS */}
      {(kitContentsList.length > 0 || plainTextKitContent !== '') ? (
        <View style={[styles.glassDetailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            📦 Contenido del Kit / Sub-objetos {kitContentsList.length > 0 ? `(${totalSubPieces} piezas en ${kitContentsList.length} tipos)` : ''}
          </Text>

          {plainTextKitContent !== '' ? (
            <View style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.8)', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: cardBorder, marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: textColor, lineHeight: 18 }}>{plainTextKitContent}</Text>
            </View>
          ) : null}

          {kitContentsList.length > 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {kitContentsList.map((sub, idx) => {
                const subPhotoUri = getImageUri(sub.localUri || sub.imageUri || sub.image_path || sub.photo);
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)', padding: 10, borderRadius: 14, borderWidth: 1, borderColor: cardBorder, gap: 10 }}>
                    {subPhotoUri ? (
                      <TouchableOpacity onPress={() => openPhotoPreview(subPhotoUri, sub.name || `Sub-objeto #${idx + 1}`)}>
                        <Image source={{ uri: subPhotoUri }} style={{ width: 48, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: isDark ? '#22d3ee' : '#0891b2' }} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : '#ccfbf1', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20 }}>📦</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 13, color: textColor }}>{sub.name || `Sub-objeto #${idx + 1}`}</Text>
                      <Text style={{ fontSize: 11, color: subtextColor, marginTop: 2 }}>Cantidad en paquete: {sub.quantity || 1} piezas</Text>
                      {subPhotoUri ? (
                        <Text style={{ fontSize: 10, color: isDark ? '#22d3ee' : '#0891b2', fontWeight: 'bold', marginTop: 2 }}>🔍 Toca la foto para ampliar</Text>
                      ) : null}
                    </View>
                    <View style={{ backgroundColor: isDark ? 'rgba(6, 182, 212, 0.25)' : '#0891b2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#22d3ee' : '#0891b2' }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>x{sub.quantity || 1}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* SECCIÓN UNIDADES FÍSICAS REGISTRADAS (MISMO PRODUCTO CON DIFERENTE NO. SEP / INVENTARIO) */}
      {(type === 'chemical-materials' || type === 'chemical_materials' || type === 'chem_material' || siblingsList.length > 0) ? (
        <View style={[styles.glassDetailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: '#10b981', marginBottom: 4 }]}>
            📦 Unidades Físicas Registradas ({siblingsList.length || 1})
          </Text>
          <Text style={{ color: subtextColor, fontSize: 11, marginBottom: 12 }}>
            Lista de copias físicas de este mismo producto con diferente No. SEP o No. Inventario:
          </Text>

          {siblingsList.map((sib) => {
            const isCurrent = sib.id === item.id;
            return (
              <TouchableOpacity
                key={sib.id}
                onPress={() => {
                  if (!isCurrent) {
                    setItem(sib);
                    fetchDetail(sib.id);
                    fetchSiblings(sib.id);
                  }
                }}
                style={{
                  backgroundColor: isCurrent ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5') : (isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)'),
                  borderWidth: 1,
                  borderColor: isCurrent ? '#10b981' : cardBorder,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: isCurrent ? '#10b981' : textColor, fontWeight: 'bold', fontSize: 13 }}>
                      {isCurrent ? '👉 ' : ''}ID #{sib.id}
                    </Text>
                    {sib.no_sep ? (
                      <Text style={{ color: '#10b981', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        SEP: {sib.no_sep}
                      </Text>
                    ) : null}
                    {sib.inventory_number ? (
                      <Text style={{ color: '#f59e0b', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: 'bold', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        Inv: {sib.inventory_number}
                      </Text>
                    ) : null}
                  </View>

                  <Text style={{ color: subtextColor, fontSize: 11, marginTop: 4 }}>
                    Ubicación: {sib.location || 'Laboratorio'} | Estado: {sib.status || 'Buenas condiciones'}
                  </Text>
                </View>

                {isCurrent ? (
                  <View style={{ backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Actual</Text>
                  </View>
                ) : (
                  <Text style={{ color: isDark ? '#38bdf8' : '#0284c7', fontSize: 12, fontWeight: 'bold' }}>Ver ➔</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* SECCIÓN 2: PROPIEDADES FÍSICAS Y QUÍMICAS */}
      {(type === 'substance' || item.physical_state) ? (
        <>
          <View style={[styles.glassDetailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>⚗️ Propiedades Físicas y Químicas</Text>
            <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
              <Text style={[styles.label, { color: subtextColor }]}>Estado Físico:</Text>
              <Text style={[styles.value, { color: '#10b981', fontWeight: 'bold' }]}>{item.physical_state || 'N/A'}</Text>
            </View>

            {item.composition ? (
              <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
                <Text style={[styles.label, { color: subtextColor }]}>Composición / Pureza:</Text>
                <Text style={[styles.value, { color: textColor }]}>{item.composition}</Text>
              </View>
            ) : null}

            {item.concentration ? (
              <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
                <Text style={[styles.label, { color: subtextColor }]}>Concentración:</Text>
                <Text style={[styles.value, { color: textColor }]}>{item.concentration}</Text>
              </View>
            ) : null}

            {item.color ? (
              <View style={[styles.row, { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
                <Text style={[styles.label, { color: subtextColor }]}>Color:</Text>
                <Text style={[styles.value, { color: textColor }]}>{item.color}</Text>
              </View>
            ) : null}

            {item.odor ? (
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={[styles.label, { color: subtextColor }]}>Olor:</Text>
                <Text style={[styles.value, { color: textColor }]}>{item.odor}</Text>
              </View>
            ) : null}
          </View>

          {/* RIESGOS SGA / ADVERTENCIAS */}
          {item.risks_warnings ? (
            <View style={[styles.glassDetailCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(254, 242, 242, 0.95)', borderColor: 'rgba(239, 68, 68, 0.35)', borderLeftColor: '#ef4444', borderLeftWidth: 4 }]}>
              <Text style={[styles.sectionTitle, { color: '#f87171' }]}>⚠️ Riesgos y Advertencias (SGA)</Text>
              <Text style={[styles.descText, { color: textColor }]}>{item.risks_warnings}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* UBICACIÓN EN ORGANIZADOR (2x6) */}
      {renderCabinetGrid()}

      {/* SECCIÓN 3: OBSERVACIONES */}
      {item.observations ? (
        <View style={[styles.glassDetailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>📝 Observaciones</Text>
          <Text style={[styles.descText, { color: textColor }]}>{item.observations}</Text>
        </View>
      ) : null}

      {/* SECCIÓN CÓDIGO QR DE INVENTARIO */}
      <View style={[styles.glassDetailCard, { alignItems: 'center', backgroundColor: cardBg, borderColor: cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#22d3ee' : '#0891b2', alignSelf: 'flex-start' }]}>📱 Código QR de Inventario</Text>

        <View style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 18, marginVertical: 10, shadowColor: '#00f2fe', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 }}>
          <Image
            source={{
              uri: item.qr_path
                ? getImageUri(item.qr_path)
                : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(item.qr_content || `LAB-CHEMICAL_MATERIALS-${item.id}`)}`
            }}
            style={{ width: 160, height: 160 }}
            resizeMode="contain"
          />
        </View>

        <Text style={{ color: subtextColor, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textAlign: 'center', backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(241, 245, 249, 0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: cardBorder }}>
          {item.qr_content || `LAB-CHEMICAL_MATERIALS-${item.id}`}
        </Text>

        <TouchableOpacity 
          style={{ borderRadius: 14, overflow: 'hidden', marginVertical: 4, width: '100%' }}
          onPress={async () => {
            try {
              const qrImageUrl = item.qr_path
                ? getImageUri(item.qr_path)
                : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(item.qr_content || `LAB-CHEMICAL_MATERIALS-${item.id}`)}`;

              const htmlContent = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 15px; }
                      .label-card { border: 2px solid #0f172a; border-radius: 12px; padding: 15px; max-width: 280px; margin: 0 auto; }
                      .header { font-size: 11px; font-weight: bold; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; }
                      .title { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
                      .subtitle { font-size: 10px; color: #64748b; margin-bottom: 10px; }
                      .qr-img { width: 150px; height: 150px; object-fit: contain; margin: 5px auto; display: block; }
                      .code-badge { font-family: monospace; font-size: 10px; font-weight: bold; background-color: #f1f5f9; color: #0f172a; padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 6px; display: inline-block; word-break: break-all; }
                    </style>
                  </head>
                  <body>
                    <div class="label-card">
                      <div class="header">TECNM - MILPA ALTA II</div>
                      <div class="title">${item.name || 'Material Químico'}</div>
                      <div class="subtitle">Categoría: ${item.category || item.substance_group || 'Inventario'} | Ubicación: ${item.location || 'Laboratorio'}</div>
                      <img class="qr-img" src="${qrImageUrl}" />
                      <div class="code-badge">${item.qr_content || `LAB-CHEMICAL_MATERIALS-${item.id}`}</div>
                    </div>
                  </body>
                </html>
              `;
              await Print.printAsync({ html: htmlContent });
            } catch (err) {
              Alert.alert('Error al Imprimir', 'No se pudo generar la etiqueta QR: ' + err.message);
            }
          }}
        >
          <LinearGradient colors={['#06b6d4', '#0284c7']} style={{ paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>🖨️ Generar e Imprimir QR</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* BOTÓN SOLICITAR PRÉSTAMO (Solo Docentes / Admin) */}
      {(type === 'substance' && isAdminOrResp) ? (
        <TouchableOpacity style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12 }} onPress={openLoanModal}>
          <LinearGradient colors={['#eab308', '#d97706']} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={styles.loanRequestBtnText}>🤝 Solicitar Préstamo de Sustancia</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      {/* BOTÓN VER FICHA HDS / PDF */}
      {pdfUri ? (
        <TouchableOpacity style={[styles.pdfButton, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={openPdfLink}>
          <Text style={[styles.pdfButtonText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>📄 Ver Hoja de Datos de Seguridad (HDS / FDS)</Text>
        </TouchableOpacity>
      ) : null}
      </ScrollView>

      {/* MODAL PARA REGISTRAR OTRA UNIDAD DEL MISMO PRODUCTO */}
      <ChemicalMaterialRegisterModal
        visible={showAddUnitModal}
        onClose={() => setShowAddUnitModal(false)}
        onSuccess={() => {
          setShowAddUnitModal(false);
          if (item?.id) fetchSiblings(item.id);
        }}
        prefillItem={item ? { ...item, id: null, no_sep: '', inventory_number: '', serial_number: '', stock: '1', quantity: 1 } : null}
      />

      {/* MODAL PARA EDITAR EL MATERIAL QUÍMICO ACTUAL CON EL MISMO ASISTENTE */}
      <ChemicalMaterialRegisterModal
        visible={showEditChemModal}
        onClose={() => setShowEditChemModal(false)}
        onSuccess={() => {
          setShowEditChemModal(false);
          fetchDetail();
          if (item?.id) fetchSiblings(item.id);
        }}
        prefillItem={item}
      />

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

      {/* MODAL DE VISOR DE FOTO EN PANTALLA COMPLETA */}
      <Modal
        visible={previewModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
            onPress={() => setPreviewModalVisible(false)}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>✕ Cerrar</Text>
          </TouchableOpacity>

          {previewPhotoLabel ? (
            <Text style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: 14, marginBottom: 12, textAlign: 'center', paddingHorizontal: 20 }}>
              📷 {previewPhotoLabel}
            </Text>
          ) : null}

          {previewPhotoUrl ? (
            <Image
              source={{ uri: previewPhotoUrl }}
              style={{ width: '100%', height: '75%', borderRadius: 16 }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  headerLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFlaskBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerFlaskIcon: {
    fontSize: 17,
  },
  headerLogoTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  headerLogoSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  screenTitleBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  container: {
    flex: 1,
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
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1.2,
    shadowColor: '#00f2fe',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
  glassDetailCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    marginBottom: 14,
    shadowColor: '#00f2fe',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 6,
  },
  idBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.35)',
  },
  idBadgePillText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  formula: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '700',
    marginTop: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badgePrimary: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgePrimaryText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  badgeSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeSecondaryText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  groupBadgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  groupBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editHeaderBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  editGradientBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  editHeaderBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  deleteHeaderBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.20)',
    borderColor: '#ef4444',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteHeaderBtnText: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  value: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
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
