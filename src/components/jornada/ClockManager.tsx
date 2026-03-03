import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Colaborador, getJornadaByDate, clockIn, startLunch, endLunch, clockOut } from '@/lib/api/jornadaApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Coffee, 
  LogOut, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClockManagerProps {
  colaborador: Colaborador;
  bypassTimeRestrictions?: boolean; // Añadido para soporte de Admin
}

const JUSTIFICATION_OPTIONS = [
  "Tardanza",
  "Error del sistema",
  "Error de persona",
  "Trabajo de campo",
  "Permiso administrativo",
  "Cita médica"
];

const ClockManager: React.FC<ClockManagerProps> = ({ colaborador, bypassTimeRestrictions = false }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [jornada, setJornada] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [showJustification, setShowJustification] = useState(false);
  const [pendingAction, setPendingAction] = useState<'clock-in' | 'clock-out' | null>(null);
  const [justification, setJustification] = useState<string>("");
  const [observations, setObservations] = useState('');

  const fetchTodayJornada = useCallback(async () => {
    try {
      const data = await getJornadaByDate(colaborador.id, new Date());
      setJornada(data);
    } catch (error) {
      console.error('Error fetching jornada:', error);
    } finally {
      setLoading(false);
    }
  }, [colaborador.id]);

  useEffect(() => {
    fetchTodayJornada();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [fetchTodayJornada]);

  const isOutsideWindow = (type: 'entry' | 'exit'): boolean => {
    if (bypassTimeRestrictions) return false; // Si es admin, nunca está fuera de ventana

    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (type === 'entry') {
      const startLimit = 9 * 60 + 20; // 09:20
      const endLimit = 9 * 60 + 45;   // 09:45
      return totalMinutes < startLimit || totalMinutes > endLimit;
    } else {
      const startLimit = 18 * 60 + 20; // 18:20
      const endLimit = 18 * 60 + 40;   // 18:40
      return totalMinutes < startLimit || totalMinutes > endLimit;
    }
  };

  const handleActionInitiate = (action: 'clock-in' | 'clock-out') => {
    const needsJustification = isOutsideWindow(action === 'clock-in' ? 'entry' : 'exit');
    
    if (needsJustification) {
      setPendingAction(action);
      setShowJustification(true);
      setJustification(""); 
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (action: 'clock-in' | 'start-lunch' | 'end-lunch' | 'clock-out') => {
    setActionLoading(true);
    try {
      let result;
      if (action === 'clock-in') {
        result = await clockIn(colaborador.id, justification, observations);
      } else if (action === 'clock-out') {
        result = await clockOut(jornada.id, justification, observations);
      } else if (action === 'start-lunch') {
        result = await startLunch(jornada.id);
      } else if (action === 'end-lunch') {
        result = await endLunch(jornada.id);
      }
      
      setJornada(result);
      setShowJustification(false);
      setJustification('');
      setObservations('');
      setPendingAction(null);
      toast.success('Registro guardado correctamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al procesar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  const hasStarted = !!jornada?.hora_inicio_jornada;
  const hasStartedLunch = !!jornada?.hora_inicio_almuerzo;
  const hasEndedLunch = !!jornada?.hora_fin_almuerzo;
  const hasEnded = !!jornada?.hora_fin_jornada;

  if (loading) return <div className="p-8 text-center font-medium text-slate-500">Sincronizando...</div>;

  return (
    <div className="max-w-md mx-auto bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-[#9E7FFF] p-8 pb-12 text-white relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">{colaborador.name} {colaborador.apellidos}</h2>
          <p className="text-white/80 text-sm mt-1 capitalize">
            {format(currentTime, "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
          <div className="mt-6">
            {hasEnded ? (
              <Badge className="bg-white/20 text-white border-none px-4 py-1 rounded-full">JORNADA FINALIZADA</Badge>
            ) : hasStarted ? (
              <Badge className="bg-emerald-400 text-emerald-950 border-none px-4 py-1 rounded-full flex items-center gap-2 w-fit">
                <span className="w-2 h-2 bg-emerald-900 rounded-full animate-pulse" /> EN ACTIVIDAD
              </Badge>
            ) : (
              <Badge className="bg-white/10 text-white/70 border-none px-4 py-1 rounded-full">ESPERANDO INICIO</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 -mt-6 relative z-20">
        {/* Relojes de Marcación */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Entrada</p>
            <p className="text-2xl font-mono font-bold text-gray-800">
              {jornada?.hora_inicio_jornada ? format(new Date(jornada.hora_inicio_jornada), 'HH:mm:ss') : '--:--:--'}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Salida</p>
            <p className="text-2xl font-mono font-bold text-gray-800">
              {jornada?.hora_fin_jornada ? format(new Date(jornada.hora_fin_jornada), 'HH:mm:ss') : '--:--:--'}
            </p>
          </div>
        </div>

        {/* FORMULARIO DE JUSTIFICACIÓN */}
        {showJustification && (
          <div className="mt-6 p-6 bg-amber-50 rounded-3xl border border-amber-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-2 text-amber-700 mb-4">
              <AlertCircle className="h-5 w-5" />
              <span className="font-bold text-sm">Registro fuera de horario</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-amber-800/60 uppercase">Motivo Obligatorio</Label>
                <Select value={justification} onValueChange={setJustification}>
                  <SelectTrigger className="w-full h-12 bg-white border-amber-200 rounded-xl">
                    <SelectValue placeholder="Seleccione un motivo..." />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {JUSTIFICATION_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-amber-800/60 uppercase">Observaciones</Label>
                <Textarea 
                  placeholder="Detalle el motivo..."
                  className="bg-white border-amber-200 rounded-xl min-h-[80px] resize-none"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </div>

              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-12 font-bold"
                onClick={() => pendingAction && executeAction(pendingAction)}
                disabled={!justification || actionLoading}
              >
                {actionLoading ? "Guardando..." : "Confirmar y Registrar"}
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full text-amber-700/50 text-xs"
                onClick={() => {
                  setShowJustification(false);
                  setPendingAction(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        <div className="py-8 space-y-3">
          {!hasStarted && !showJustification && (
            <Button
              size="lg"
              onClick={() => handleActionInitiate('clock-in')}
              disabled={actionLoading}
              className="w-full h-16 bg-[#9E7FFF] hover:bg-[#8B6EEF] text-white rounded-2xl text-lg font-bold shadow-xl shadow-purple-100 transition-all active:scale-95"
            >
              <Play className="mr-2 h-5 w-5 fill-current" /> Iniciar Jornada
            </Button>
          )}

          {hasStarted && !hasEnded && !showJustification && (
            <>
              {!hasStartedLunch && (
                <Button
                  size="lg"
                  onClick={() => executeAction('start-lunch')}
                  disabled={actionLoading}
                  className="w-full h-16 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-2xl text-lg font-bold shadow-lg shadow-amber-100 transition-all active:scale-95"
                >
                  <Coffee className="mr-2 h-5 w-5" /> Iniciar Almuerzo
                </Button>
              )}

              {hasStartedLunch && !hasEndedLunch && (
                <Button
                  size="lg"
                  onClick={() => executeAction('end-lunch')}
                  disabled={actionLoading}
                  className="w-full h-16 bg-[#10B981] hover:bg-[#059669] text-white rounded-2xl text-lg font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  <Clock className="mr-2 h-5 w-5" /> Finalizar Almuerzo
                </Button>
              )}

              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleActionInitiate('clock-out')}
                disabled={(hasStartedLunch && !hasEndedLunch) || actionLoading}
                className="w-full h-16 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-2xl text-lg font-bold shadow-lg shadow-red-100 transition-all active:scale-95"
              >
                <LogOut className="mr-2 h-5 w-5" /> Finalizar Jornada
              </Button>
            </>
          )}

          {hasEnded && (
            <div className="text-center p-8 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-600 font-bold">Jornada Completada</p>
              <p className="text-xs text-slate-400 mt-1">¡Buen descanso!</p>
            </div>
          )}
        </div>
      </div>

      {/* Info de Ventanas */}
      <div className="px-8 pb-8">
        <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ventana Entrada</p>
            <p className="text-xs font-bold text-slate-600">09:20 - 09:45</p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Ventana Salida</p>
            <p className="text-xs font-bold text-slate-600">18:20 - 18:40</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClockManager;
