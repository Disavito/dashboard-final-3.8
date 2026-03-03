import { supabase } from '../supabaseClient';
import { Tables, TablesInsert, TablesUpdate } from '../database.types';
import { format, parseISO, differenceInMinutes } from 'date-fns';

export type Jornada = Tables<'registros_jornada'>;
export type Colaborador = Tables<'colaboradores'>;

/**
 * Calcula los minutos totales trabajados en una jornada, descontando el almuerzo
 */
export const calculateWorkedMinutesForJornada = (jornada: Jornada): number => {
  if (!jornada.hora_inicio_jornada || !jornada.hora_fin_jornada) return 0;

  const inicio = parseISO(jornada.hora_inicio_jornada);
  const fin = parseISO(jornada.hora_fin_jornada);
  
  let totalMinutes = differenceInMinutes(fin, inicio);

  // Descontar almuerzo si ambos registros existen
  if (jornada.hora_inicio_almuerzo && jornada.hora_fin_almuerzo) {
    const inicioAlmuerzo = parseISO(jornada.hora_inicio_almuerzo);
    const finAlmuerzo = parseISO(jornada.hora_fin_almuerzo);
    const lunchMinutes = differenceInMinutes(finAlmuerzo, inicioAlmuerzo);
    totalMinutes -= Math.max(0, lunchMinutes);
  }

  return Math.max(0, totalMinutes);
};

/**
 * Obtiene el perfil de colaborador asociado a un usuario de Auth
 */
export const getColaboradorProfile = async (userId: string): Promise<Colaborador | null> => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Obtiene todos los colaboradores (para filtros de admin)
 */
export const getAllColaboradores = async (): Promise<Colaborador[]> => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

/**
 * Obtiene jornadas filtradas por rango de fechas y/o colaborador
 */
export const getAdminJornadas = async (filters: { 
  startDate: string; 
  endDate: string; 
  colaboradorId?: string 
}) => {
  let query = supabase
    .from('registros_jornada')
    .select(`
      *,
      colaboradores (
        id,
        name,
        apellidos,
        dni
      )
    `)
    .gte('fecha', filters.startDate)
    .lte('fecha', filters.endDate)
    .order('fecha', { ascending: false });

  if (filters.colaboradorId && filters.colaboradorId !== 'todos') {
    query = query.eq('colaborador_id', filters.colaboradorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Obtiene el registro de jornada de un colaborador para una fecha específica
 */
export const getJornadaByDate = async (colaboradorId: string, date: Date = new Date()): Promise<Jornada | null> => {
  const fecha = format(date, 'yyyy-MM-dd');
  const { data, error } = await supabase
    .from('registros_jornada')
    .select('*')
    .eq('colaborador_id', colaboradorId)
    .eq('fecha', fecha)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

/**
 * Inicia la jornada (Clock In)
 */
export const clockIn = async (
  colaboradorId: string, 
  justificacion?: string, 
  observaciones?: string
): Promise<Jornada> => {
  const now = new Date();
  const newJornada: TablesInsert<'registros_jornada'> = {
    colaborador_id: colaboradorId,
    fecha: format(now, 'yyyy-MM-dd'),
    hora_inicio_jornada: now.toISOString(),
    justificacion_inicio: justificacion || null,
    observaciones_inicio: observaciones || null,
  };

  const { data, error } = await supabase
    .from('registros_jornada')
    .insert(newJornada)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Error al iniciar jornada");
  return data;
};

/**
 * Finaliza la jornada (Clock Out)
 */
export const clockOut = async (
  jornadaId: number, 
  justificacion?: string, 
  observaciones?: string
): Promise<Jornada> => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .update({ 
      hora_fin_jornada: new Date().toISOString(),
      justificacion_fin: justificacion || null,
      observaciones_fin: observaciones || null
    })
    .eq('id', jornadaId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Error al finalizar jornada");
  return data;
};

/**
 * Inicia el tiempo de almuerzo
 */
export const startLunch = async (jornadaId: number) => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .update({ hora_inicio_almuerzo: new Date().toISOString() })
    .eq('id', jornadaId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Finaliza el tiempo de almuerzo
 */
export const endLunch = async (jornadaId: number) => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .update({ hora_fin_almuerzo: new Date().toISOString() })
    .eq('id', jornadaId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Función para que los administradores actualicen cualquier campo de la jornada
 */
export const adminUpdateJornada = async (
  jornadaId: number, 
  updates: TablesUpdate<'registros_jornada'>
): Promise<Jornada> => {
  const { data, error } = await supabase
    .from('registros_jornada')
    .update(updates)
    .eq('id', jornadaId)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message || "Error al actualizar jornada");
  return data;
};
