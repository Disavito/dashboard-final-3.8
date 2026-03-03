import * as React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui-custom/DataTable';
import { fetchDeletionRequests, updateDeletionRequestStatus } from '@/lib/supabase/documentRequests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/context/UserContext';

// Definición del tipo de fila extendida para la tabla
type RequestRow = Awaited<ReturnType<typeof fetchDeletionRequests>>[number];

const DeletionRequestsTable = () => {
    const { user } = useUser();
    const [data, setData] = React.useState<RequestRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isProcessing, setIsProcessing] = React.useState<string | null>(null);

    const loadRequests = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const requests = await fetchDeletionRequests();
            setData(requests);
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error de Carga',
                description: 'No se pudieron cargar las solicitudes de eliminación.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadRequests();
    }, [loadRequests]);

    const handleAction = async (requestId: string, status: 'Approved' | 'Rejected') => {
        if (!user?.id) {
            toast({ title: 'Error de Autenticación', description: 'Usuario no identificado.', variant: 'destructive' });
            return;
        }

        setIsProcessing(requestId);
        try {
            await updateDeletionRequestStatus(requestId, status, user.id);
            toast({
                title: status === 'Approved' ? 'Aprobación Exitosa' : 'Rechazo Registrado',
                description: `La solicitud ha sido marcada como ${status === 'Approved' ? 'Aprobada' : 'Rechazada'}.`,
                variant: status === 'Approved' ? 'success' : 'default',
            });
            loadRequests();
        } catch (error) {
            console.error(error);
            toast({
                title: 'Error de Acción',
                description: error instanceof Error ? error.message : 'No se pudo procesar la solicitud.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const columns: ColumnDef<RequestRow>[] = [
        {
            accessorKey: 'created_at',
            header: 'Fecha Solicitud',
            cell: ({ row }) => {
                const date = new Date(row.original.created_at);
                return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
            },
        },
        {
            accessorKey: 'document_type',
            header: 'Tipo Documento',
            cell: ({ row }) => (
                <Badge variant="outline" className="capitalize bg-surface text-primary border-primary/50">
                    {row.original.document_type}
                </Badge>
            ),
        },
        {
            accessorKey: 'socio_id',
            header: 'Socio',
            cell: ({ row }) => {
                const socio = row.original.socio_details;
                if (!socio) return 'Socio Desconocido';
                return (
                    <div className="font-medium">
                        {socio.nombres} {socio.apellidoPaterno}
                        <p className="text-xs text-textSecondary mt-0.5">DNI: {socio.dni}</p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'requested_by_email',
            header: 'Solicitado Por',
            cell: ({ row }) => (
                <span className="text-sm text-textSecondary">{row.original.requested_by_email}</span>
            ),
        },
        {
            accessorKey: 'request_status',
            header: 'Estado',
            cell: ({ row }) => {
                const status = row.original.request_status;
                let variant: 'default' | 'success' | 'destructive' | 'warning' = 'default';
                let text: string = status;

                if (status === 'Pending') {
                    variant = 'warning';
                    text = 'Pendiente';
                } else if (status === 'Approved') {
                    variant = 'success';
                    text = 'Aprobado';
                } else if (status === 'Rejected') {
                    variant = 'destructive';
                    text = 'Rechazado';
                }

                return <Badge variant={variant} className="capitalize">{text}</Badge>;
            },
        },
        {
            id: 'actions',
            header: 'Acciones',
            cell: ({ row }) => {
                const request = row.original;
                const isPending = request.request_status === 'Pending';
                const isCurrentProcessing = isProcessing === request.id;

                return (
                    <div className="flex space-x-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            asChild
                            className="h-8 w-8 text-primary border-primary/50 hover:bg-primary/10"
                        >
                            <a href={request.document_link} target="_blank" rel="noopener noreferrer" aria-label="Ver Documento">
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                        
                        {isPending && (
                            <>
                                <Button
                                    variant="success"
                                    size="icon"
                                    onClick={() => handleAction(request.id, 'Approved')}
                                    disabled={isCurrentProcessing}
                                    className="h-8 w-8"
                                >
                                    {isCurrentProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => handleAction(request.id, 'Rejected')}
                                    disabled={isCurrentProcessing}
                                    className="h-8 w-8"
                                >
                                    {isCurrentProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Gestión de Solicitudes de Eliminación</h2>
            <p className="text-textSecondary">Revisa y aprueba o rechaza las peticiones de borrado de documentos sensibles.</p>
            <DataTable
                columns={columns}
                data={data}
                isLoading={isLoading}
                className="min-h-[400px]"
            />
        </div>
    );
};

export default DeletionRequestsTable;
