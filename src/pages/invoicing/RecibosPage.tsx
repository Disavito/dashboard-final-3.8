import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search, FileText, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ReciboPagoFormSchema, ReciboPagoFormValues } from '@/lib/types/invoicing';
import { fetchClientByDocument, fetchNextReceiptCorrelative, createIncomeFromBoleta, saveReceiptPdfToSupabase } from '@/lib/api/invoicingApi';
import { Client } from '@/lib/types/invoicing';
import { TablesInsert } from '@/lib/database.types';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabaseClient';

const PAYMENT_METHODS = [
  { value: 'BBVA Empresa', label: 'BBVA Empresa' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Cuenta Fidel', label: 'Cuenta Fidel' },
];

export default function RecibosPage() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correlative, setCorrelative] = useState('');
  const [clientData, setClientData] = useState<Client | null>(null);

  const form = useForm<ReciboPagoFormValues>({
    resolver: zodResolver(ReciboPagoFormSchema),
    defaultValues: {
      dni: '',
      client_name: '',
      client_id: null,
      fecha_emision: format(new Date(), 'yyyy-MM-dd'),
      monto: 250.00,
      concepto: 'Elaboracion de Expediente Tecnico',
      metodo_pago: 'Efectivo',
      numero_operacion: '',
      is_payment_observed: false,
      payment_observation_detail: '',
    },
  });

  const dni = form.watch('dni');
  const metodoPago = form.watch('metodo_pago');
  const watchedIsPaymentObserved = form.watch('is_payment_observed');

  const loadCorrelative = async () => {
    try {
        const nextCorrelative = await fetchNextReceiptCorrelative();
        setCorrelative(nextCorrelative);
    } catch (error) {
        console.error(error);
        toast({
          title: "Error de Correlativo",
          description: "No se pudo obtener el número de recibo.",
          variant: "destructive",
        });
    }
  };

  useEffect(() => {
    loadCorrelative();
  }, []);

  const handleDniSearch = async () => {
    if (!dni || dni.length !== 8) return;

    setIsSearching(true);
    try {
      const client = await fetchClientByDocument(dni);
      if (client) {
        setClientData(client);
        form.setValue('client_name', client.razon_social);
        form.setValue('client_id', client.id || null);
      } else {
        toast({ title: "No encontrado", description: "Socio no registrado.", variant: "warning" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Error al buscar socio.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const onSubmit = async (values: ReciboPagoFormValues) => {
    if (!clientData?.id || !correlative) return;

    setIsSubmitting(true);
    try {
        const receiptData = {
            correlative,
            client_full_name: clientData.razon_social,
            client_dni: clientData.numero_documento,
            fecha_emision: values.fecha_emision,
            monto: values.monto,
            concepto: values.concepto,
            metodo_pago: values.metodo_pago,
            numero_operacion: values.numero_operacion,
        };
        
        const { generateReceiptPdf } = await import('@/lib/receiptPdfGenerator');
        const pdfBlob = await generateReceiptPdf(receiptData);

        await saveReceiptPdfToSupabase(pdfBlob, correlative, clientData.id);

        const incomeData: Omit<TablesInsert<'ingresos'>, 'id' | 'created_at'> = {
            receipt_number: correlative,
            dni: values.dni,
            full_name: clientData.razon_social,
            amount: values.monto,
            account: values.metodo_pago,
            date: values.fecha_emision,
            transaction_type: 'Recibo de Pago',
            numeroOperacion: values.metodo_pago === 'BBVA Empresa' ? Number(values.numero_operacion) : null,
        };

        await createIncomeFromBoleta(incomeData);

        if (values.is_payment_observed) {
            await supabase.from('socio_titulares').update({
                is_payment_observed: true,
                payment_observation_detail: values.payment_observation_detail || null,
            }).eq('id', clientData.id);
        }

        toast({
            title: "Recibo Generado",
            description: `Recibo ${correlative} registrado con éxito.`,
            action: (
                <Button onClick={() => {
                    const url = window.URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${correlative}.pdf`;
                    link.click();
                }} variant="secondary" size="sm">Descargar</Button>
            )
        });

        form.reset();
        setClientData(null);
        loadCorrelative();
    } catch (error) {
        toast({ title: "Error", description: "No se pudo generar el recibo.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Wallet className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Emitir Recibo de Pago</h1>
          <p className="text-sm text-textSecondary text-balance">Generación de comprobantes internos y registro de ingresos.</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-border/50">
            <span className="text-sm font-medium text-textSecondary uppercase tracking-wider">Comprobante Interno</span>
            <div className="text-right">
                <span className="text-xs text-textSecondary block">N° Correlativo</span>
                <span className="text-xl font-mono font-bold text-primary">{correlative || 'Cargando...'}</span>
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI del Socio</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="8 dígitos" {...field} maxLength={8} className="bg-background" />
                        </FormControl>
                        <Button type="button" onClick={handleDniSearch} disabled={isSearching || dni.length !== 8}>
                          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fecha_emision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl><Input {...field} readOnly className="bg-muted/50" /></FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="monto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto (S/.)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} className="bg-background font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metodo_pago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pago</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
            </div>

            <FormField
              control={form.control}
              name="concepto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl><Input {...field} className="bg-background" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {metodoPago === 'BBVA Empresa' && (
              <FormField
                control={form.control}
                name="numero_operacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° Operación</FormLabel>
                    <FormControl><Input {...field} className="bg-background" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="p-4 rounded-lg border border-warning/20 bg-warning/5 space-y-4">
                <FormField
                    control={form.control}
                    name="is_payment_observed"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="text-warning font-semibold">Observar Pago</FormLabel>
                                <FormDescription className="text-xs">Marcar si el pago requiere revisión interna.</FormDescription>
                            </div>
                        </FormItem>
                    )}
                />

                {watchedIsPaymentObserved && (
                    <FormField
                        control={form.control}
                        name="payment_observation_detail"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea 
                                        placeholder="Detalle de la observación..." 
                                        className="bg-background" 
                                        {...field} 
                                        value={field.value ?? ''}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={isSubmitting || !clientData}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Generar Recibo e Ingreso
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
