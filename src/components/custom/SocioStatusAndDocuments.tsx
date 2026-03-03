import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from '@/context/UserContext';
import { 
  Loader2, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Map as MapIcon,
  FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';
import { UploadDocumentModal, ManualDocumentType } from '@/components/custom/UploadDocumentModal';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';

interface SocioStatusAndDocumentsProps {
  socioId: string;
}

interface Lot {
  id: string;
  mz: string;
  lote: string;
  is_lote_medido: boolean;
  isPrimary: boolean;
  fullName: string;
  dni: string;
  paymentStatus: 'Pagado' | 'Pendiente' | 'Atrasado';
  receiptNumber: string;
  documentos: any[];
}

function SocioStatusAndDocuments({ socioId }: SocioStatusAndDocumentsProps) {
  const { roles } = useUser();
  const isAdmin = roles?.includes('admin') ?? false; // Asegurar que isAdmin sea siempre boolean

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    socioId: string;
    socioName: string;
    type: ManualDocumentType | null;
  }>({ isOpen: false, socioId: '', socioName: '', type: null });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    docId: string;
    docType: string;
    socioName: string;
  }>({ isOpen: false, docId: '', docType: '', socioName: '' });

  const fetchData = useCallback(async () => {
    if (!socioId) return;
    setIsLoading(true);
    try {
      const { data: socio, error: socioError } = await supabase
        .from('socio_titulares')
        .select('*')
        .eq('id', socioId)
        .single();

      if (socioError) throw socioError;

      const { data: docsData } = await supabase.from('socio_documentos').select('*').eq('socio_id', socioId);
      const { data: incomesData } = await supabase.from('ingresos').select('socio_id, nro_recibo').eq('socio_id', socioId);

      const socioFullName = `${socio.nombres} ${socio.apellidoPaterno} ${socio.apellidoMaterno}`;
      
      const primaryLot: Lot = {
        id: socioId,
        mz: socio.mz || 'N/A',
        lote: socio.lote || 'N/A',
        is_lote_medido: socio.is_lote_medido || false,
        isPrimary: true,
        fullName: socioFullName,
        dni: socio.dni || 'N/A',
        paymentStatus: incomesData && incomesData.length > 0 ? 'Pagado' : 'Pendiente',
        receiptNumber: incomesData?.[0]?.nro_recibo || 'N/A',
        documentos: docsData || []
      };

      // Simulación de lotes adicionales
      const mockLots: Lot[] = [
        {
          id: 'mock-1',
          mz: 'B',
          lote: '12',
          is_lote_medido: false,
          isPrimary: false,
          fullName: socioFullName,
          dni: socio.dni || 'N/A',
          paymentStatus: 'Atrasado',
          receiptNumber: 'N/A',
          documentos: []
        }
      ];

      const allLots = [primaryLot, ...mockLots];
      setLots(allLots);
      setSelectedLotIds(allLots.filter(l => l.is_lote_medido).map(l => l.id));

    } catch (error: any) {
      toast.error('Error al cargar datos', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [socioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBulkUpdate = async () => {
    setIsSubmitting(true);
    try {
      const primaryLot = lots.find(l => l.isPrimary);
      if (!primaryLot) return;
      const isNowMeasured = selectedLotIds.includes(primaryLot.id);

      const { error } = await supabase
        .from('socio_titulares')
        .update({ is_lote_medido: isNowMeasured })
        .eq('id', socioId);

      if (error) throw error;
      toast.success('Expediente actualizado');
      fetchData();
    } catch (error: any) {
      toast.error('Error al guardar', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="p-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
      <div className="relative">
        <div className="absolute inset-0 bg-[#9E7FFF]/20 blur-xl rounded-full animate-pulse"></div>
        <Loader2 className="h-12 w-12 animate-spin text-[#9E7FFF] relative z-10" />
      </div>
      <p className="mt-6 text-gray-400 font-medium tracking-tight">Sincronizando expediente técnico...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      <div className="relative overflow-hidden bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm group">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[#9E7FFF]/5 rounded-full blur-3xl group-hover:bg-[#9E7FFF]/10 transition-colors duration-500"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-[#F0EEFF] rounded-2xl shadow-inner">
              <Layers className="w-7 h-7 text-[#9E7FFF]" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Expediente de Ingeniería</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <FileCheck className="w-3 h-3" /> {lots.length} Lotes Vinculados
                </span>
                <span className="text-gray-300">•</span>
                <p className="text-sm text-gray-500 font-medium">Control de medición y planimetría</p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleBulkUpdate} 
            disabled={isSubmitting}
            className="bg-[#9E7FFF] hover:bg-[#8B6EEF] text-white shadow-xl shadow-[#9E7FFF]/20 px-8 py-6 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
            Confirmar Cambios de Ingeniería
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/40">
            <TableRow className="hover:bg-transparent border-b border-gray-100/50">
              <TableHead className="w-[180px] py-6 pl-8 font-bold text-gray-400 text-[11px] uppercase tracking-widest">Estado Medición</TableHead>
              <TableHead className="font-bold text-gray-400 text-[11px] uppercase tracking-widest">Ubicación Técnica</TableHead>
              <TableHead className="font-bold text-gray-400 text-[11px] uppercase tracking-widest">Finanzas</TableHead>
              <TableHead className="font-bold text-gray-400 text-[11px] uppercase tracking-widest">Documentación Activa</TableHead>
              <TableHead className="text-right pr-8 font-bold text-gray-400 text-[11px] uppercase tracking-widest">Gestión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.map((lot) => (
              <TableRow key={lot.id} className="group hover:bg-[#F8F9FC]/80 transition-all duration-300 border-b border-gray-50 last:border-0">
                <TableCell className="pl-8 py-6">
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedLotIds.includes(lot.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedLotIds([...selectedLotIds, lot.id]);
                        else setSelectedLotIds(selectedLotIds.filter(id => id !== lot.id));
                      }}
                      className="w-5 h-5 rounded-md border-gray-300 data-[state=checked]:bg-[#9E7FFF] data-[state=checked]:border-[#9E7FFF] transition-all"
                    />
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md w-fit",
                        selectedLotIds.includes(lot.id) 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      )}>
                        {selectedLotIds.includes(lot.id) ? 'Medido' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-gray-100">
                      <MapIcon className="w-5 h-5 text-gray-400 group-hover:text-[#9E7FFF] transition-colors" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-base">Mz. {lot.mz} — Lote {lot.lote}</span>
                      <span className="text-[11px] font-bold text-[#9E7FFF] uppercase tracking-tight">
                        {lot.isPrimary ? 'Predio Principal' : 'Predio Adicional'}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    {lot.paymentStatus === 'Pagado' ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        Al día
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                        Deuda pendiente
                      </div>
                    )}
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded w-fit">
                      REC: {lot.receiptNumber}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap gap-2 max-w-[300px]">
                    {lot.documentos.length > 0 ? (
                      lot.documentos.map((doc, idx) => (
                        <DocumentLinkPill
                          key={idx}
                          type={doc.tipo_documento}
                          link={doc.link_documento}
                          isAdmin={isAdmin} // Ahora es boolean
                          socioId={lot.id}
                          documentId={doc.id}
                        />
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-gray-300 italic text-xs">
                        <AlertCircle className="w-3 h-3" /> Sin archivos
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-right pr-8">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 rounded-xl border-gray-200 hover:border-[#9E7FFF]/30 hover:bg-[#F0EEFF] hover:text-[#9E7FFF] font-bold text-[11px]"
                      onClick={() => setUploadModal({ 
                        isOpen: true, 
                        socioId: lot.id, 
                        socioName: lot.fullName, 
                        type: 'Planos de ubicación' 
                      })}
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Planos
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 rounded-xl border-gray-200 hover:border-[#9E7FFF]/30 hover:bg-[#F0EEFF] hover:text-[#9E7FFF] font-bold text-[11px]"
                      onClick={() => setUploadModal({ 
                        isOpen: true, 
                        socioId: lot.id, 
                        socioName: lot.fullName, 
                        type: 'Memoria descriptiva' 
                      })}
                    >
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Memoria
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UploadDocumentModal
        isOpen={uploadModal.isOpen}
        onOpenChange={(open) => setUploadModal(prev => ({ ...prev, isOpen: open }))}
        socioId={uploadModal.socioId}
        socioName={uploadModal.socioName}
        documentType={uploadModal.type}
        onUploadSuccess={fetchData}
      />

      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('solicitudes_eliminacion_documentos').insert({
            documento_id: deleteConfirm.docId,
            solicitado_por: user?.id,
            motivo: 'Solicitud desde gestión de ingeniería',
            estado: 'pendiente'
          });
          toast.success('Solicitud de eliminación enviada al administrador');
          setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
        }}
        title="Solicitar Eliminación"
        description={`¿Estás seguro de que deseas solicitar la eliminación de "${deleteConfirm.docType}"? Esta acción requiere aprobación.`}
        confirmText="Enviar Solicitud"
        variant="destructive"
      />
    </div>
  );
}

export default SocioStatusAndDocuments;
