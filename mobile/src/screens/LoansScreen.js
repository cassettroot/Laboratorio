import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
  Alert
} from 'react-native';
import { apiService } from '../api/services';
import { getImageUrl } from '../api/client';

export default function LoansScreen() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'Prestado' | 'Pendiente' | 'Devuelto'

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await apiService.getLoans();
      if (res.status === 'success') {
        setLoans(res.data || []);
      }
    } catch (e) {
      console.warn("Error cargando préstamos en móvil:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const filteredLoans = loans.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.item_name.toLowerCase().includes(q) ||
        l.borrower_name.toLowerCase().includes(q) ||
        l.loan_date.includes(q)
      );
    }
    return true;
  });

  const renderLoanCard = ({ item }) => {
    const isPrestado = item.status === 'Prestado';
    const isPendiente = item.status === 'Pendiente Verificación Admin';
    const isDevuelto = item.status === 'Devuelto';

    const photoUri = getImageUrl(item.return_photo_path);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{item.item_name}</Text>
            <Text style={styles.quantityText}>ID Préstamo: #PR-{item.id}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            isPrestado ? styles.badgeAmber : (isPendiente ? styles.badgeOrange : styles.badgeGreen)
          ]}>
            <Text style={[
              styles.statusBadgeText, 
              isPrestado ? styles.textAmber : (isPendiente ? styles.textOrange : styles.textGreen)
            ]}>
              {isPrestado ? '🟡 En Préstamo' : (isPendiente ? '🟠 Pendiente Admin' : '🟢 Devuelto')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Solicitante Registrado:</Text>
            <Text style={styles.detailVal}>{item.borrower_name}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Fecha / Hora Salida:</Text>
            <Text style={styles.detailVal}>{item.loan_date}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>⏱️ Tiempo Transcurrido:</Text>
            <Text style={[styles.detailVal, isPrestado ? styles.timeActive : {}]}>
              {item.elapsed_time}
            </Text>
          </View>

          {photoUri ? (
            <View style={styles.photoContainer}>
              <Text style={styles.detailLabel}>📸 Foto Evidencia en Estante:</Text>
              <Image source={{ uri: photoUri }} style={styles.returnPhoto} resizeMode="cover" />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.badge}>📋 Custodia & Evidencia QR</Text>
        <Text style={styles.title}>Préstamos y Devoluciones</Text>
        <Text style={styles.subtitle}>
          Consulta de lista QR, docentes registrados y verificación fotográfica por Administrador.
        </Text>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'all' ? styles.filterBtnActive : {}]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterBtnText, filter === 'all' ? styles.filterBtnTextActive : {}]}>Todos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'Prestado' ? styles.filterBtnActiveAmber : {}]}
            onPress={() => setFilter('Prestado')}
          >
            <Text style={[styles.filterBtnText, filter === 'Prestado' ? styles.filterBtnTextActive : {}]}>En Préstamo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'Pendiente Verificación Admin' ? styles.filterBtnActiveOrange : {}]}
            onPress={() => setFilter('Pendiente Verificación Admin')}
          >
            <Text style={[styles.filterBtnText, filter === 'Pendiente Verificación Admin' ? styles.filterBtnTextActive : {}]}>Pendiente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterBtn, filter === 'Devuelto' ? styles.filterBtnActiveGreen : {}]}
            onPress={() => setFilter('Devuelto')}
          >
            <Text style={[styles.filterBtnText, filter === 'Devuelto' ? styles.filterBtnTextActive : {}]}>Devueltos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BUSCADOR */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar préstamo..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* LISTADO */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={filteredLoans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLoanCard}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoans(); }} tintColor="#f59e0b" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay registros de préstamos que coincidan.</Text>
          }
        />
      )}
    </View>
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
    marginBottom: 12,
  },
  badge: {
    color: '#f59e0b',
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
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterBtnActive: {
    backgroundColor: '#334155',
  },
  filterBtnActiveAmber: {
    backgroundColor: '#f59e0b',
  },
  filterBtnActiveOrange: {
    backgroundColor: '#ea580c',
  },
  filterBtnActiveGreen: {
    backgroundColor: '#10b981',
  },
  filterBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  searchBox: {
    marginBottom: 12,
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
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  quantityText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  badgeOrange: {
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
    borderWidth: 1,
    borderColor: '#ea580c',
  },
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textAmber: {
    color: '#fbbf24',
  },
  textOrange: {
    color: '#fb923c',
  },
  textGreen: {
    color: '#34d399',
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 10,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '700',
  },
  timeActive: {
    color: '#fbbf24',
    fontWeight: '800',
  },
  photoContainer: {
    marginTop: 6,
    gap: 4,
  },
  returnPhoto: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
  },
});
