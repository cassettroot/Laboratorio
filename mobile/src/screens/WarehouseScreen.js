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

export default function WarehouseScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'shelf_list'
  const [mode, setMode] = useState('photo'); // 'photo' | 'optimized'
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
    const name = (item.name || '').toLowerCase();
    const risks = (item.risks_warnings || '').toLowerCase();
    if (name.includes('sulfúrico') || name.includes('clorhídrico') || name.includes('fórmico') || name.includes('fosfórico') || name.includes('propiónico') || name.includes('butírico') || name.includes('hidróxido') || name.includes('cal sodada') || risks.includes('corrosivo') || risks.includes('ghs05')) {
      return 'Grupo 8 (Corrosivos)';
    }
    if (risks.includes('inflamable') || risks.includes('ghs02') || name.includes('naftalina')) {
      return 'Grupo 3 (Inflamables)';
    }
    if (name.includes('aluminio en polvo') || name.includes('carburo de calcio')) {
      return 'Grupo 4 (Sólidos Reactivos)';
    }
    if (name.includes('peróxido') || name.includes('agua oxigenada')) {
      return 'Grupo 5 (Comburentes)';
    }
    if (name.includes('bario') || risks.includes('tóxico') || risks.includes('ghs06')) {
      return 'Grupo 6 (Tóxicos)';
    }
    return 'Grupo 9 (Sales e Inertes)';
  };

  const shelvesConfig = [
    {
      id: 'A2',
      title: '🧪 Estante Izquierdo (A) - Nivel 2 (Central)',
      subtitle: '🔴 GRUPO 8 CORROSIVOS | 🟠 GRUPO 3 INFLAMABLES',
      color: '#f59e0b',
      filterMatch: (s) => s.physical_state === 'Líquido' || s.unit === 'ml' || s.unit === 'L' || ['Solución', 'Aceite', 'Agua', 'Ácido'].some(k => s.name.includes(k))
    },
    {
      id: 'A3',
      title: '🧪 Estante Izquierdo (A) - Nivel 3',
      subtitle: '🔵 GRUPO 9 SALES / 🟠 GRUPO 4 SÓLIDOS',
      color: '#0284c7',
      filterMatch: (s) => s.physical_state === 'Sólido' && /^[a-c]/i.test(s.name) && s.name !== 'Agua Destilada'
    },
    {
      id: 'A4',
      title: '🧪 Estante Izquierdo (A) - Nivel 4',
      subtitle: '🟣 GRUPO 6 TÓXICOS / 🔴 GRUPO 8 BASES',
      color: '#6366f1',
      filterMatch: (s) => s.physical_state === 'Sólido' && (s.name.startsWith('Cloruro') || s.name.startsWith('Carbonato') || s.name.includes('Cal Sodada'))
    },
    {
      id: 'A5',
      title: '🧪 Estante Izquierdo (A) - Nivel 5 (Alto)',
      subtitle: '🟡 GRUPO 5 COMBURENTES / 🟣 GRUPO 6 TÓXICOS',
      color: '#a855f7',
      filterMatch: (s) => s.physical_state === 'Sólido' && (s.name.startsWith('Óxido') || s.name.startsWith('Naftalina') || s.name.startsWith('Parafina') || s.name.includes('Peróxido') || /^[n-z]/i.test(s.name))
    },
    {
      id: 'B2',
      title: '📦 Estante Derecho (B) - Nivel 2',
      subtitle: '🔵 GRUPO 9 SALES COMPUESTAS',
      color: '#10b981',
      filterMatch: (s) => s.name.startsWith('Sulfato') || s.name.startsWith('Fosfato') || s.name.startsWith('Tartrato') || s.name.startsWith('Tiosulfato')
    },
    {
      id: 'B1',
      title: '🧰 Estante Derecho (B) - Nivel 1 (Piso Estante)',
      subtitle: '🧰 CARGA PESADA & PHYWE',
      color: '#ec4899',
      filterMatch: (s) => s.name === 'Agua Destilada' || s.name === 'Yeso' || s.unit === 'kg' || s.unit === 'L'
    },
    {
      id: 'A1',
      title: '🚨 Estante Izquierdo (A) - Nivel 1 (Piso Estante)',
      subtitle: '🚨 SEGURIDAD / KIT DERRAMES',
      color: '#eab308',
      filterMatch: (s) => s.name.includes('Derrame') || s.name.includes('Kit')
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* HEADER CON PESTAÑAS PRINCIPALES */}
      <View style={styles.header}>
        <Text style={styles.badge}>🏢 Infraestructura & Estantería</Text>
        <Text style={styles.title}>Almacén de Reactivos</Text>
        <Text style={styles.subtitle}>
          Toca cualquier nivel para consultar directamente las sustancias que lo integran.
        </Text>

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
              📋 Ver por Niveles
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
                📸 Vista Actual (Foto)
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

          {/* ALTILLO */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>📦 ALTILLO SUPERIOR (LOTE 12)</Text>
            <TouchableOpacity style={styles.altilloBox} onPress={() => handleSelectZoneDirectly('Altillo')}>
              <Text style={styles.altilloText}>
                {mode === 'photo'
                  ? '📦 Cajas alargadas de cartón de almacenamiento superior'
                  : '📦 Almacenamiento secundario ligero (Cajas livianas)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ESTANTERÍA DOBLE */}
          <Text style={styles.shelfTitle}>
            {mode === 'photo' ? '📸 Mapa de Distribución Actual (Toca un nivel)' : '✨ Zonificación Recomendada SGA'}
          </Text>

          <View style={styles.shelvingGrid}>
            {/* ESTANTE A (IZQUIERDO) */}
            <View style={styles.column}>
              <Text style={styles.columnHeader}>Estante Izquierdo (Col. A)</Text>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('A5')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 5 (Alto)</Text>
                  <Text style={styles.pictogramBadge}>🔵 GRUPO 9</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '⚪ Libre / Vacío' : '📄 Archivo & Cajas Livianas'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('A4')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 4</Text>
                  <Text style={styles.pictogramBadge}>🟣 GRUPO 6</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '⚪ Libre / Vacío' : '🧪 Sólidos Inertes A-M'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('A3')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 3</Text>
                  <Text style={styles.pictogramBadge}>🔵 GRUPO 9</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '🧪 1 Frasco pequeño' : '🧪 Sales y Óxidos N-Z'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shelfItem, styles.shelfAmber]} onPress={() => handleSelectZoneDirectly('A2')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevelAmber}>Nivel 2 (Central)</Text>
                  <Text style={styles.pictogramBadgeAmber}>🔴 G-8 | 🟠 G-3</Text>
                </View>
                <Text style={styles.shelfDescAmber}>
                  {mode === 'photo' ? '🧪 🍾 Botellas Ámbar + Plásticos' : '🍾 Charola Antiderrames SGA'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shelfItem, mode === 'optimized' ? styles.shelfYellow : {}]} onPress={() => handleSelectZoneDirectly('A1')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 1 (Piso Estante)</Text>
                  <Text style={styles.pictogramBadge}>🚨 SEGURIDAD</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '📦 Caja Blanca + Maletín Negro' : '🚨 Kit de Derrames Accesible'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ESTANTE B (DERECHO) */}
            <View style={styles.column}>
              <Text style={styles.columnHeader}>Estante Derecho (Col. B)</Text>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('B5')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 5 (Alto)</Text>
                  <Text style={styles.pictogramBadge}>🎓 DIDÁCTICO</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '⚪ Libre / Vacío' : '🎓 Materiales Didácticos'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('B4')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 4</Text>
                  <Text style={styles.pictogramBadge}>🥛 VIDRIO</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '⚪ Libre / Vacío' : '🥛 Cristalería Limpia'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('B3')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 3</Text>
                  <Text style={styles.pictogramBadge}>🥽 EPP</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '⚪ Libre / Vacío' : '🥽 Equipos de Protección (EPP)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shelfItem} onPress={() => handleSelectZoneDirectly('B2')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevel}>Nivel 2 (Central)</Text>
                  <Text style={styles.pictogramBadge}>🔵 GRUPO 9</Text>
                </View>
                <Text style={styles.shelfDesc}>
                  {mode === 'photo' ? '📦 Caja Cartón Sellada' : '📦 Reactivos Secundarios'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.shelfItem, styles.shelfPurple]} onPress={() => handleSelectZoneDirectly('B1')}>
                <View style={styles.shelfItemHeader}>
                  <Text style={styles.shelfLevelPurple}>Nivel 1 (Inferior)</Text>
                  <Text style={styles.pictogramBadgePurple}>🧰 PESADO</Text>
                </View>
                <Text style={styles.shelfDescPurple}>🧰 Caja de Madera PHYWE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ÁREA DE PISO */}
          <TouchableOpacity style={[styles.floorBox, mode === 'optimized' ? styles.floorBoxOpt : {}]} onPress={() => handleSelectZoneDirectly('A1')}>
            <Text style={styles.floorTitle}>
              {mode === 'photo' ? '🚨 Área de Piso y Pasillo (Estado Actual)' : '✅ Área de Piso (Optimizada)'}
            </Text>
            <Text style={styles.floorText}>
              {mode === 'photo'
                ? '⚠️ Bolsa amarilla de Kit de Derrame y caja de insumos en el suelo obstaculizando la evacuación.'
                : '✅ Suelo 100% libre de obstáculos para garantizar la libre evacuación y tránsito seguro.'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* VISTA DE LISTA POR NIVELES CON FILTRO DIRECTO */
        <View style={{ gap: 16 }}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Filtrar por nivel o compuesto (ej. A2, Cloruro)..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 20 }} />
          ) : (
            shelvesConfig.map(shelf => {
              let matched = substances.filter(shelf.filterMatch);
              if (search.trim()) {
                const q = search.toLowerCase();
                const isShelfIdMatch = shelf.id.toLowerCase().includes(q) || shelf.title.toLowerCase().includes(q);
                if (!isShelfIdMatch) {
                  matched = matched.filter(s =>
                    s.name.toLowerCase().includes(q) ||
                    (s.cas_number && s.cas_number.toLowerCase().includes(q)) ||
                    (s.chemical_formula && s.chemical_formula.toLowerCase().includes(q)) ||
                    getStorageGroupCode(s).toLowerCase().includes(q)
                  );
                }
              }

              if (search.trim() && matched.length === 0) return null;

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
                    {matched.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.itemRow}
                        onPress={() => navigation.navigate('Detail', { type: 'substance', item })}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.groupBadge}>{getStorageGroupCode(item)}</Text>
                          </View>
                          <Text style={styles.itemMeta}>
                            {item.chemical_formula ? `Fórmula: ${item.chemical_formula}` : ''} {item.cas_number ? `| CAS: ${item.cas_number}` : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.itemQuantity}>{item.quantity} {item.unit || 'g'}</Text>
                          <Text style={styles.itemDetailBtn}>Ver Ficha ➔</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
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
    padding: 16,
  },
  header: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  badge: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 14,
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
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: '#0284c7',
  },
  modeBtnActiveOpt: {
    backgroundColor: '#10b981',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  cardSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f59e0b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  altilloBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    padding: 12,
  },
  altilloText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 4,
  },
  shelfItem: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  shelfItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  shelfLevel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },
  pictogramBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: '#1e293b',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shelfDesc: {
    fontSize: 11,
    color: '#e2e8f0',
  },
  shelfAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  shelfLevelAmber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fbbf24',
  },
  pictogramBadgeAmber: {
    fontSize: 8,
    fontWeight: '800',
    color: '#f59e0b',
    backgroundColor: '#451a03',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shelfDescAmber: {
    fontSize: 11,
    color: '#fef3c7',
    fontWeight: '700',
  },
  shelfPurple: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
  },
  shelfLevelPurple: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c084fc',
  },
  pictogramBadgePurple: {
    fontSize: 8,
    fontWeight: '800',
    color: '#c084fc',
    backgroundColor: '#3b0764',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  shelfDescPurple: {
    fontSize: 11,
    color: '#f3e8ff',
    fontWeight: '700',
  },
  shelfYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: '#eab308',
  },
  floorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 16,
  },
  floorBoxOpt: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
    lineHeight: 16,
  },
  searchBox: {
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
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
    fontSize: 13,
    fontWeight: '800',
  },
  shelfGroupSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  groupBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: '#1e293b',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemMeta: {
    fontSize: 10,
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
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 2,
  },
});
