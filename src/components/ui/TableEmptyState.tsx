import { Loader2 } from 'lucide-react';
import { TableCell, TableRow } from './table';

interface TableEmptyStateProps {
  colSpan: number;
  isLoading: boolean;
  emptyMessage?: string;
}

export function TableEmptyState({
  colSpan,
  isLoading,
  emptyMessage = 'No results found.',
}: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center py-8">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        ) : (
          <span className="text-body text-muted-foreground">{emptyMessage}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
