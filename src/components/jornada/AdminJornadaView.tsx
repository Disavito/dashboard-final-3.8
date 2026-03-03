import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAdminJornadas, getAllColaboradores, Jornada, Colaborador, calculateWorkedMinutesForJornada } from '@/lib/api/jornadaApi';
import { Calendar as CalendarIcon, Users, CalendarDays, GanttChartSquare, Pencil, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import EditJornadaModal from './EditJornadaModal';

type JornadaWithColaborador = Jornada & { colaboradores: Colaborador | null };

const AdminJornadaView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('day');
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState<JornadaWithColaborador | null>(null);

  const { startDate, endDate } = useMemo(() => {
    const start =
      filterType === 'week'
        ? startOfWeek(selectedDate, { weekStartsOn: 1 })
        : filterType === 'month'
        ? startOfMonth(selectedDate)
        : selectedDate;
    const end =
      filterType === 'week'
        ? endOfWeek(selectedDate, { weekStartsOn: 1 })
        : filterType === 'month'
        ? endOfMonth(selectedDate)
        : selectedDate;
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [selectedDate, filterType]);

  const { data: colaboradores, isLoading: isLoadingColaboradores } = useQuery({
    queryKey: ['allColaboradores'],
    queryFn: getAllColaboradores,
  });

  const { data: jornadas, isLoading, isError } = useQuery({
    queryKey: ['adminJornadas', startDate, endDate, selectedColaboradorId],
    queryFn: () => getAdminJornadas({ startDate, endDate, colaboradorId: selectedColaboradorId }),
  });

  const handleEditClick = (jornada: JornadaWithColaborador) => {
    setSelectedJornada(jornada);
    setIsModalOpen(true);
  };

  const getStatus = (jornada: JornadaWithColaborador): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (jornada.hora_fin_jornada) return { text: 'Finalizada', variant: 'default' };
    if (jornada.hora_fin_almuerzo) return { text: 'Trabajando', variant: 'secondary' };
    if (jornada.hora_inicio_almuerzo) return { text: 'En Almuerzo', variant: 'outline' };
    if (jornada.hora_inicio_jornada) return { text: 'Trabajando', variant: 'secondary' };
    return { text: 'Ausente', variant: 'destructive' };
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  const formatMinutesToHours = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const calculateWorkedHours = (jornada: Jornada): string => {
    const totalMinutes = calculateWorkedMinutesForJornada(jornada);
    return formatMinutesToHours(totalMinutes);
  };

  const renderDateRange = () => {
    if (filterType === 'day') return format(selectedDate, "PPP", { locale: es });
    if (filterType === 'week') return `Semana del ${format(parseISO(startDate), "d 'de' LLL", { locale: es })} al ${format(parseISO(endDate), "d 'de' LLL, yyyy", { locale: es })}`;
    if (filterType === 'month') return format(selectedDate, "LLLL yyyy", { locale: es });
    return 'Elige una fecha';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Colaborador</label>
            <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId} disabled={isLoadingColaboradores}>
              <SelectTrigger className="w-full">
                <Users className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Seleccionar colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los colaboradores</SelectItem>
                {colaboradores?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.apellidos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Fecha de Referencia</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>{renderDateRange()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d || new Date())} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Agrupar por</label>
            <ToggleGroup type="single" value={filterType} onValueChange={(value) => value && setFilterType(value as 'day' | 'week' | 'month')} className="w-full grid grid-cols-3">
              <ToggleGroupItem value="day"><CalendarDays className="h-4 w-4 mr-2" /> Día</ToggleGroupItem>
              <ToggleGroupItem value="week"><GanttChartSquare className="h-4 w-4 mr-2" /> Sem.</ToggleGroupItem>
              <ToggleGroupItem value="month"><CalendarIcon className="h-4 w-4 mr-2" /> Mes</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Tabla Principal de Registros */}
        {!isLoading && !isError && (
          <div className="border rounded-lg overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Inicio Jornada</TableHead>
                  <TableHead className="text-center">Almuerzo</TableHead>
                  <TableHead className="text-center">Fin Almuerzo</TableHead>
                  <TableHead className="text-center">Fin Jornada</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jornadas && jornadas.length > 0 ? (
                  jornadas.map((jornada) => (
                    <TableRow key={jornada.id} className="group">
                      <TableCell className="font-medium">
                        {jornada.colaboradores?.name} {jornada.colaboradores?.apellidos}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(jornada.fecha), "dd/MM/yy", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatus(jornada).variant}>{getStatus(jornada).text}</Badge>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono">{formatTime(jornada.hora_inicio_jornada)}</span>
                          {jornada.justificacion_inicio && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-warning font-medium bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 max-w-[120px]">
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <span className="truncate" title={jornada.justificacion_inicio}>
                                {jornada.justificacion_inicio}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono">{formatTime(jornada.hora_inicio_almuerzo)}</TableCell>
                      <TableCell className="text-center font-mono">{formatTime(jornada.hora_fin_almuerzo)}</TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono">{formatTime(jornada.hora_fin_jornada)}</span>
                          {jornada.justificacion_fin && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-warning font-medium bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20 max-w-[120px]">
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <span className="truncate" title={jornada.justificacion_fin}>
                                {jornada.justificacion_fin}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-primary">
                        {calculateWorkedHours(jornada)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(jornada)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No se encontraron registros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {selectedJornada && (
        <EditJornadaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          jornada={selectedJornada}
          onSuccess={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default AdminJornadaView;
