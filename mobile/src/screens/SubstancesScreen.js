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
  Platform,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

import GlassBackground from '../components/GlassBackground';
import GlassCard from '../components/GlassCard';

export default function SubstancesScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const { user, role, serverUrl, syncSignal } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme.isDark !== false;

  const textColor = isDark ? '#ffffff' : '#0f172a';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? 'rgba(10, 20, 38, 0.84)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(34, 211, 238, 0.28)' : 'rgba(6, 182, 212, 0.35)';
  const pillBg = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.92)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';

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
  const [selectedUserName, setSelectedUserName] = useState('');
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

  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(substances, text, dateFilter);
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
    }, [])
  );

  useEffect(() => {
    fetchSubstances();
  }, [syncSignal]);

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

  const openLoanModal = (substance) => {
    setSelectedSubstance(substance);
    setLoanQuantity('1');
    setLoanUserType('Responsable');
    setLoanNotes('');
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
        borrower_name: user || 'Docente',
        borrower_user_id: 0,
        notes: loanNotes.trim(),
        items_list: [
          {
            id: selectedSubstance.id,
            name: selectedSubstance.name,
            quantity: reqQty,
            unit: selectedSubstance.unit || 'mL',
            type: 'substance'
          }
        ]
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
            border = isDark ? 'rgba(245, 158, 11, 0.5)' : '#fcd34d';
            textColor = isDark ? '#fbbf24' : '#92400e';
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
              <Text style={{ color: textColor, fontSize: 10, fontWeight: '700' }}>{group}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const resolveItemPhoto = (item) => {
    let mainPhotoPath = item.image_path || item.photo || item.image || item.photo_url;
    if (!mainPhotoPath && item.presentation_images) {
      try {
        const pImgs = typeof item.presentation_images === 'string' ? JSON.parse(item.presentation_images) : item.presentation_images;
        if (Array.isArray(pImgs) && pImgs.length > 0 && pImgs[0].image_path) {
          mainPhotoPath = pImgs[0].image_path;
        }
      } catch (e) {}
    }
    return getImageUrl(mainPhotoPath, serverUrl);
  };

  const renderSubstanceCard = ({ item }) => {
    const photoUri = resolveItemPhoto(item);
    const formattedFormula = formatChemicalFormula ? formatChemicalFormula(item.chemical_formula) : (item.chemical_formula || 'Sin fórmula');
    const isNoExp = item.expiration_date === 'Sin caducidad' || item.expiration_date === 'No aplica';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('Detail', { id: item.id, item: item, type: 'substance' })}
        style={{ marginBottom: 14 }}
      >
        <GlassCard style={[styles.substanceItemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          {/* Top Row: Badge y Caducidad */}
          <View style={styles.itemHeaderTopRow}>
            <View style={styles.codeBadgePill}>
              <Text style={styles.codeBadgePillText}>LAB-SUB-{item.id}</Text>
            </View>

            {isNoExp ? (
              <View style={styles.noExpPill}>
                <Text style={styles.noExpPillText}>Sin Caducidad</Text>
              </View>
            ) : null}
          </View>

          {/* Nombre de la Sustancia en Grande (Legible en Claro y Oscuro) */}
          <Text style={[styles.itemSubstanceName, { color: textColor }]} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Fila Principal: Imagen a la Izquierda + Detalles a la Derecha */}
          <View style={styles.itemBodyRow}>
            <View style={[styles.itemImageContainer, { borderColor: cardBorder, backgroundColor: isDark ? '#071526' : '#f1f5f9' }]}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.substanceImage} resizeMode="cover" />
              ) : (
                <View style={[styles.placeholderImage, { backgroundColor: isDark ? 'rgba(15, 30, 56, 0.8)' : 'rgba(226, 232, 240, 0.95)' }]}>
                  <Text style={{ fontSize: 32 }}>🧪</Text>
                </View>
              )}
            </View>

            <View style={styles.itemDetailsCol}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: subtextColor }]}>Fórmula:</Text>
                <Text style={[styles.fieldValueFormula, { color: isDark ? '#22d3ee' : '#0891b2' }]} numberOfLines={1}>{formattedFormula}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: subtextColor }]}>Ubicación:</Text>
                <Text style={[styles.fieldValueText, { color: textColor }]} numberOfLines={1}>{item.location || 'Estante A/B'}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: subtextColor }]}>Stock:</Text>
                <Text style={[styles.fieldValueStock, { color: isDark ? '#38bdf8' : '#0284c7' }]}>
                  📦 {item.stock || item.quantity || '250'} {item.unit || 'mL'}
                </Text>
              </View>
            </View>
          </View>

          {/* Insignias SGA */}
          {renderSgaBadgesMobile(item.substance_group)}

          {/* Botones de Acción Neumórficos con Soporte de Tema */}
          <View style={[styles.cardActionButtonsRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }]}>
            <TouchableOpacity
              style={[styles.cardNeumorphActionBtn, { backgroundColor: isDark ? 'rgba(18, 38, 68, 0.85)' : 'rgba(241, 245, 249, 0.95)', borderColor: cardBorder }]}
              onPress={() => navigation.navigate('Detail', { id: item.id, item: item, type: 'substance' })}
            >
              <Text style={[styles.cardNeumorphBtnText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>📋 Datos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardNeumorphActionBtn, { backgroundColor: isDark ? 'rgba(18, 38, 68, 0.85)' : 'rgba(241, 245, 249, 0.95)', borderColor: cardBorder }]}
              onPress={() => navigation.navigate('Detail', { id: item.id, item: item, type: 'substance' })}
            >
              <Text style={[styles.cardNeumorphBtnText, { color: isDark ? '#38bdf8' : '#0284c7' }]}>✏️ Editar</Text>
            </TouchableOpacity>

            {role !== 'estudiante' ? (
              <TouchableOpacity
                style={[styles.cardNeumorphActionBtn, { borderColor: isDark ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.60)', backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.12)' }]}
                onPress={() => openLoanModal(item)}
              >
                <Text style={[styles.cardNeumorphBtnText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>🤝 Prestar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const renderItem = renderSubstanceCard;

  return (
    <GlassBackground>
      {/* 1. BARRA SUPERIOR ELEGANTE Y COMPACTA */}
      <View style={[styles.topHeader, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerLogoBox}>
          <View style={[styles.headerFlaskBadge, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)', borderColor: cardBorder }]}>
            <Text style={styles.headerFlaskIcon}>⚗️</Text>
          </View>
          <View>
            <Text style={[styles.headerLogoTitle, { color: textColor }]}>ITMA II</Text>
            <Text style={[styles.headerLogoSubtitle, { color: subtextColor }]}>Laboratorio</Text>
          </View>
        </View>

        {/* Título de Pantalla al Costado (Sin emojis y perfectamente integrado) */}
        <View style={[
          styles.screenTitleBadgePill, 
          { 
            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(6, 182, 212, 0.10)', 
            borderColor: isDark ? 'rgba(34, 211, 238, 0.35)' : 'rgba(6, 182, 212, 0.35)' 
          }
        ]}>
          <Text style={[styles.screenTitleBadgeText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>
            Sustancias y Reactivos
          </Text>
        </View>
      </View>

      <View style={styles.container}>
        <View style={{ marginBottom: 10, marginTop: -2 }}>
          {/* Fila Superior: Buscador Ancho Completo */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(13, 26, 48, 0.75)' : 'rgba(241, 245, 249, 0.90)', borderColor: cardBorder, marginBottom: 8 }]}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { flex: 1, color: textColor }]}
              placeholder="Buscar por nombre, CAS, fórmula..."
              value={search}
              onChangeText={handleSearch}
              placeholderTextColor={subtextColor}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search ? (
              <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 4 }}>
                <Text style={{ color: subtextColor, fontSize: 14, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Chips de Filtro y Botones de Acción */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6, paddingRight: 6 }}>
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
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 14,
                      backgroundColor: isActive ? (isDark ? '#06b6d4' : '#0891b2') : pillBg,
                      borderWidth: 1,
                      borderColor: isActive ? (isDark ? '#22d3ee' : '#0891b2') : cardBorder
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isActive ? '#ffffff' : textColor }}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {(role === 'admin' || role === 'responsable') ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[styles.qrBtnHeader, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.12)', borderColor: cardBorder }]} onPress={() => setShowQRModal(true)}>
                  <Text style={[styles.qrBtnHeaderText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>🖨️ QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBtnHeader} onPress={() => setShowSelectorModal(true)}>
                  <Text style={styles.addBtnHeaderText}>+ Registrar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={isDark ? '#22d3ee' : '#0891b2'} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSubstanceCard}
            contentContainerStyle={styles.listContainer}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubstances(); }} tintColor={isDark ? '#22d3ee' : '#0891b2'} />}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: subtextColor }]}>No se encontraron sustancias químicas.</Text>
            }
          />
        )}
      </View>

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

      {/* Modal de Solicitud de Préstamo de Sustancia */}
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

            {selectedSubstance ? (
              <ScrollView style={{ maxHeight: 440 }}>
                <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#334155', marginBottom: 12 }}>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>{selectedSubstance.name}</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                    Stock Disponible: {selectedSubstance.stock_units || selectedSubstance.quantity || 1} {selectedSubstance.unit || 'unidades'}
                  </Text>
                </View>

                <View style={{ backgroundColor: 'rgba(234, 179, 8, 0.12)', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(234, 179, 8, 0.35)' }}>
                  <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: 'bold' }}>
                    ⏳ La solicitud se enviará a los Administradores para su aprobación.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Cantidad / Unidades *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={loanQuantity}
                  onChangeText={setLoanQuantity}
                  placeholder="1"
                  placeholderTextColor="#64748b"
                />

                <Text style={styles.inputLabel}>Solicitante / Responsable *</Text>
                <View style={{ backgroundColor: '#0f172a', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(6, 182, 212, 0.2)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '800' }}>{user || 'Docente'}</Text>
                    <Text style={{ color: '#22d3ee', fontSize: 11, fontWeight: '600' }}>Perfil con Sesión Activa</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                    <Text style={{ color: '#34d399', fontSize: 10, fontWeight: '800' }}>ACTUAL</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>Motivo / Observaciones del Préstamo</Text>
                <TextInput
                  style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Ej. Práctica #4 de laboratorio..."
                  placeholderTextColor="#64748b"
                  value={loanNotes}
                  onChangeText={setLoanNotes}
                />

                <TouchableOpacity
                  style={[styles.applyDateBtn, { backgroundColor: '#06b6d4', marginTop: 10, opacity: submittingLoan ? 0.6 : 1 }]}
                  disabled={submittingLoan}
                  onPress={handleSubstanceLoanSubmit}
                >
                  <Text style={styles.applyDateBtnText}>
                    {submittingLoan ? 'Enviando Solicitud...' : '🤝 Confirmar Solicitud'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
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
    paddingBottom: 8,
    zIndex: 10,
  },
  headerLogoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerFlaskBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  headerFlaskIcon: {
    fontSize: 22,
  },
  headerLogoTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerLogoSubtitle: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: -2,
  },
  screenTitleBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  screenTitleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 4,
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
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.2,
  },
  searchInput: {
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  addBtnHeader: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnHeaderText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  qrBtnHeader: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  qrBtnHeaderText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 120,
  },
  substanceItemCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: 'rgba(10, 24, 46, 0.82)',
    borderWidth: 1.2,
    borderColor: 'rgba(34, 211, 238, 0.28)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  itemHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  codeBadgePill: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.40)',
  },
  codeBadgePillText: {
    color: '#fbbf24',
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  noExpPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  noExpPillText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemDateLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  itemSubstanceName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 10,
  },
  itemBodyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemImageContainer: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#071526',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.3)',
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
    backgroundColor: 'rgba(15, 30, 56, 0.6)',
  },
  itemDetailsCol: {
    flex: 1,
    gap: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    width: 64,
  },
  fieldValueFormula: {
    color: '#22d3ee',
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
  },
  fieldValueText: {
    color: '#f8fafc',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  fieldValueStock: {
    color: '#38bdf8',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  cardActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardNeumorphActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(18, 38, 68, 0.85)',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.22)',
  },
  cardNeumorphBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
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
