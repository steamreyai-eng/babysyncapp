
/**
 * exportData — Export baby data to CSV/JSON.
 * Mirrors web app's export functionality.
 */

// expo-file-system v19 types don't export legacy API members, but runtime still supports them
const FS = require('expo-file-system') as { documentDirectory: string; writeAsStringAsync: (path: string, content: string, opts?: any) => Promise<void>; EncodingType: { UTF8: string } };
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

const TABLES = ['feedings', 'sleeps', 'diapers', 'walks', 'growth_records', 'medications', 'vaccinations', 'doctor_visits', 'tasks'] as const;

/**
 * Export all baby data as a JSON file and share it.
 */
export async function exportDataAsJSON() {
  try {
    const baby = useAuthStore.getState().baby;
    const allData: Record<string, any[]> = {};

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
      if (error) {
        if (__DEV__) console.warn(`Export error for ${table}:`, error.message);
        allData[table] = [];
      } else {
        allData[table] = data || [];
      }
    }

    const exportPayload = {
      exported_at: new Date().toISOString(),
      baby_name: baby?.name || 'Unknown',
      baby_birthdate: baby?.birthdate || '',
      data: allData,
    };

    const json = JSON.stringify(exportPayload, null, 2);
    const fileName = `babysync_export_${new Date().toISOString().split('T')[0]}.json`;
    const filePath = `${FS.documentDirectory}${fileName}`;

    await FS.writeAsStringAsync(filePath, json, {
      encoding: FS.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Экспорт данных BabySync',
        UTI: 'public.json',
      });
    } else {
      Alert.alert('Готово', `Файл сохранён: ${fileName}`);
    }

    return true;
  } catch (e) {
    if (__DEV__) console.error('Export failed:', e);
    Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    return false;
  }
}

/**
 * Export data as CSV (simplified — one table at a time).
 */
export async function exportTableAsCSV(tableName: string) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) {
      Alert.alert('Нет данных', `Таблица "${tableName}" пуста.`);
      return false;
    }

    // Build CSV
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const fileName = `babysync_${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${FS.documentDirectory}${fileName}`;

    await FS.writeAsStringAsync(filePath, csv, {
      encoding: FS.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: `Экспорт: ${tableName}`,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Готово', `Файл: ${fileName}`);
    }

    return true;
  } catch (e) {
    if (__DEV__) console.error(`CSV export failed for ${tableName}:`, e);
    Alert.alert('Ошибка', 'Не удалось экспортировать данные');
    return false;
  }
}

