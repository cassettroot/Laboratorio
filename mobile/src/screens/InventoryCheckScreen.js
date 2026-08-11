import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator,
  StyleSheet, Modal, TextInput, ScrollView, Vibration
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiService } from '../api/services';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const CATEGORIES = [
  { key: 'substances',         label: 'Reactivos y Sustancias',  icon: '🧪', stockField: 'stock_units' },
  { key: 'chemical_materials', label: 'Materiales Químicos',     icon: '📦', stockField: 'quantity'    },
  { key: 'didactic_materials', label: 'Materiales Didácticos',   icon: '📐', stockField: 'quantity'    },
  { key: 'equipos',            label: 'Bienes y Equipos',        icon: '🖥️', stockField: 'quantity'    },
];

export default function InventoryCheckScreen({ navigation }) {
  const { theme } = useContext(ThemeContext);
  const { updateServerUrl } = useContext(AuthContext) || {};
  const [phase, setPhase] = useState('select'); // 'select' | 'checking' | 'done'
  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cooldown, setCooldown] = useState(false);
  const [activity, setActivity] = useState([]);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  // Dialogs
  const [extraDialog, setExtraDialog]   = useState(null); // {item, table}
  const [unknownDialog, setUnknownDialog] = useState(null); // {code}

  const addActivity = (msg, type = 'info') => {
    setActivity(prev => [{ msg, type, id: Date.now() }, ...prev].slice(0, 15));
  };

  // ── Cargar lista ─────────────────────────────────────────────
  const loadCategory = async (cat) => {
    setLoading(true);
    try {
      const res = await apiService.getCheckList(cat.key);
      if (res.status !== 'success') throw new Error(res.message);
      const sf = cat.stockField;
      const mapped = res.data.map(item => ({
        id:       item.id,
        name:     item.name,
        stock:    Math.max(1, parseInt(item[sf]) || 1),
        scanned:  0,
        checked:  false,
        qr:       item.qr_content || '',
        inv_num:  item.inventory_number || item.serial_number || '',
        location: item.location || '',
        _table:   cat.key,
      }));
      setItems(mapped);
      setCategory(cat);
      setPhase('checking');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Procesar escaneo ─────────────────────────────────────────
  const processScan = async (rawCode) => {
    const code = (rawCode || '').trim();
    if (!code || cooldown) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1200);

    try {
      // Detección especial de QR de vinculación de servidor
      let isPairing = false;
      let pUrl = null;
      try {
        const parsed = JSON.parse(code);
        if (parsed && (parsed.type === 'server_pairing' || parsed.url || parsed.server_url)) {
          isPairing = true;
          pUrl = parsed.url || parsed.server_url;
        }
      } catch (e) {}

      if (isPairing && pUrl) {
        if (typeof updateServerUrl === 'function') await updateServerUrl(pUrl);
        Alert.alert('Servidor Vinculado 📲⚡', `La dirección del servidor se ha actualizado a:\n\n${pUrl}`);
        return;
      }

      const res = await apiService.resolveCheckScan(code);

      if (res.status === 'not_found') {
        Vibration.vibrate([100, 100, 100]);
        setUnknownDialog({ code });
        return;
      }
      if (res.status !== 'success') {
        addActivity(`❌ ${res.message}`, 'error');
        return;
      }

      const resolvedId = res.data.id;
      const resolvedTable = res.table;

      setItems(prev => {
        const idx = prev.findIndex(i => i.id === resolvedId);
        if (idx === -1) {
          addActivity(`⚠️ "${res.data.name}" no pertenece a esta categoría`, 'warn');
          return prev;
        }
        const item = { ...prev[idx] };
        if (item.scanned < item.stock) {
          item.scanned++;
          item.checked = item.scanned >= item.stock;
          Vibration.vibrate(item.checked ? [0, 80, 40, 80] : 50);
          if (item.checked) {
            addActivity(`✅ ${item.name} — COMPLETO`, 'success');
          } else {
            addActivity(`🔄 ${item.name} — ${item.scanned}/${item.stock}`, 'info');
          }
          const newItems = [...prev];
          newItems[idx] = item;
          return newItems;
        } else {
          // Ya completo → preguntar si es unidad extra
          setExtraDialog({ item, table: resolvedTable });
          return prev;
        }
      });
    } catch (e) {
      addActivity(`❌ Error: ${e.message}`, 'error');
    }
  };

  // ── Agregar unidad extra ─────────────────────────────────────
  const confirmAddExtra = async () => {
    if (!extraDialog) return;
    const { item, table } = extraDialog;
    setExtraDialog(null);
    try {
      const res = await apiService.addCheckStock(table, item.id);
      if (res.status === 'success') {
        setItems(prev => {
          const idx = prev.findIndex(i => i.id === item.id);
          if (idx === -1) return prev;
          const updated = { ...prev[idx] };
          updated.stock++;
          updated.scanned++;
          updated.checked = updated.scanned >= updated.stock;
          const newItems = [...prev];
          newItems[idx] = updated;
          return newItems;
        });
        addActivity(`✅ Stock de "${item.name}" actualizado`, 'success');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ── Finalizar ────────────────────────────────────────────────
  const finish = async () => {
    setScannerActive(false);
    const total   = items.reduce((s, i) => s + i.stock, 0);
    const checked = items.reduce((s, i) => s + Math.min(i.scanned, i.stock), 0);
    const missing = items.filter(i => i.scanned < i.stock).map(i => i.id);
    try {
      await apiService.saveCheckSession(category.key, total, checked, missing);
    } catch(e) {}
    setPhase('done');
  };

  // ── Reset ────────────────────────────────────────────────────
  const reset = () => {
    setScannerActive(false);
    setItems([]);
    setCategory(null);
    setActivity([]);
    setPhase('select');
  };

  // ── Progreso ─────────────────────────────────────────────────
  const total    = items.reduce((s, i) => s + i.stock, 0);
  const checked  = items.reduce((s, i) => s + Math.min(i.scanned, i.stock), 0);
  const pct      = total > 0 ? Math.round((checked / total) * 100) : 0;
  const missing  = items.filter(i => i.scanned < i.stock);

  const s = styles(theme);

  // ════════════════════════════════════════════════════════════
  // RENDER: Selección de categoría
  // ════════════════════════════════════════════════════════════
  if (phase === 'select') {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={s.headerCard}>
          <Text style={s.headerTitle}>📋 Chequeo de Inventario</Text>
          <Text style={s.headerSub}>Selecciona la categoría para hacer el pase de lista</Text>
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            💡 Escanea cada QR para marcarlo. Si el QR corresponde a un ítem ya completo, se te preguntará si hay una unidad extra física.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.brand} style={{ marginTop: 40 }} />
        ) : (
          CATEGORIES.map(cat => (
            <TouchableOpacity key={cat.key} style={s.catCard} onPress={() => loadCategory(cat)}>
              <Text style={{ fontSize: 32 }}>{cat.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.catLabel}>{cat.label}</Text>
                <Text style={s.catSub}>Iniciar pase de lista</Text>
              </View>
              <Text style={{ color: theme.subtext, fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Sesión activa
  // ════════════════════════════════════════════════════════════
  if (phase === 'checking') {
    return (
      <View style={s.container}>
        {/* Progress bar */}
        <View style={s.progressBar}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={s.progressLabel}>{category?.label}</Text>
              <Text style={s.progressPct}>{pct}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : theme.brand }]} />
            </View>
            <Text style={s.progressSub}>{checked}/{total} unidades</Text>
          </View>
          <TouchableOpacity onPress={finish} style={s.finishBtn}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>🏁 Fin</Text>
          </TouchableOpacity>
        </View>

        {/* Escáner */}
        {scannerActive && permission?.granted ? (
          <View style={s.cameraBox}>
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              onBarcodeScanned={cooldown ? undefined : ({ data }) => processScan(data)}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />
            <View style={s.cameraOverlay}>
              <View style={s.scanFrame} />
            </View>
            <TouchableOpacity style={s.stopCamBtn} onPress={() => setScannerActive(false)}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>⏹ Detener</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.cameraPlaceholder}>
            <TouchableOpacity style={s.startCamBtn}
              onPress={async () => {
                if (!permission?.granted) await requestPermission();
                setScannerActive(true);
              }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>📷 Activar Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.manualBtn} onPress={() => setShowManual(true)}>
              <Text style={{ color: theme.brand, fontWeight: '700', fontSize: 13 }}>⌨️ Ingresar código manual</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de ítems */}
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, gap: 6 }}
          renderItem={({ item }) => {
            const done = item.scanned >= item.stock;
            return (
              <View style={[s.itemCard, done && s.itemCardDone]}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{done ? '✅' : item.scanned > 0 ? '🔄' : '⬜'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName} numberOfLines={2}>{item.name}</Text>
                  {item.inv_num ? <Text style={s.itemSub}>{item.inv_num}</Text> : null}
                </View>
                <Text style={[s.itemCount, done && { color: '#10b981' }]}>
                  {Math.min(item.scanned, item.stock)}/{item.stock}
                </Text>
              </View>
            );
          }}
        />

        {/* Feed de actividad reciente */}
        {activity.length > 0 && (
          <View style={s.activityFeed}>
            <Text style={s.activityLabel}>Actividad reciente</Text>
            {activity.slice(0, 4).map(a => (
              <Text key={a.id} style={[s.activityItem,
                a.type === 'success' && { color: '#10b981' },
                a.type === 'error'   && { color: '#ef4444' },
                a.type === 'warn'    && { color: '#f59e0b' },
              ]}>
                {a.msg}
              </Text>
            ))}
          </View>
        )}

        {/* Modal manual */}
        <Modal visible={showManual} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Ingresar código QR</Text>
              <TextInput
                style={s.modalInput}
                placeholder="Ej. LAB-SUB-12"
                value={manualCode}
                onChangeText={setManualCode}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={s.modalCancel} onPress={() => { setShowManual(false); setManualCode(''); }}>
                  <Text style={{ fontWeight: '700', color: theme.subtext }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalConfirm, { backgroundColor: theme.brand }]}
                  onPress={() => { setShowManual(false); processScan(manualCode); setManualCode(''); }}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Buscar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Dialog: unidad extra */}
        <Modal visible={!!extraDialog} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>➕</Text>
              <Text style={s.modalTitle}>Unidad Extra Detectada</Text>
              <Text style={s.modalBody}>
                <Text style={{ fontWeight: '700' }}>{extraDialog?.item?.name}</Text>
                {' '}ya tiene su stock de{' '}
                <Text style={{ fontWeight: '700' }}>{extraDialog?.item?.stock} unidad(es)</Text> completo.{'\n\n'}
                ¿Existe una unidad física adicional y deseas agregarla al stock?
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setExtraDialog(null)}>
                  <Text style={{ fontWeight: '700', color: theme.subtext }}>Ignorar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalConfirm, { backgroundColor: '#10b981' }]} onPress={confirmAddExtra}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Sí, agregar +1</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Dialog: QR desconocido */}
        <Modal visible={!!unknownDialog} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>❓</Text>
              <Text style={s.modalTitle}>QR No Reconocido</Text>
              <Text style={s.modalBody}>
                El código{' '}
                <Text style={{ fontFamily: 'monospace', fontWeight: '700' }}>{unknownDialog?.code}</Text>
                {' '}no existe en el inventario.{'\n\n'}
                ¿Es un artículo nuevo que se debe registrar?
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setUnknownDialog(null)}>
                  <Text style={{ fontWeight: '700', color: theme.subtext }}>Ignorar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalConfirm, { backgroundColor: theme.brand }]}
                  onPress={() => { setUnknownDialog(null); Alert.alert('Nuevo ítem', 'Ve a la sección correspondiente y crea el nuevo registro.'); }}>
                  <Text style={{ fontWeight: '800', color: '#fff' }}>Registrar nuevo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // RENDER: Reporte final
  // ════════════════════════════════════════════════════════════
  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View style={[s.headerCard, { backgroundColor: pct === 100 ? '#065f46' : '#1e293b' }]}>
        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>{pct === 100 ? '🎉' : '📋'}</Text>
        <Text style={[s.headerTitle, { textAlign: 'center' }]}>Chequeo Completado</Text>
        <Text style={[s.headerSub, { textAlign: 'center' }]}>{category?.label}</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <View style={s.statBox}><Text style={s.statNum}>{checked}</Text><Text style={s.statLabel}>Presentes</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{total - checked}</Text><Text style={s.statLabel}>Faltantes</Text></View>
          <View style={s.statBox}><Text style={s.statNum}>{pct}%</Text><Text style={s.statLabel}>Completado</Text></View>
        </View>
      </View>

      {missing.length > 0 ? (
        <View style={s.missingCard}>
          <Text style={s.missingTitle}>⬜ {missing.length} ítem(s) no encontrados</Text>
          {missing.map(item => (
            <View key={item.id} style={s.missingRow}>
              <Text style={s.missingName} numberOfLines={2}>{item.name}</Text>
              <Text style={s.missingCount}>{item.scanned}/{item.stock}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[s.infoBox, { backgroundColor: '#d1fae5', borderColor: '#6ee7b7' }]}>
          <Text style={{ color: '#065f46', fontWeight: '700', textAlign: 'center' }}>
            ✅ ¡Todos los ítems fueron encontrados!
          </Text>
        </View>
      )}

      <TouchableOpacity style={[s.finishBtn, { width: '100%', borderRadius: 16, padding: 14, backgroundColor: theme.brand }]} onPress={reset}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center' }}>🔄 Nuevo Chequeo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (theme) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: theme.bg },
  headerCard:       { backgroundColor: '#1e293b', borderRadius: 20, padding: 20 },
  headerTitle:      { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:        { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  infoBox:          { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 14, padding: 12 },
  infoText:         { color: '#92400e', fontSize: 13 },
  catCard:          { backgroundColor: theme.cardBg, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: theme.cardBorder },
  catLabel:         { fontWeight: '800', fontSize: 15, color: theme.text },
  catSub:           { fontSize: 12, color: theme.subtext, marginTop: 2 },
  progressBar:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.cardBg, borderBottomWidth: 1, borderColor: theme.cardBorder },
  progressLabel:    { fontSize: 13, fontWeight: '700', color: theme.text },
  progressPct:      { fontSize: 13, fontWeight: '800', color: theme.brand },
  progressTrack:    { height: 6, backgroundColor: theme.cardBorder, borderRadius: 99, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 99 },
  progressSub:      { fontSize: 11, color: theme.subtext, marginTop: 3 },
  finishBtn:        { backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  cameraBox:        { height: 220, position: 'relative', backgroundColor: '#000' },
  cameraOverlay:    { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' },
  scanFrame:        { width: 160, height: 160, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 12 },
  stopCamBtn:       { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  cameraPlaceholder:{ height: 140, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: theme.cardBg, borderBottomWidth: 1, borderColor: theme.cardBorder },
  startCamBtn:      { backgroundColor: theme.brand, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  manualBtn:        { paddingVertical: 8 },
  itemCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: theme.cardBorder },
  itemCardDone:     { borderColor: '#6ee7b7', backgroundColor: '#f0fdf4' },
  itemName:         { fontWeight: '700', fontSize: 13, color: theme.text },
  itemSub:          { fontSize: 11, color: theme.subtext, marginTop: 2 },
  itemCount:        { fontWeight: '800', fontSize: 13, color: theme.subtext, marginLeft: 8 },
  activityFeed:     { backgroundColor: theme.cardBg, borderTopWidth: 1, borderColor: theme.cardBorder, padding: 10 },
  activityLabel:    { fontSize: 11, fontWeight: '700', color: theme.subtext, marginBottom: 4 },
  activityItem:     { fontSize: 12, color: theme.subtext, marginBottom: 2 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard:        { backgroundColor: theme.cardBg, borderRadius: 24, padding: 24, gap: 12 },
  modalTitle:       { fontSize: 18, fontWeight: '800', color: theme.text, textAlign: 'center' },
  modalBody:        { fontSize: 14, color: theme.subtext, textAlign: 'center', lineHeight: 22 },
  modalInput:       { borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 12, fontSize: 14, color: theme.text, backgroundColor: theme.bg },
  modalCancel:      { flex: 1, padding: 12, borderRadius: 12, backgroundColor: theme.bg, alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder },
  modalConfirm:     { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  statBox:          { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 10, alignItems: 'center' },
  statNum:          { color: '#fff', fontSize: 24, fontWeight: '900' },
  statLabel:        { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  missingCard:      { backgroundColor: theme.cardBg, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#fca5a5' },
  missingTitle:     { backgroundColor: '#fef2f2', padding: 12, fontWeight: '700', color: '#b91c1c', fontSize: 13 },
  missingRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: '#fee2e2' },
  missingName:      { flex: 1, fontSize: 13, color: theme.text, fontWeight: '600' },
  missingCount:     { fontSize: 12, color: '#ef4444', fontWeight: '700', marginLeft: 8 },
});
