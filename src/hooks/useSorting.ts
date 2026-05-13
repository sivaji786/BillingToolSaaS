import { useState, useMemo } from 'react';

export function useSorting<T extends Record<string, any>>(
  data: T[],
  defaultColumn: keyof T,
  defaultDirection: 'asc' | 'desc' = 'desc'
) {
  const [sortColumn, setSortColumn] = useState<keyof T>(defaultColumn);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultDirection);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = String(a[sortColumn] ?? '');
      const bVal = String(b[sortColumn] ?? '');
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortColumn, sortDirection]);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return { sorted, sortColumn, sortDirection, handleSort };
}
