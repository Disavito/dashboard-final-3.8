import { useState, useEffect, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Edit, Loader2, Search, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { Ingreso as IngresoType } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatCurrency } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useDebounce } from 'use-debounce';
import TransactionForm from '@/components/custom/TransactionForm';

function Income() {
  const { data: incomeData, loading, refreshData } = useSupabaseData<IngresoType>({
    tableName: 'ingresos',
    selectQuery: '*, socio_titulares!dni(localidad)', 
  });
  
  const { loading: userLoading } = useUser();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const [selectedLocalidadFilter, setSelectedLocalidadFilter] = useState<string>('all');
  const [uniqueLocalities, setUniqueLocalities] = useState<string[]>([]);

  useEffect(() => {
    const fetchLocs = async () => {
      const { data } = await supabase.from('socio_titulares').select('localidad').neq('localidad', '');
      if (data) {
        const unique = Array.from(new Set(data.map(i => i.localidad))).filter(Boolean).sort() as string[];
        setUniqueLocalities(unique);
      }
    };
    fetchLocs();
  }, []);

  const handleSuccess = () => {
    setIsDialogOpen(false);
    refreshData();
  };

  const filteredData = useMemo(() => {
    let result = [...incomeData];

    if (selectedLocalidadFilter !== 'all') {
      result = result.filter(i => i.socio_titulares?.localidad === selectedLocalidadFilter);
    }

    const searchTerm = debouncedSearch.toLowerCase().trim();
    if (searchTerm) {
      const normalize = (text: any) => 
        String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const searchWords = normalize(searchTerm).split(/\s+/).filter(word => word.length > 0);

      result = result.filter(item => {
        const searchableContent = normalize(`
          ${item.full_name} 
          ${item.dni} 
          ${item.receipt_number} 
          ${item.numeroOperacion || ''} 
          ${item.socio_titulares?.localidad || ''}
        `);
        return searchWords.every(word => searchableContent.includes(word));
      });
    }

    return result;
  }, [incomeData, debouncedSearch, selectedLocalidadFilter]);

  const incomeColumns: ColumnDef<IngresoType>[] = useMemo(() => [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }) => format(parseISO(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'receipt_number',
      header: 'Nº Recibo',
      cell: ({ row }) => <span className="font-mono font-bold text-slate-700">{row.getValue('receipt_number')}</span>,
    },
    {
      accessorKey: 'full_name',
      header: 'Socio',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold uppercase text-xs text-slate-900">{row.getValue('full_name')}</span>
          <span className="text-[10px] text-slate-500 font-medium">{row.original.socio_titulares?.localidad || 'Sin localidad'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'dni',
      header: 'DNI',
      cell: ({ row }) => <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{row.getValue('dni')}</span>,
    },
    {
      accessorKey: 'numeroOperacion',
      header: 'Operación',
      cell: ({ row }) => <span className="text-xs font-medium text-slate-500">{row.getValue('numeroOperacion') || '-'}</span>,
    },
    {
      accessorKey: 'amount',
      header: () => <div className="text-right">Monto</div>,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return (
          <div className={cn("text-right font-bold", amount >= 0 ? 'text-emerald-600' : 'text-red-600')}>
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: () => (
        <Button variant="ghost" size="icon" className="hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
          <Edit className="h-4 w-4" />
        </Button>
      ),
    },
  ], []);

  if (loading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
          <p className="text-slate-500 font-medium animate-pulse">Cargando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Ingresos</h1>
            <p className="text-slate-500 font-medium">Gestión y búsqueda avanzada de pagos</p>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-6 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Registro
          </Button>
        </header>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Busca por nombre, DNI, recibo u operación..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-12 h-14 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-medium placeholder:text-slate-400"
                />
                {searchInput && (
                  <button 
                    onClick={() => setSearchInput('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FilterX className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <Select value={selectedLocalidadFilter} onValueChange={setSelectedLocalidadFilter}>
                <SelectTrigger className="w-full lg:w-[280px] h-14 bg-slate-50 border-none rounded-2xl font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                  <SelectValue placeholder="Todas las Comunidades" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="all" className="font-medium">Todas las Comunidades</SelectItem>
                  {uniqueLocalities.map(loc => (
                    <SelectItem key={loc} value={loc} className="font-medium">{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <DataTable
                columns={incomeColumns}
                data={filteredData}
                isLoading={loading}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Registrar Nueva Transacción
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Complete los datos para registrar un ingreso, gasto o devolución.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <TransactionForm 
              onClose={() => setIsDialogOpen(false)} 
              onSuccess={handleSuccess} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Income;
