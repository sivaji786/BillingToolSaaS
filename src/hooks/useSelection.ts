import { useState, useCallback } from 'react';

export function useSelection(pageIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === pageIds.length && pageIds.length > 0
        ? new Set()
        : new Set(pageIds)
    );
  }, [pageIds]);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const isAllSelected = pageIds.length > 0 && selectedIds.size === pageIds.length;
  const isSomeSelected = selectedIds.size > 0;

  return { selectedIds, toggleOne, toggleAll, clearAll, isAllSelected, isSomeSelected };
}
