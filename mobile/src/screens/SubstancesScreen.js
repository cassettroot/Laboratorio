import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Image,
  RefreshControl,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { apiService } from '../api/services';
import { getImageUrl } from '../api/client';

import SubstanceRegisterModal from '../components/modals/SubstanceRegisterModal';
import ChemicalMaterialRegisterModal from '../components/modals/ChemicalMaterialRegisterModal';
import DidacticMaterialRegisterModal from '../components/modals/DidacticMaterialRegisterModal';
import EquipoRegisterModal from '../components/modals/EquipoRegisterModal';
import RegistrationSelectorModal from '../components/modals/RegistrationSelectorModal';
import QRBatchPrintModal from '../components/modals/QRBatchPrintModal';

export default function SubstancesScreen({ route, navigation }) {
  const { user, role, serverUrl } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const [substances, setSubstances] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7d' | '30d' | '90d'

  // Modal para solicitar préstamo
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  const [selectedSubstance, setSelectedSubstance] = useState(null);
  const [loanQuantity, setLoanQuantity] = useState('1');
  const [loanUserType, setLoanUserType] = useState('Alumno / Estudiante');
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loanNotes, setLoanNotes] = useState('');
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Modales Independientes de Registro
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [showSubstanceModal, setShowSubstanceModal] = useState(false);
  const [showChemMaterialModal, setShowChemMaterialModal] = useState(false);
  const [showDidacticModal, setShowDidacticModal] = useState(false);
  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleSelectRegistrationType = (type) => {
    if (type === 'substances') setShowSubstanceModal(true);
    else if (type === 'chemical_materials') setShowChemMaterialModal(true);
    else if (type === 'didactic_materials') setShowDidacticModal(true);
    else if (type === 'equipos') setShowEquipoModal(true);
  };

  // Modal para registrar nuevo elemento (Sustancia, Material Químico, Didáctico)
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [regType, setRegType] = useState('substances'); // 'substances' | 'chemical_materials' | 'didactic_materials'
  const [formCategory, setFormCategory] = useState('');
  const [formItemStatus, setFormItemStatus] = useState('Disponible');
  const [formName, setFormName] = useState('');
  const [formFormula, setFormFormula] = useState('');
  const [formCas, setFormCas] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formContainerContent, setFormContainerContent] = useState('');
  const [formState, setFormState] = useState('Sólido');
  const [formQuantity, setFormQuantity] = useState('1.0');
  const [formUnit, setFormUnit] = useState('g');
  const [formStockUnits, setFormStockUnits] = useState('1');
  const [formLocation, setFormLocation] = useState('');
  const [formEntryDate, setFormEntryDate] = useState('');
  const [formExpiration, setFormExpiration] = useState('');
  const [formRisks, setFormRisks] = useState('');
  const [formExternalLinks, setFormExternalLinks] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formPhotoUri, setFormPhotoUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal Selector de Fecha (Año, Mes, Día)
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateTargetField, setDateTargetField] = useState('entry'); // 'entry' | 'expiration'
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerDay, setPickerDay] = useState(new Date().getDate());
  const [showMonthYearGrid, setShowMonthYearGrid] = useState(false);

  const openDatePicker = (targetField) => {
    setDateTargetField(targetField);
    const currentDateVal = targetField === 'entry' ? formEntryDate : formExpiration;
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
      setFormEntryDate(formattedDate);
    } else {
      setFormExpiration(formattedDate);
    }
    setDateModalVisible(false);
  };

  const applyMonthYearDate = () => {
    const formattedMonth = pickerMonth < 10 ? `0${pickerMonth}` : `${pickerMonth}`;
    const formattedDate = `${pickerYear}-${formattedMonth}`;

    if (dateTargetField === 'entry') {
      setFormEntryDate(formattedDate);
    } else {
      setFormExpiration(formattedDate);
    }
    setDateModalVisible(false);
  };

  const formatChemicalFormula = (formula) => {
    if (!formula) return '';
    const subscriptsMap = {
      '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
      '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
    };
    return formula.replace(/\d/g, (match) => subscriptsMap[match] || match);
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const getItemDateStringMobile = (s) => {
    const raw = (s.created_at || s.entry_date || '').trim();
    if (!raw) return null;
    const matchISO = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchISO) {
      return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
    }
    const matchLat = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchLat) {
      return `${matchLat[3]}-${matchLat[2]}-${matchLat[1]}`;
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  };

  const getItemDateObjectMobile = (s) => {
    const dateStr = getItemDateStringMobile(s);
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const getAddedDateFormattedMobile = (s) => {
    const d = getItemDateObjectMobile(s);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  };

  const isRecentlyAddedMobile = (s, days = 7) => {
    const itemDateObj = getItemDateObjectMobile(s);
    if (!itemDateObj) return false;
    const now = new Date();
    const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((todayObj.getTime() - itemDateObj.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  };

  const filterByDate = (item, filterKey) => {
    if (!filterKey || filterKey === 'all') return true;
    const itemDateObj = getItemDateObjectMobile(item);
    if (!itemDateObj) return false;

    const now = new Date();
    const todayObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filterKey === 'today') {
      return itemDateObj.getTime() === todayObj.getTime();
    }

    const diffTime = todayObj.getTime() - itemDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (filterKey === '7d') return diffDays >= 0 && diffDays <= 7;
    if (filterKey === '30d') return diffDays >= 0 && diffDays <= 30;
    if (filterKey === '90d') return diffDays >= 0 && diffDays <= 90;

    return true;
  };

  const applyFilters = (list, query, dateKey) => {
    let result = list;
    if (query && query.trim()) {
      const qNorm = normalizeText(query);
      result = result.filter(item => 
        normalizeText(item.name).includes(qNorm) ||
        normalizeText(item.cas_number).includes(qNorm) ||
        normalizeText(item.chemical_formula).includes(qNorm) ||
        normalizeText(item.substance_group).includes(qNorm) ||
        normalizeText(item.responsible).includes(qNorm) ||
        normalizeText(item.location).includes(qNorm)
      );
    }
    if (dateKey && dateKey !== 'all') {
      result = result.filter(item => filterByDate(item, dateKey));
    }
    setFiltered(result);
  };

  const fetchSubstances = async () => {
    try {
      const res = await apiService.getSubstances();
      let list = [];
      if (Array.isArray(res)) {
        list = res;
      } else if (res && Array.isArray(res.data)) {
        list = res.data;
      } else if (res && res.status === 'success' && Array.isArray(res.data)) {
        list = res.data;
      }

      setSubstances(list);
      applyFilters(list, search, dateFilter);
    } catch (e) {
      console.warn("Error al cargar sustancias:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSubstances();
    }, [search])
  );

  useEffect(() => {
    if (route?.params?.openAddModal) {
      if (route.params.initialRegType) {
        setRegType(route.params.initialRegType);
      }
      setAddModalVisible(true);
      navigation.setParams({ openAddModal: false });
    }
  }, [route?.params]);

  const getImageUri = (imagePath) => {
    return getImageUrl(imagePath, serverUrl);
  };

  // Función para capturar o elegir foto con corte cuadrado 1:1
  const pickPhotoSquare = async (fromCamera = false) => {
    try {
      const permRes = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permRes.granted) {
        Alert.alert('Permiso Requerido', 'Se necesitan permisos para acceder a la cámara o galería.');
        return;
      }

      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : 'images',
        allowsEditing: true,
        aspect: [1, 1], // CORTE CUADRADO 1:1 OBLIGATORIO
        quality: 0.6,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Error al seleccionar foto', e.message || 'No se pudo acceder a la cámara o galería.');
    }
  };

  const handleQuickSubmit = async () => {
    if (!formName.trim()) {
      Alert.alert('Campo Obligatorio', 'Ingrese el nombre del elemento a registrar.');
      return;
    }

    setSubmitting(true);
    try {
      let serverImagePath = '';

      // Subir foto si seleccionó una
      if (formPhotoUri) {
        const filename = formPhotoUri.split('/').pop() || 'photo.jpg';
        const formData = new FormData();
        formData.append('photo', {
          uri: formPhotoUri,
          name: filename,
          type: 'image/jpeg'
        });

        try {
          const uploadRes = await apiService.uploadPhoto(formData);
          if (uploadRes && uploadRes.status === 'success') {
            serverImagePath = uploadRes.image_path;
          }
        } catch (uploadErr) {
          console.warn("Advertencia en subida de foto:", uploadErr.message);
        }
      }

      let res;
      if (regType === 'chemical_materials') {
        const payload = {
          name: formName.trim(),
          category: formCategory.trim() || 'General',
          quantity: parseFloat(formQuantity) || 1,
          unit: formUnit.trim() || 'piezas',
          location: formLocation.trim(),
          status: formItemStatus || 'Disponible',
          responsible: user || 'Móvil',
          observations: formObservations.trim(),
          image_path: serverImagePath
        };
        res = await apiService.createChemicalMaterial(payload);
      } else if (regType === 'didactic_materials') {
        const payload = {
          name: formName.trim(),
          category: formCategory.trim() || 'General',
          quantity: parseInt(formQuantity, 10) || 1,
          location: formLocation.trim(),
          status: formItemStatus || 'Disponible',
          responsible: user || 'Móvil',
          observations: formObservations.trim(),
          image_path: serverImagePath
        };
        res = await apiService.createDidacticMaterial(payload);
      } else {
        const payload = {
          name: formName.trim(),
          cas_number: formCas.trim(),
          chemical_formula: formFormula.trim(),
          substance_group: formGroup.trim(),
          container_content: `${formStockUnits || '1'} envase(s) de ${formQuantity || '1'} ${formUnit || 'g'}`.trim(),
          physical_state: formState,
          quantity: parseFloat(formQuantity) || 1.0,
          unit: formUnit.trim() || 'g',
          stock_units: parseInt(formStockUnits, 10) || 1,
          location: formLocation.trim(),
          entry_date: formEntryDate.trim(),
          expiration_date: formExpiration.trim(),
          risks_warnings: formRisks.trim(),
          external_links: formExternalLinks.trim(),
          observations: formObservations.trim(),
          responsible: user || 'Móvil',
          image_path: serverImagePath
        };
        res = await apiService.createSubstance(payload);
      }

      if (res.status === 'success') {
        if (res.pending) {
          Alert.alert('⏳ Solicitud Enviada', res.message || 'La creación requiere aprobación de un administrador.');
        } else {
          Alert.alert(
            '✅ Registro Exitoso',
            'El registro se ha guardado exitosamente en el inventario.'
          );
        }
        setAddModalVisible(false);
        // Limpiar formulario
        setFormName('');
        setFormCas('');
        setFormFormula('');
        setFormGroup('');
        setFormCategory('');
        setFormItemStatus('Disponible');
        setFormContainerContent('');
        setFormQuantity('1.0');
        setFormUnit('g');
        setFormStockUnits('1');
        setFormLocation('');
        setFormEntryDate('');
        setFormExpiration('');
        setFormRisks('');
        setFormExternalLinks('');
        setFormObservations('');
        setFormPhotoUri(null);
        fetchSubstances();
      } else {
        Alert.alert('Error al guardar', res.message || 'No se pudo crear el registro.');
      }
    } catch (err) {
      Alert.alert('Error', 'Ocurrió un error al enviar el registro: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(substances, text, dateFilter);
  };

  const openLoanModal = async (substance) => {
    setSelectedSubstance(substance);
    setLoanQuantity('1');
    setLoanUserType('Alumno / Estudiante');
    setLoanNotes('');
    try {
      const usersRes = await apiService.getRegisteredUsers();
      if (usersRes.status === 'success') {
        setRegisteredUsers(usersRes.data || []);
      }
    } catch (e) {
      console.warn("No se pudieron cargar usuarios registrados:", e.message);
    }
    setLoanModalVisible(true);
  };

  const handleSubstanceLoanSubmit = async () => {
    if (!selectedSubstance) return;
    const reqQty = parseFloat(loanQuantity);
    if (isNaN(reqQty) || reqQty <= 0) {
      Alert.alert('Cantidad Inválida', 'Por favor ingrese una cantidad numérica mayor a 0.');
      return;
    }

    setSubmittingLoan(true);
    try {
      const payload = {
        item_type: 'substances',
        item_id: selectedSubstance.id,
        quantity: reqQty,
        user_type: loanUserType,
        target_user_id: selectedUserId,
        notes: loanNotes.trim()
      };

      const res = await apiService.createLoan(payload);
      if (res.status === 'success') {
        Alert.alert(
          '✅ Préstamo Solicitado Exitosamente',
          'La solicitud de préstamo ha sido registrada.'
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

  const renderSgaBadgesMobile = (substanceGroup) => {
    if (!substanceGroup) return null;
    const isDark = theme.id !== 'light';
    const groups = substanceGroup.split(/[,/;|]/).map(g => g.trim()).filter(Boolean);
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 4 }}>
        {groups.map((group, idx) => {
          const g = group.toLowerCase();
          let bg = isDark ? 'rgba(6, 182, 212, 0.2)' : '#cffafe';
          let border = isDark ? 'rgba(6, 182, 212, 0.5)' : '#67e8f9';
          let textColor = isDark ? '#2dd4bf' : '#164e63';

          if (g.includes('inflam')) {
            bg = isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2';
            border = isDark ? 'rgba(239, 68, 68, 0.5)' : '#fca5a5';
            textColor = isDark ? '#f87171' : '#991b1b';
          } else if (g.includes('tox') || g.includes('venen')) {
            bg = isDark ? 'rgba(168, 85, 247, 0.2)' : '#f3e8ff';
            border = isDark ? 'rgba(168, 85, 247, 0.5)' : '#d8b4fe';
            textColor = isDark ? '#c084fc' : '#581c87';
          } else if (g.includes('corros')) {
            bg = isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7';
            border = isDark ? 'rgba(245, 158, 11, 0.5)' : '#fde68a';
            textColor = isDark ? '#fbbf24' : '#78350f';
          } else if (g.includes('irrit')) {
            bg = isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5';
            border = isDark ? 'rgba(16, 185, 129, 0.5)' : '#6ee7b7';
            textColor = isDark ? '#34d399' : '#064e3b';
          } else if (g.includes('alcoh') || g.includes('solvent')) {
            bg = isDark ? 'rgba(6, 182, 212, 0.2)' : '#cffafe';
            border = isDark ? 'rgba(6, 182, 212, 0.5)' : '#67e8f9';
            textColor = isDark ? '#38bdf8' : '#164e63';
          }

          return (
            <View key={idx} style={{ backgroundColor: bg, borderColor: border, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: textColor, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}>{group}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    let mainPhotoPath = item.image_path || item.photo || item.image;
    if (!mainPhotoPath && item.presentation_images) {
      try {
        const pImgs = typeof item.presentation_images === 'string' ? JSON.parse(item.presentation_images) : item.presentation_images;
        if (Array.isArray(pImgs) && pImgs.length > 0 && pImgs[0].image_path) {
          mainPhotoPath = pImgs[0].image_path;
        }
      } catch (e) {}
    }
    const photoUri = getImageUri(mainPhotoPath);
    const formattedFormula = formatChemicalFormula(item.chemical_formula);
    const isNoExp = item.expiration_date === 'Sin caducidad' || item.expiration_date === 'No aplica';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('Detail', { id: item.id, item: item, type: 'substance' })}
      >
        <View style={styles.cardMainRow}>
          <View style={styles.imageContainer}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.substanceImage} resizeMode="cover" />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                <Text style={{ fontSize: 26 }}>🧪</Text>
              </View>
            )}
            {isNoExp ? (
              <View style={{ position: 'absolute', top: 4, left: 4, backgroundColor: '#0ea5e9', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: '#ffffff', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Sin Caducidad</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.cardHeader}>
              <Text style={{ color: theme.id === 'light' ? '#c2410c' : '#fbbf24', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '900' }}>LAB-SUB-{item.id}</Text>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
              {getAddedDateFormattedMobile(item) ? (
                <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: isRecentlyAddedMobile(item, 7) ? '#059669' : theme.subtext }}>
                    🗓️ Agregado: {getAddedDateFormattedMobile(item)} {isRecentlyAddedMobile(item, 7) ? '✨ (Nuevo)' : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {item.chemical_formula ? (
              <Text style={[styles.formula, { color: theme.brand }]}>Fórmula: {formattedFormula}</Text>
            ) : null}

            {item.cas_number ? (
              <Text style={[styles.meta, { color: theme.subtext }]}>CAS: {item.cas_number}</Text>
            ) : null}

            {renderSgaBadgesMobile(item.substance_group)}

            <View style={styles.cardFooter}>
              <View style={[styles.quantityBadge, { backgroundColor: theme.id === 'light' ? '#f1f5f9' : 'rgba(15, 23, 42, 0.9)', borderColor: theme.cardBorder }]}>
                <Text style={[styles.quantityText, { color: theme.text }]}>📦 {item.container_content || `${item.stock_units || 1} envase(s) (${item.quantity || 1} ${item.unit || 'g'})`}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={{ marginBottom: 12 }}>
        {/* Fila Superior: Buscador Ancho Completo */}
        <View style={[styles.searchBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, marginBottom: 4 }]}>
          <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { flex: 1, color: theme.text }]}
            placeholder="Buscar por nombre, CAS, fórmula..."
            value={search}
            onChangeText={handleSearch}
            placeholderTextColor={theme.subtext}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
              <Text style={{ color: theme.subtext, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Chips de Filtro por Fecha de Agregado */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'today', label: '🆕 Agregados Hoy' },
            { id: '7d', label: '📅 Últimos 7 días' },
            { id: '30d', label: '📅 Últimos 30 días' },
            { id: '90d', label: '📅 Últimos 90 días' }
          ].map((chip) => {
            const isActive = dateFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                onPress={() => {
                  setDateFilter(chip.id);
                  applyFilters(substances, search, chip.id);
                }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  backgroundColor: isActive ? (theme.id === 'light' ? '#0d9488' : '#14b8a6') : (theme.id === 'light' ? '#e2e8f0' : 'rgba(30, 41, 59, 0.8)'),
                  borderWidth: 1,
                  borderColor: isActive ? '#0d9488' : (theme.id === 'light' ? '#cbd5e1' : 'rgba(51, 65, 85, 0.8)')
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#ffffff' : theme.text }}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Fila Inferior: Botones de Acción */}
        {(role === 'admin' || role === 'responsable') ? (
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <TouchableOpacity style={[styles.qrBtnHeader, { backgroundColor: 'rgba(20, 184, 166, 0.2)', borderColor: 'rgba(20, 184, 166, 0.4)' }]} onPress={() => setShowQRModal(true)}>
              <Text style={[styles.qrBtnHeaderText, { color: '#2dd4bf' }]}>🖨️ QR Masivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtnHeader, { backgroundColor: theme.brand }]} onPress={() => setShowSelectorModal(true)}>
              <Text style={styles.addBtnHeaderText}>+ Registrar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubstances(); }} tintColor="#38bdf8" />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron sustancias químicas.</Text>
          }
        />
      )}

      {/* MODAL IMPRESIÓN Y DESCARGA MASIVA CÓDIGOS QR */}
      <QRBatchPrintModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        substances={substances}
        serverUrl={serverUrl}
      />

      {/* MODAL DE REGISTRO MULTITIPO (SUSTANCIAS, MAT. QUÍMICO, DIDÁCTICO) */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {regType === 'substances' ? '🧪 Registrar Sustancia' : (regType === 'chemical_materials' ? '💧 Registrar Mat. Químico' : '🎓 Registrar Mat. Didáctico')}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* PESTAÑAS DE TIPO DE REGISTRO */}
            <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 12, padding: 4, marginBottom: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: regType === 'substances' ? '#0284c7' : 'transparent' }}
                onPress={() => setRegType('substances')}
              >
                <Text style={{ color: regType === 'substances' ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 'bold' }}>🧪 Sustancia</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: regType === 'chemical_materials' ? '#0284c7' : 'transparent' }}
                onPress={() => setRegType('chemical_materials')}
              >
                <Text style={{ color: regType === 'chemical_materials' ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 'bold' }}>💧 Mat. Químico</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: regType === 'didactic_materials' ? '#0284c7' : 'transparent' }}
                onPress={() => setRegType('didactic_materials')}
              >
                <Text style={{ color: regType === 'didactic_materials' ? '#fff' : '#94a3b8', fontSize: 11, fontWeight: 'bold' }}>🎓 Didáctico</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              {/* CAMPO NOMBRE COMÚN A TODOS */}
              <Text style={styles.inputLabel}>
                {regType === 'substances' ? 'Nombre del Compuesto *' : (regType === 'chemical_materials' ? 'Nombre del Material Químico *' : 'Nombre del Material Didáctico *')}
              </Text>
              <TextInput 
                style={styles.input} 
                value={formName} 
                onChangeText={setFormName} 
                placeholder={regType === 'substances' ? 'Ej. Ácido Clorhídrico' : (regType === 'chemical_materials' ? 'Ej. Matraz Erlenmeyer 250ml' : 'Ej. Modelo Atómico de Bohr')} 
                placeholderTextColor="#64748b" 
              />

              {regType === 'substances' ? (
                <>
                  <Text style={styles.inputLabel}>Fórmula Química</Text>
                  <TextInput style={styles.input} value={formFormula} onChangeText={setFormFormula} placeholder="Ej. HCl" placeholderTextColor="#64748b" />

                  <Text style={styles.inputLabel}>Número CAS</Text>
                  <TextInput style={styles.input} value={formCas} onChangeText={setFormCas} placeholder="Ej. 7647-01-0" placeholderTextColor="#64748b" />

                  <Text style={styles.inputLabel}>Grupo SGA / Almacenamiento</Text>
                  <TextInput style={styles.input} value={formGroup} onChangeText={setFormGroup} placeholder="Ej. Grupo 8 Corrosivos" placeholderTextColor="#64748b" />

                  <Text style={styles.inputLabel}>Estado Físico</Text>
                  <View style={styles.stateSelector}>
                    {['Líquido', 'Sólido', 'Gaseoso', 'Solución'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[styles.stateOption, formState === st && styles.stateOptionActive]}
                        onPress={() => setFormState(st)}
                      >
                        <Text style={[styles.stateOptionText, formState === st && styles.stateOptionTextActive]}>{st}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={{ backgroundColor: '#0f172a', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#334155', marginVertical: 10, gap: 12 }}>
                    <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '800' }}>
                      📦 Cantidad y Stock en Inventario
                    </Text>

                    <View>
                      <Text style={styles.inputLabel}>1. Número de Envases / Frascos en Stock</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                        <TouchableOpacity
                          style={styles.pickerStepBtn}
                          onPress={() => {
                            const val = parseInt(formStockUnits, 10) || 1;
                            setFormStockUnits(Math.max(1, val - 1).toString());
                          }}
                        >
                          <Text style={styles.pickerStepBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold' }]}
                          keyboardType="number-pad"
                          value={formStockUnits}
                          onChangeText={setFormStockUnits}
                          placeholder="1"
                          placeholderTextColor="#64748b"
                        />
                        <TouchableOpacity
                          style={styles.pickerStepBtn}
                          onPress={() => {
                            const val = parseInt(formStockUnits, 10) || 1;
                            setFormStockUnits((val + 1).toString());
                          }}
                        >
                          <Text style={styles.pickerStepBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View>
                      <Text style={styles.inputLabel}>2. Contenido / Cantidad por Envase</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={formQuantity}
                        onChangeText={setFormQuantity}
                        placeholder="Ej. 500"
                        placeholderTextColor="#64748b"
                      />
                    </View>

                    <View>
                      <Text style={styles.inputLabel}>3. Unidad de Medida</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                        {['g', 'mL', 'kg', 'L', 'piezas', 'solución'].map((u) => (
                          <TouchableOpacity
                            key={u}
                            style={{
                              backgroundColor: formUnit === u ? '#0284c7' : '#1e293b',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: formUnit === u ? '#38bdf8' : '#334155',
                            }}
                            onPress={() => setFormUnit(u)}
                          >
                            <Text style={{ color: formUnit === u ? '#ffffff' : '#cbd5e1', fontSize: 12, fontWeight: 'bold' }}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Fecha de Ingreso / Compra</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={formEntryDate}
                      onChangeText={setFormEntryDate}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor="#64748b"
                    />
                    <TouchableOpacity style={styles.datePickerTriggerBtn} onPress={() => openDatePicker('entry')}>
                      <Text style={styles.datePickerTriggerBtnText}>📅 Fecha</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Fecha de Caducidad</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={formExpiration}
                      onChangeText={setFormExpiration}
                      placeholder="AAAA-MM-DD"
                      placeholderTextColor="#64748b"
                    />
                    <TouchableOpacity style={styles.datePickerTriggerBtn} onPress={() => openDatePicker('expiration')}>
                      <Text style={styles.datePickerTriggerBtnText}>📅 Fecha</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Riesgos y Advertencias SGA</Text>
                  <TextInput style={styles.input} value={formRisks} onChangeText={setFormRisks} placeholder="Ej. H314 Provoca quemaduras..." placeholderTextColor="#64748b" />
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Categoría</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formCategory} 
                    onChangeText={setFormCategory} 
                    placeholder={regType === 'chemical_materials' ? 'Ej. Vidriería, Equipos...' : 'Ej. Modelos, Muestras...'} 
                    placeholderTextColor="#64748b" 
                  />

                  <Text style={styles.inputLabel}>Estado / Condición</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {['Excelente', 'Bueno', 'Regular', 'Dañado', 'Disponible'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={{
                          backgroundColor: formItemStatus === st ? '#0284c7' : '#1e293b',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: formItemStatus === st ? '#38bdf8' : '#334155',
                        }}
                        onPress={() => setFormItemStatus(st)}
                      >
                        <Text style={{ color: formItemStatus === st ? '#ffffff' : '#cbd5e1', fontSize: 12, fontWeight: 'bold' }}>{st}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>Cantidad</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={formQuantity} 
                    onChangeText={setFormQuantity} 
                    placeholder="1" 
                    placeholderTextColor="#64748b" 
                  />

                  {regType === 'chemical_materials' ? (
                    <>
                      <Text style={styles.inputLabel}>Unidad</Text>
                      <TextInput style={styles.input} value={formUnit} onChangeText={setFormUnit} placeholder="Ej. piezas, juego, kit" placeholderTextColor="#64748b" />
                    </>
                  ) : null}
                </>
              )}

              <Text style={styles.inputLabel}>Ubicación / Estante</Text>
              <TextInput style={styles.input} value={formLocation} onChangeText={setFormLocation} placeholder="Ej. Estante A-1" placeholderTextColor="#64748b" />

              <Text style={styles.inputLabel}>Observaciones</Text>
              <TextInput style={[styles.input, { height: 65, textAlignVertical: 'top' }]} multiline value={formObservations} onChangeText={setFormObservations} />

              <Text style={styles.inputLabel}>Fotografía Principal (1:1)</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 6 }}>
                <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1 }]} onPress={() => pickPhotoSquare(true)}>
                  <Text style={styles.photoPickerBtnText}>📷 Cámara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoPickerBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => pickPhotoSquare(false)}>
                  <Text style={styles.photoPickerBtnText}>🖼️ Galería</Text>
                </TouchableOpacity>
              </View>

              {formPhotoUri ? (
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Image source={{ uri: formPhotoUri }} style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: '#10b981' }} />
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.submitLoanBtn, submitting && { opacity: 0.6 }]}
                disabled={submitting}
                onPress={handleQuickSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.submitLoanBtnText}>💾 Registrar Sustancia</Text>
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
                    style={[styles.applyDateBtn, { flex: 1.2, backgroundColor: '#431407', borderColor: '#ea580c', borderWidth: 1 }]}
                    onPress={() => {
                      setFormExpiration('Sin caducidad');
                      setDateModalVisible(false);
                    }}
                  >
                    <Text style={[styles.applyDateBtnText, { color: '#fdba74' }]}>✨ Sin Caducidad</Text>
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

      {/* Selector Independiente de Registro */}
      <RegistrationSelectorModal
        visible={showSelectorModal}
        onClose={() => setShowSelectorModal(false)}
        onSelectType={handleSelectRegistrationType}
      />

      {/* Modales Formulario Independientes */}
      <SubstanceRegisterModal
        visible={showSubstanceModal}
        onClose={() => setShowSubstanceModal(false)}
        onSuccess={fetchSubstances}
      />

      <ChemicalMaterialRegisterModal
        visible={showChemMaterialModal}
        onClose={() => setShowChemMaterialModal(false)}
        onSuccess={fetchSubstances}
      />

      <DidacticMaterialRegisterModal
        visible={showDidacticModal}
        onClose={() => setShowDidacticModal(false)}
        onSuccess={fetchSubstances}
      />

      <EquipoRegisterModal
        visible={showEquipoModal}
        onClose={() => setShowEquipoModal(false)}
        onSuccess={fetchSubstances}
      />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
  },
  addBtnHeader: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
  },
  addBtnHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  qrBtnHeader: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  qrBtnHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  substanceImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  formula: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 2,
  },
  meta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  quantityBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  quantityText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  groupBadgeTag: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  groupBadgeTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  location: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
    maxWidth: '60%',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  stateOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
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
  noExpirationBtn: {
    backgroundColor: '#431407',
    borderColor: '#ea580c',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  noExpirationBtnText: {
    color: '#fdba74',
    fontSize: 11,
    fontWeight: '700',
  },
  photoPickerBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoPickerBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  submitLoanBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  submitLoanBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  pickerStepBtn: {
    backgroundColor: '#1e293b',
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickerStepBtnText: {
    color: '#38bdf8',
    fontSize: 20,
    fontWeight: '800',
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
});
