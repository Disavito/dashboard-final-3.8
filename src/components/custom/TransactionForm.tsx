import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Search, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { Cuenta } from '@/lib/types';
import { toast } from 'sonner';

const formSchema = z.object({
  accountName: z.string().min(1, "Seleccione una cuenta"),
  transactionType: z.enum(['Ingreso', 'Anulacion', 'Devolucion', 'Gasto']),
  dni: z.string().min(8, "DNI debe tener 8 dígitos").max(8),
  fullName: z.string().min(1, "El nombre es requerido"),
  receiptNumber: z.string().min(1, "Nº de recibo es requerido"),
  amount: z.number().min(0, "El monto no puede ser negativo"),
  date: z.date(),
  description: z.string().optional(),
  numeroOperacion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionForm({ onClose, onSuccess }: TransactionFormProps) {
  const [accounts, setAccounts] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: 'Ingreso',
      amount: 0,
      date: new Date(),
      dni: '',
      fullName: '',
      receiptNumber: '',
      accountName: '',
    },
  });

  const selectedType = form.watch('transactionType');
  const dniValue = form.watch('dni');

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data } = await supabase.from('cuentas').select('*').order('name');
      if (data) setAccounts(data);
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    const searchSocio = async () => {
      if (dniValue?.length === 8) {
        setIsSearchingDni(true);
        const { data } = await supabase
          .from('socio_titulares')
          .select('nombres, apellidoPaterno, apellidoMaterno')
          .eq('dni', dniValue)
          .single();

        if (data) {
          const name = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
          form.setValue('fullName', name);
          toast.success("Socio encontrado");
        } else {
          form.setValue('fullName', '');
          toast.error("DNI no registrado en socios");
        }
        setIsSearchingDni(false);
      }
    };
    searchSocio();
  }, [dniValue, form]);

  useEffect(() => {
    if (selectedType === 'Anulacion') {
      form.setValue('amount', 0);
    }
  }, [selectedType, form]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      const finalAmount = values.transactionType === 'Devolucion' 
        ? -Math.abs(values.amount) 
        : values.amount;

      const { error } = await supabase.from('ingresos').insert({
        account: values.accountName,
        amount: finalAmount,
        date: format(values.date, 'yyyy-MM-dd'),
        transaction_type: values.transactionType,
        receipt_number: values.receiptNumber,
        dni: values.dni,
        full_name: values.fullName,
        numeroOperacion: values.numeroOperacion,
      });

      if (error) throw error;

      toast.success('Transacción registrada correctamente');
      onSuccess();
    } catch (error: any) {
      toast.error('Error al registrar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-slate-700">Tipo de Operación</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 border-slate-200 rounded-xl focus:ring-indigo-500">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ingreso">Ingreso Normal</SelectItem>
                    <SelectItem value="Anulacion">Anulación (S/. 0.00)</SelectItem>
                    <SelectItem value="Devolucion">Devolución</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accountName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-slate-700">Cuenta de Destino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Seleccione cuenta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dni"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-slate-700">DNI del Socio</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        placeholder="8 dígitos" 
                        className="h-12 pl-10 border-slate-200 rounded-xl"
                        maxLength={8}
                      />
                      {isSearchingDni ? (
                        <Loader2 className="absolute left-3 top-3.5 h-5 w-5 animate-spin text-indigo-500" />
                      ) : (
                        <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-slate-700">Nombre Completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        {...field} 
                        readOnly 
                        className="h-12 pl-10 bg-white border-slate-200 rounded-xl font-semibold text-slate-600"
                      />
                      <UserCheck className="absolute left-3 top-3.5 h-5 w-5 text-emerald-500" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="receiptNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-slate-700">Nº Recibo</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ej: 001-00045" className="h-12 border-slate-200 rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold text-slate-700">Monto (S/.)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    {...field} 
                    onChange={e => field.onChange(parseFloat(e.target.value))}
                    disabled={selectedType === 'Anulacion'}
                    className={cn(
                      "h-12 border-slate-200 rounded-xl font-bold text-lg",
                      selectedType === 'Anulacion' && "bg-slate-100 text-slate-400"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="font-bold text-slate-700 mb-2">Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "h-12 pl-3 text-left font-normal border-slate-200 rounded-xl",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="numeroOperacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold text-slate-700">Nº Operación / Referencia (Opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: 982341" className="h-12 border-slate-200 rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-600"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="flex-[2] h-12 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Registrar Transacción"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
