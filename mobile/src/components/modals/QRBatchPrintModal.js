import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getImageUrl } from '../../api/client';
import { apiService } from '../../api/services';

export default function QRBatchPrintModal({ visible, onClose, substances = [], serverUrl = '' }) {
  const [localSubstances, setLocalSubstances] = useState(substances);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'liquid' | 'solid' | 'gas'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [itemCopies, setItemCopies] = useState({});
  const [loadingAction, setLoadingAction] = useState(false);

  const initModalData = (list) => {
    const initialIds = new Set(list.map(s => s.id));
    setSelectedIds(initialIds);

    const copiesMap = {};
    list.forEach(s => {
      const units = parseInt(s.stock_units, 10);
      copiesMap[s.id] = (isNaN(units) || units < 1) ? 1 : units;
    });
    setItemCopies(copiesMap);
    setSearchTerm('');
    setFilterType('all');
  };

  useEffect(() => {
    if (visible) {
      if (substances && substances.length > 0) {
        setLocalSubstances(substances);
        initModalData(substances);
      } else {
        apiService.getSubstances().then(res => {
          let list = [];
          if (Array.isArray(res)) list = res;
          else if (res && Array.isArray(res.data)) list = res.data;
          else if (res && res.status === 'success' && Array.isArray(res.data)) list = res.data;
          setLocalSubstances(list);
          initModalData(list);
        }).catch(e => console.warn('Error al cargar sustancias en modal QR:', e));
      }
    }
  }, [visible, substances]);

  const liquidsCount = localSubstances.filter(s => s.physical_state === 'Líquido').length;
  const solidsCount = localSubstances.filter(s => s.physical_state === 'Sólido').length;

  const filteredSubstances = localSubstances.filter(s => {
    if (filterType === 'liquid' && s.physical_state !== 'Líquido') return false;
    if (filterType === 'solid' && s.physical_state !== 'Sólido') return false;
    if (filterType === 'gas' && s.physical_state !== 'Gaseoso') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchName = (s.name || '').toLowerCase().includes(term);
      const matchCas = (s.cas_number || '').toLowerCase().includes(term);
      const matchFormula = (s.chemical_formula || '').toLowerCase().includes(term);
      const matchId = `LAB-SUB-${s.id}`.toLowerCase().includes(term);
      return matchName || matchCas || matchFormula || matchId;
    }
    return true;
  });

  const selectedSubstances = localSubstances.filter(s => selectedIds.has(s.id));
  const selectedCount = selectedSubstances.length;

  let totalQRLabels = 0;
  selectedSubstances.forEach(s => {
    const copies = itemCopies[s.id] || 1;
    totalQRLabels += copies;
  });

  const toggleSelectAll = (selectVal) => {
    const newSet = new Set(selectedIds);
    if (selectVal) {
      filteredSubstances.forEach(s => newSet.add(s.id));
    } else {
      filteredSubstances.forEach(s => newSet.delete(s.id));
    }
    setSelectedIds(newSet);
  };

  const toggleItemSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const changeCopies = (id, delta) => {
    const current = itemCopies[id] || 1;
    const next = Math.max(1, Math.min(99, current + delta));
    setItemCopies(prev => ({ ...prev, [id]: next }));
    if (!selectedIds.has(id) && delta > 0) {
      const newSet = new Set(selectedIds);
      newSet.add(id);
      setSelectedIds(newSet);
    }
  };

  const setCopiesInput = (id, val) => {
    const parsed = parseInt(val, 10);
    const next = isNaN(parsed) || parsed < 1 ? 1 : Math.min(99, parsed);
    setItemCopies(prev => ({ ...prev, [id]: next }));
  };

  const buildLabelsHTML = () => {
    const expandedLabels = [];
    selectedSubstances.forEach(s => {
      const copies = itemCopies[s.id] || 1;
      for (let i = 0; i < copies; i++) {
        expandedLabels.push({ substance: s, copyIndex: i + 1, totalCopies: copies });
      }
    });

    const labelGridHtml = expandedLabels.map(item => {
      const s = item.substance;
      const qrUrl = s.qr_path ? getImageUrl(s.qr_path, serverUrl) : null;
      return `
        <div style="border: 1.5px dashed #475569; border-radius: 8px; padding: 8px; text-align: center; background-color: #ffffff; page-break-inside: avoid; break-inside: avoid; position: relative; box-sizing: border-box;">
            <span style="position: absolute; top: 2px; right: 4px; font-size: 7pt; color: #94a3b8;">✂️</span>
            <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.name}</div>
            <div style="font-size: 8pt; font-weight: 700; color: #0284c7; margin-bottom: 3px;">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
            ${qrUrl ? `
                <img src="${qrUrl}" style="width: 95px; height: 95px; margin: 0 auto; display: block; object-fit: contain; background-color: #ffffff;">
            ` : `
                <div style="width: 95px; height: 95px; margin: 0 auto; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; color: #999; background-color: #ffffff;">Sin QR</div>
            `}
            <div style="font-size: 8.5pt; font-family: monospace; font-weight: bold; color: #1e293b; margin-top: 3px;">LAB-SUB-${s.id}</div>
            <div style="font-size: 7.5pt; font-weight: bold; color: #15803d; margin-top: 1px;">
                Stock: ${s.container_content || `${s.quantity} ${s.unit}`} ${item.totalCopies > 1 ? `<span style="color:#0284c7; font-weight:800;">[Envase ${item.copyIndex}/${item.totalCopies}]</span>` : ''}
            </div>
            ${s.substance_group ? `<div style="font-size: 7pt; font-weight: bold; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">🏷️ ${s.substance_group}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; margin: 0; padding: 12px; background-color: #ffffff; color: #0f172a; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="font-size: 15pt; font-weight: bold; margin: 0; color: #0f172a;">LABORATORIO DE QUÍMICA - PLANILLA UNIFICADA DE ETIQUETAS QR</h2>
          <p style="font-size: 8.5pt; margin: 3px 0 0 0; color: #475569;">Documento Único Móvil | Sustancias: ${selectedSubstances.length} | Etiquetas Totales: ${expandedLabels.length} | Fecha: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</p>
        </div>
        <div class="grid">
          ${labelGridHtml}
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintOrShare = async (shareMode) => {
    if (selectedSubstances.length === 0) {
      Alert.alert('Sin selección', 'Por favor selecciona al menos una sustancia para generar las etiquetas QR.');
      return;
    }

    setLoadingAction(true);
    try {
      const html = buildLabelsHTML();
      if (shareMode) {
        const file = await Print.printToFileAsync({ html });
        setLoadingAction(false);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Compartir/Guardar Planilla QR PDF',
            UTI: 'com.adobe.pdf'
          });
        } else {
          Alert.alert('PDF Creado', `El archivo PDF ha sido generado en: ${file.uri}`);
        }
      } else {
        await Print.printAsync({ html });
        setLoadingAction(false);
      }
    } catch (error) {
      setLoadingAction(false);
      Alert.alert('Error', 'Ocurrió un error al procesar el documento PDF: ' + error.message);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header Modal */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBg}>
                <Text style={{ fontSize: 18 }}>🖨️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Impresión y Descarga Masiva QR</Text>
                <Text style={styles.headerSubtitle}>Selecciona las sustancias y la cantidad de copias</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filtros Rápidos */}
            <View style={styles.filterChipsRow}>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'all' && styles.filterChipActiveCyan]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
                  🧪 Todos ({localSubstances.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'liquid' && styles.filterChipActiveTeal]}
                onPress={() => setFilterType('liquid')}
              >
                <Text style={[styles.filterChipText, filterType === 'liquid' && styles.filterChipTextActive]}>
                  💧 Líquidos ({liquidsCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'solid' && styles.filterChipActiveAmber]}
                onPress={() => setFilterType('solid')}
              >
                <Text style={[styles.filterChipText, filterType === 'solid' && styles.filterChipTextActive]}>
                  📦 Sólidos ({solidsCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Barra de Búsqueda y Selección Masiva */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Text style={{ fontSize: 14, marginRight: 4 }}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar nombre, CAS, ID..."
                  placeholderTextColor="#64748b"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoCapitalize="none"
                />
                {searchTerm ? (
                  <TouchableOpacity onPress={() => setSearchTerm('')} style={{ padding: 4 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => toggleSelectAll(true)}>
                <Text style={styles.quickActionText}>☑️ Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => toggleSelectAll(false)}>
                <Text style={styles.quickActionText}>🎯 Ninguno</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Sustancias */}
          <ScrollView style={styles.itemsList} contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
            {filteredSubstances.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                <Text style={styles.emptyText}>
                  {searchTerm ? `No hay sustancias para "${searchTerm}"` : 'No hay sustancias registradas.'}
                </Text>
                {searchTerm ? (
                  <TouchableOpacity style={styles.clearSearchBtn} onPress={() => setSearchTerm('')}>
                    <Text style={styles.clearSearchBtnText}>Limpiar Búsqueda</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              filteredSubstances.map(item => {
                const isSelected = selectedIds.has(item.id);
                const copies = itemCopies[item.id] || 1;
                const qrUrl = item.qr_path ? getImageUrl(item.qr_path, serverUrl) : null;

                const stateBadgeStyle = item.physical_state === 'Líquido'
                  ? styles.stateBadgeLiquid
                  : (item.physical_state === 'Sólido' ? styles.stateBadgeSolid : styles.stateBadgeGas);

                return (
                  <View
                    key={item.id}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                  >
                    <TouchableOpacity
                      style={styles.itemMainRow}
                      activeOpacity={0.8}
                      onPress={() => toggleItemSelection(item.id)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>

                      {qrUrl ? (
                        <Image source={{ uri: qrUrl }} style={styles.qrThumb} resizeMode="contain" />
                      ) : (
                        <View style={styles.qrPlaceholder}>
                          <Text style={{ fontSize: 14 }}>📱</Text>
                        </View>
                      )}

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <View style={[styles.stateBadge, stateBadgeStyle]}>
                            <Text style={styles.stateBadgeText}>{item.physical_state || 'Genérico'}</Text>
                          </View>
                        </View>

                        <Text style={styles.itemSubtext}>
                          Formula: <Text style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{item.chemical_formula || '-'}</Text> | CAS: <Text style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{item.cas_number || '-'}</Text>
                        </Text>
                        <Text style={styles.itemSubtext}>
                          Stock: <Text style={{ color: '#2dd4bf', fontWeight: 'bold' }}>{item.container_content || `${item.quantity} ${item.unit}`}</Text>
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Selector de copias */}
                    <View style={styles.itemCopiesRow}>
                      <Text style={styles.copiesLabel}>Copias QR:</Text>
                      <View style={styles.copiesCounter}>
                        <TouchableOpacity style={styles.copiesBtn} onPress={() => changeCopies(item.id, -1)}>
                          <Text style={styles.copiesBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.copiesInput}
                          keyboardType="number-pad"
                          value={String(copies)}
                          onChangeText={(val) => setCopiesInput(item.id, val)}
                        />
                        <TouchableOpacity style={styles.copiesBtn} onPress={() => changeCopies(item.id, 1)}>
                          <Text style={styles.copiesBtnText}>+</Text>
                        </TouchableOpacity>
                        <Text style={styles.copiesUnit}>copia(s)</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer del Modal */}
          <View style={styles.footer}>
            <View style={styles.footerInfoRow}>
              <Text style={styles.footerInfoText}>
                Incluidos: <Text style={styles.footerHighlight}>{selectedCount}</Text> reactivos | <Text style={styles.footerHighlightCyan}>{totalQRLabels}</Text> etiqueta(s) QR
              </Text>
            </View>

            <View style={styles.footerActionsRow}>
              {loadingAction ? (
                <ActivityIndicator size="small" color="#2dd4bf" style={{ paddingVertical: 10 }} />
              ) : (
                <React.Fragment>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnShare, selectedCount === 0 && styles.btnDisabled]}
                    disabled={selectedCount === 0}
                    onPress={() => handlePrintOrShare(true)}
                  >
                    <Text style={styles.btnActionText}>📄 Compartir PDF ({totalQRLabels})</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnPrint, selectedCount === 0 && styles.btnDisabled]}
                    disabled={selectedCount === 0}
                    onPress={() => handlePrintOrShare(false)}
                  >
                    <Text style={styles.btnActionText}>🖨️ Imprimir ({totalQRLabels})</Text>
                  </TouchableOpacity>
                </React.Fragment>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    padding: 12
  },
  modalCard: {
    backgroundColor: '#0d1527',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    height: '86%',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  header: {
    backgroundColor: '#090d16',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500'
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold'
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155'
  },
  filterChipActiveCyan: {
    backgroundColor: 'rgba(6, 182, 212, 0.25)',
    borderColor: '#06b6d4'
  },
  filterChipActiveTeal: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: '#14b8a6'
  },
  filterChipActiveAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#f59e0b'
  },
  filterChipText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700'
  },
  filterChipTextActive: {
    color: '#ffffff'
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
    height: 36
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    paddingVertical: 0
  },
  quickActionBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155'
  },
  quickActionText: {
    color: '#2dd4bf',
    fontSize: 11,
    fontWeight: '700'
  },
  itemsList: {
    backgroundColor: '#0b101d',
    flex: 1
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  clearSearchBtn: {
    marginTop: 12,
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  clearSearchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  itemCard: {
    backgroundColor: '#121b2d',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 10,
    marginBottom: 8
  },
  itemCardSelected: {
    backgroundColor: 'rgba(15, 41, 56, 0.7)',
    borderWidth: 2,
    borderColor: '#2dd4bf'
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxSelected: {
    borderColor: '#2dd4bf',
    backgroundColor: '#0f766e'
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  qrThumb: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginLeft: 10
  },
  qrPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10
  },
  itemName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800'
  },
  stateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1
  },
  stateBadgeLiquid: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: 'rgba(6, 182, 212, 0.4)'
  },
  stateBadgeSolid: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)'
  },
  stateBadgeGas: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: 'rgba(168, 85, 247, 0.4)'
  },
  stateBadgeText: {
    color: '#cbd5e1',
    fontSize: 9,
    fontWeight: '700'
  },
  itemSubtext: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },
  itemCopiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 41, 59, 0.6)'
  },
  copiesLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginRight: 8
  },
  copiesCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 2
  },
  copiesBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center'
  },
  copiesBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  copiesInput: {
    width: 28,
    textAlign: 'center',
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '800',
    paddingVertical: 0
  },
  copiesUnit: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 4
  },
  footer: {
    backgroundColor: '#090d16',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b'
  },
  footerInfoRow: {
    marginBottom: 8,
    alignItems: 'center'
  },
  footerInfoText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600'
  },
  footerHighlight: {
    color: '#2dd4bf',
    fontWeight: '800'
  },
  footerHighlightCyan: {
    color: '#38bdf8',
    fontWeight: '800'
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  btnAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnShare: {
    backgroundColor: '#0d9488'
  },
  btnPrint: {
    backgroundColor: '#0891b2'
  },
  btnDisabled: {
    opacity: 0.4
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800'
  }
});
