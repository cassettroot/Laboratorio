import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { apiService } from '../api/services';
import { normalizeText } from '../utils/textUtils';

export default function WarehouseScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'shelf_list'
  const [mode, setMode] = useState('optimized'); // 'photo' | 'optimized'
  const [substances, setSubstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchSubstances = async () => {
      setLoading(true);
      try {
        const res = await apiService.getSubstances();
        if (res.status === 'success') {
          setSubstances(res.data || []);
        }
      } catch (e) {
        console.warn("Error cargando sustancias para almacén:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSubstances();
  }, []);

  const handleSelectZoneDirectly = (shelfId) => {
    setActiveTab('shelf_list');
    setSearch(shelfId);
  };

  const getStorageGroupCode = (item) => {
    const nameNorm = normalizeText(item.name || '');
    const risksNorm = normalizeText(item.risks_warnings || '');
    const groupNorm = normalizeText(item.substance_group || '');

    if (groupNorm.includes('grupo 8') || nameNorm.includes('sulfurico') || nameNorm.includes('clorhidrico') || nameNorm.includes('formico') || nameNorm.includes('fosforico') || nameNorm.includes('hidroxido') || risksNorm.includes('corrosivo') || risksNorm.includes('ghs05')) {
      return 'Grupo 8 (Corrosivos)';
    }
    if (groupNorm.includes('grupo 3') || risksNorm.includes('inflamable') || risksNorm.includes('ghs02') || nameNorm.includes('naftalina') || nameNorm.includes('etanol') || nameNorm.includes('metanol')) {
      return 'Grupo 3 (Inflamables)';
    }
    if (groupNorm.includes('grupo 4') || nameNorm.includes('aluminio') || nameNorm.includes('carburo') || nameNorm.includes('magnesio')) {
      return 'Grupo 4 (Sólidos Reactivos)';
    }
    if (groupNorm.includes('grupo 5') || nameNorm.includes('peroxido') || nameNorm.includes('agua oxigenada') || nameNorm.includes('nitrato')) {
      return 'Grupo 5 (Comburentes)';
    }
    if (groupNorm.includes('grupo 6') || nameNorm.includes('bario') || risksNorm.includes('toxico') || risksNorm.includes('ghs06')) {
      return 'Grupo 6 (Tóxicos)';
    }
    return 'Grupo 9 (Sales e Inertes)';
  };

  const shelvesConfig = [
    {
      id: 'A5',
      col: 'A',
      level: 5,
      title: '🧪 Estante A - Nivel 5 (Alto)',
      subtitle: '🔵 GRUPO 9 SALES E INERTES A-M',
      color: '#38bdf8',
      descOpt: 'Sólidos Inertes A-M (NaCl, Almidón, Sacarosa)',
      descPhoto: '⚪ Estado Actual: Muestras y Frascos Livianos'
    },
    {
      id: 'A4',
      col: 'A',
      level: 4,
      title: '🧪 Estante A - Nivel 4',
      subtitle: '🟡 GRUPO 5 COMBURENTES | 🟣 GRUPO 6 TÓXICOS',
      color: '#a855f7',
      descOpt: 'Comburentes y Tóxicos (Peróxidos, Bario, Nitratos)',
      descPhoto: '⚪ Estado Actual: Insumos Plásticos Libres'
    },
    {
      id: 'A3',
      col: 'A',
      level: 3,
      title: '🧪 Estante A - Nivel 3',
      subtitle: '🟠 GRUPO 3 LÍQUIDOS INFLAMABLES / SOLVENTES',
      color: '#fbbf24',
      descOpt: 'Solventes e Inflamables (Etanol, Metanol, Acetona)',
      descPhoto: '🧪 Estado Actual: Frascos Pequeños de Solvente'
    },
    {
      id: 'A2',
      col: 'A',
      level: 2,
      title: '🧪 Estante A - Nivel 2 (Central)',
      subtitle: '🔴 GRUPO 8 CORROSIVOS (ÁCIDOS Y BASES)',
      color: '#f87171',
      descOpt: 'Líquidos Corrosivos (Ácido Sulfúrico, Clorhídrico, NaOH)',
      descPhoto: '🧪 Botellas Ámbar + Garrafas Plásticas'
    },
    {
      id: 'A1',
      col: 'A',
      level: 1,
      title: '🚨 Estante A - Nivel 1 (Piso Estante)',
      subtitle: '🚨 SEGURIDAD / KIT DERRAMES & CAJAS 2WAJ',
      color: '#eab308',
      descOpt: 'Cajas 2WAJ + Kit de Absorción de Derrames',
      descPhoto: '📦 Caja Blanca + Maletín Negro'
    },
    {
      id: 'B5',
      col: 'B',
      level: 5,
      title: '📦 Estante B - Nivel 5 (Alto)',
      subtitle: '🟣 GRUPO 6/9 INDICADORES Y COLORANTES',
      color: '#c084fc',
      descOpt: 'Indicadores y Colorantes (Fenolftaleína, Azul Metileno)',
      descPhoto: '⚪ Libre / Almacenamiento Alto'
    },
    {
      id: 'B4',
      col: 'B',
      level: 4,
      title: '📦 Estante B - Nivel 4',
      subtitle: '🟠 GRUPO 4 METALES Y SÓLIDOS REACTIVOS',
      color: '#fbbf24',
      descOpt: 'Metales y Sólidos Reactivos (Magnesio, Carburo, Zinc)',
      descPhoto: '⚪ Libre / Envasado Especial'
    },
    {
      id: 'B3',
      col: 'B',
      level: 3,
      title: '📦 Estante B - Nivel 3',
      subtitle: '🟢 GRUPO 9 ÁCIDOS ORGÁNICOS Y CARBOHIDRATOS',
      color: '#34d399',
      descOpt: 'Ácidos Orgánicos y Carbohidratos (Cítrico, Sacarosa)',
      descPhoto: '⚪ Libre / Envasado Liviano'
    },
    {
      id: 'B2',
      col: 'B',
      level: 2,
      title: '📦 Estante B - Nivel 2 (Central)',
      subtitle: '🔵 GRUPO 9 SALES INORGÁNICAS N-Z',
      color: '#38bdf8',
      descOpt: 'Sales Inorgánicas N-Z (Sulfatos, Fosfatos, Ferrocianuros)',
      descPhoto: '📦 Caja Cartón Sellada'
    },
    {
      id: 'B1',
      col: 'B',
      level: 1,
      title: '🧰 Estante B - Nivel 1 (Inferior)',
      subtitle: '🔵 SOLUCIONES ACUOSAS GRAN VOLUMEN & PHYWE',
      color: '#e9d5ff',
      descOpt: 'Soluciones Acuosas de Gran Volumen + Material PHYWE',
      descPhoto: '🧰 Caja de Madera PHYWE + Bidones'
    }
  ];

  const getSubstancesForShelf = (shelfId) => {
    return substances.filter(s => {
      const locNorm = normalizeText(s.location || '');
      if (locNorm.includes(normalizeText(shelfId))) return true;

      const normName = normalizeText(s.name);
      const normGroup = normalizeText(s.substance_group);
      const normRisks = normalizeText(s.risks_warnings);
      const normState = normalizeText(s.physical_state);

      switch (shelfId) {
        case 'A1':
          return normName.includes('derrame') || normName.includes('kit') || locNorm.includes('a1');
        case 'A2':
          return normGroup.includes('grupo 8') || normGroup.includes('corrosivo') || normRisks.includes('corrosivo') || normRisks.includes('ghs05') || normName.includes('sulfurico') || normName.includes('clorhidrico') || normName.includes('formico') || normName.includes('fosforico') || normName.includes('hidroxido');
        case 'A3':
          return normGroup.includes('grupo 3') || normGroup.includes('inflamable') || normRisks.includes('inflamable') || normRisks.includes('ghs02') || normName.includes('etanol') || normName.includes('metanol') || normName.includes('acetona');
        case 'A4':
          return normGroup.includes('grupo 5') || normGroup.includes('grupo 6') || normName.includes('nitrato') || normName.includes('peroxido') || normName.includes('clorato') || normName.includes('bario');
        case 'A5':
          return (normState.includes('solido') && /^[a-m]/i.test(s.name) && !normName.includes('sulfato') && !normName.includes('fosfato')) || locNorm.includes('a5');
        case 'B1':
          return normName.includes('agua destilada') || normName.includes('phywe') || (s.unit || '').toLowerCase() === 'l' || (s.unit || '').toLowerCase() === 'kg' || locNorm.includes('b1');
        case 'B2':
          return normName.includes('sulfato') || normName.includes('fosfato') || normName.includes('ferrocianuro') || (normGroup.includes('grupo 9') && /^[n-z]/i.test(s.name)) || locNorm.includes('b2');
        case 'B3':
          return normName.includes('citrico') || normName.includes('oxalico') || normName.includes('sacarosa') || normName.includes('glucosa') || normName.includes('tartarico') || locNorm.includes('b3');
        case 'B4':
          return normGroup.includes('grupo 4') || normName.includes('magnesio') || normName.includes('carburo') || normName.includes('aluminio') || normName.includes('zinc') || locNorm.includes('b4');
        case 'B5':
          return normName.includes('fenolftaleina') || normName.includes('azul') || normName.includes('naranja') || normName.includes('verde') || normName.includes('rojo') || normName.includes('indicador') || locNorm.includes('b5');
        default:
          return false;
      }
    });
  };

  const getFilteredSubstancesForShelf = (shelfId, searchStr) => {
    const shelfItems = getSubstancesForShelf(shelfId);
    if (!searchStr.trim()) return shelfItems;
    
    const qNorm = normalizeText(searchStr);
    if (shelfId.toLowerCase().includes(qNorm) || qNorm.includes(shelfId.toLowerCase())) {
      return shelfItems;
    }

    return shelfItems.filter(s =>
      normalizeText(s.name).includes(qNorm) ||
      normalizeText(s.cas_number).includes(qNorm) ||
      normalizeText(s.chemical_formula).includes(qNorm) ||
      normalizeText(s.substance_group).includes(qNorm) ||
      normalizeText(s.location).includes(qNorm) ||
      normalizeText(s.responsible).includes(qNorm)
    );
  };

  const searchNorm = normalizeText(search);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* HEADER DE ALMACÉN CON BUSCADOR GLOBAL */}
      <View style={styles.headerCard}>
        <Text style={styles.badgeText}>🏢 Infraestructura & Estantería Metálica</Text>
        <Text style={styles.mainTitle}>Almacén de Reactivos</Text>
        <Text style={styles.subtitleText}>
          Organización SGA por estantes y niveles. Escribe para buscar cualquier sustancia por nombre, CAS o fórmula sin importar acentos o mayúsculas.
        </Text>

        {/* BARRA DE BÚSQUEDA GLOBAL DEL ALMACÉN */}
        <View style={styles.searchBarBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchBarInput}
            placeholder="Buscar por sustancia, CAS, fórmula o nivel (ej. A2, Cloruro)..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* PESTAÑAS DE VISTA */}
        <View style={styles.sectionTabs}>
          <TouchableOpacity
            style={[styles.sectionBtn, activeTab === 'visual' ? styles.sectionBtnActive : {}]}
            onPress={() => setActiveTab('visual')}
          >
            <Text style={[styles.sectionBtnText, activeTab === 'visual' ? styles.sectionBtnTextActive : {}]}>
              🗺️ Estantería Visual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sectionBtn, activeTab === 'shelf_list' ? styles.sectionBtnActive : {}]}
            onPress={() => setActiveTab('shelf_list')}
          >
            <Text style={[styles.sectionBtnText, activeTab === 'shelf_list' ? styles.sectionBtnTextActive : {}]}>
              📋 Listado por Niveles
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'visual' ? (
        <View>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'photo' ? styles.modeBtnActive : {}]}
              onPress={() => setMode('photo')}
            >
              <Text style={[styles.modeBtnText, mode === 'photo' ? styles.modeBtnTextActive : {}]}>
                📸 Vista Actual (Fotos)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'optimized' ? styles.modeBtnActiveOpt : {}]}
              onPress={() => setMode('optimized')}
            >
              <Text style={[styles.modeBtnText, mode === 'optimized' ? styles.modeBtnTextActive : {}]}>
                ✨ Propuesta SGA
              </Text>
            </TouchableOpacity>
          </View>

          {/* ALTILLO SUPERIOR */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>📦 ALTILLO SUPERIOR (LOTE 12)</Text>
            <TouchableOpacity style={styles.altilloBox} onPress={() => handleSelectZoneDirectly('Altillo')}>
              <Text style={styles.altilloText}>
                {mode === 'photo'
                  ? '📦 Cajas alargadas de cartón de almacenamiento superior'
                  : '📦 Almacenamiento secundario ligero (Cajas livianas y envases secos)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* MAPA DE ESTANTERÍA DOBLE (COLUMNA A Y COLUMNA B) */}
          <Text style={styles.shelfTitle}>
            {mode === 'photo' ? '📸 Mapa de Distribución Actual (Toca un nivel)' : '✨ Zonificación Recomendada SGA'}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginVertical: 30 }} />
          ) : (
            <View style={styles.shelvingGrid}>
              {/* ESTANTE A (IZQUIERDO) */}
              <View style={styles.column}>
                <Text style={styles.columnHeader}>Estante Izquierdo (Col. A)</Text>

                {shelvesConfig.filter(s => s.col === 'A').map(shelf => {
                  const matchedItems = getFilteredSubstancesForShelf(shelf.id, search);
                  const totalItemsOnShelf = getSubstancesForShelf(shelf.id).length;
                  const isMatchingSearch = searchNorm && matchedItems.length > 0;

                  return (
                    <TouchableOpacity
                      key={shelf.id}
                      style={[
                        styles.shelfCard,
                        isMatchingSearch && styles.shelfCardHighlight
                      ]}
                      onPress={() => handleSelectZoneDirectly(shelf.id)}
                    >
                      <View style={styles.shelfCardHeader}>
                        <Text style={[styles.shelfLevelText, isMatchingSearch && { color: '#34d399' }]}>
                          Nivel {shelf.level} ({shelf.id})
                        </Text>
                        <Text style={[styles.badgePill, { backgroundColor: isMatchingSearch ? '#10b981' : shelf.color }]}>
                          {isMatchingSearch ? `🎯 ${matchedItems.length}` : `${totalItemsOnShelf} reactivos`}
                        </Text>
                      </View>
                      <Text style={styles.shelfSubtitleTag}>{shelf.subtitle}</Text>
                      <Text style={styles.shelfDescText}>
                        {mode === 'photo' ? shelf.descPhoto : shelf.descOpt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ESTANTE B (DERECHO) */}
              <View style={styles.column}>
                <Text style={styles.columnHeader}>Estante Derecho (Col. B)</Text>

                {shelvesConfig.filter(s => s.col === 'B').map(shelf => {
                  const matchedItems = getFilteredSubstancesForShelf(shelf.id, search);
                  const totalItemsOnShelf = getSubstancesForShelf(shelf.id).length;
                  const isMatchingSearch = searchNorm && matchedItems.length > 0;

                  return (
                    <TouchableOpacity
                      key={shelf.id}
                      style={[
                        styles.shelfCard,
                        isMatchingSearch && styles.shelfCardHighlight
                      ]}
                      onPress={() => handleSelectZoneDirectly(shelf.id)}
                    >
                      <View style={styles.shelfCardHeader}>
                        <Text style={[styles.shelfLevelText, isMatchingSearch && { color: '#34d399' }]}>
                          Nivel {shelf.level} ({shelf.id})
                        </Text>
                        <Text style={[styles.badgePill, { backgroundColor: isMatchingSearch ? '#10b981' : shelf.color }]}>
                          {isMatchingSearch ? `🎯 ${matchedItems.length}` : `${totalItemsOnShelf} reactivos`}
                        </Text>
                      </View>
                      <Text style={styles.shelfSubtitleTag}>{shelf.subtitle}</Text>
                      <Text style={styles.shelfDescText}>
                        {mode === 'photo' ? shelf.descPhoto : shelf.descOpt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ÁREA DE PISO */}
          <TouchableOpacity style={[styles.floorBox, mode === 'optimized' ? styles.floorBoxOpt : {}]} onPress={() => handleSelectZoneDirectly('A1')}>
            <Text style={styles.floorTitle}>
              {mode === 'photo' ? '🚨 Área de Piso y Pasillo (Estado Actual)' : '✅ Área de Piso (Optimizada)'}
            </Text>
            <Text style={styles.floorText}>
              {mode === 'photo'
                ? '⚠️ Bolsa amarilla de Kit de Derrame y cajas en el suelo obstaculizando paso.'
                : '✅ Suelo 100% libre de obstáculos. Organización exclusiva para reactivos en estantería.'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* VISTA DE LISTADO DETALLADO POR NIVELES */
        <View style={{ gap: 16 }}>
          {loading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
          ) : (
            shelvesConfig.map(shelf => {
              const matched = getFilteredSubstancesForShelf(shelf.id, search);

              if (searchNorm && matched.length === 0) return null;

              return (
                <View key={shelf.id} style={styles.shelfGroupCard}>
                  <View style={styles.shelfGroupHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shelfGroupTitle, { color: shelf.color }]}>{shelf.title}</Text>
                      <Text style={styles.shelfGroupSubtitle}>{shelf.subtitle}</Text>
                    </View>
                    <View style={[styles.countBadge, { backgroundColor: shelf.color }]}>
                      <Text style={styles.countBadgeText}>{matched.length} reactivos</Text>
                    </View>
                  </View>

                  <View style={styles.itemsList}>
                    {matched.length > 0 ? (
                      matched.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.itemRow}
                          onPress={() => navigation.navigate('Detail', { type: 'substance', item })}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <View style={styles.groupChip}>
                                <Text style={styles.groupChipText}>{getStorageGroupCode(item)}</Text>
                              </View>
                            </View>
                            <Text style={styles.itemMeta}>
                              {item.chemical_formula ? `Fórmula: ${item.chemical_formula} ` : ''}{item.cas_number ? `| CAS: ${item.cas_number}` : ''}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                            <Text style={styles.itemQuantity}>{item.quantity} {item.unit || 'g'}</Text>
                            <Text style={styles.itemDetailBtn}>Ver Ficha ➔</Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', padding: 8 }}>
                        No hay sustancias asignadas aún a este nivel.
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  headerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
    marginBottom: 14,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#ffffff',
    paddingVertical: 2,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  sectionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  sectionBtnActive: {
    backgroundColor: '#0284c7',
  },
  sectionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  sectionBtnTextActive: {
    color: '#ffffff',
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    gap: 6,
    marginBottom: 14,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: '#334155',
  },
  modeBtnActiveOpt: {
    backgroundColor: '#0369a1',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  cardSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  altilloBox: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  altilloText: {
    fontSize: 12,
    color: '#fef08a',
    fontWeight: '600',
  },
  shelfTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
  },
  shelvingGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    textAlign: 'center',
    marginBottom: 4,
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shelfCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shelfCardHighlight: {
    borderColor: '#10b981',
    borderWidth: 2,
    backgroundColor: '#022c22',
  },
  shelfCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shelfLevelText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  shelfSubtitleTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
  },
  shelfDescText: {
    fontSize: 10,
    color: '#cbd5e1',
    lineHeight: 14,
  },
  floorBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  floorBoxOpt: {
    borderColor: '#10b981',
  },
  floorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  floorText: {
    fontSize: 11,
    color: '#cbd5e1',
    lineHeight: 15,
  },
  shelfGroupCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shelfGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  shelfGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  shelfGroupSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  groupChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  groupChipText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemQuantity: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },
  itemDetailBtn: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 2,
  }
});
