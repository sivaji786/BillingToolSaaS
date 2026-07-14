import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { companyTypeService } from '../../../services/api';
import { Building } from 'lucide-react';
import { TableEmptyState } from '../../ui/TableEmptyState';
import { toast } from 'sonner';

export function CompanyTypeList() {
    const [types, setTypes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        companyTypeService.getAll()
            .then(setTypes)
            .catch(() => toast.error('Failed to load company types'))
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-heading-3 font-medium">Company Types</h2>
                <p className="text-body text-muted-foreground">
                    Available organization types defined by the platform. Select yours in{' '}
                    <a href="#settings" className="underline underline-offset-2">Settings → Company Profile</a>.
                </p>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading || types.length === 0 ? (
                            <TableEmptyState colSpan={1} isLoading={isLoading} emptyMessage="No company types found" />
                        ) : (
                            types.map(type => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        {type.name}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
