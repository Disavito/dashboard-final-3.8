import { supabase } from '@/lib/supabaseClient';

export interface SocioDocument {
  id: number;
  socio_id: string;
  tipo_documento: 'Planos de ubicación' | 'Memoria descriptiva';
  link_documento: string;
  created_at: string;
}

export const fetchSocioDocuments = async (socioId: string) => {
  const { data, error } = await supabase
    .from('socio_documentos')
    .select('*')
    .eq('socio_id', socioId);

  if (error) throw error;
  return data as SocioDocument[];
};

export const searchSocios = async (query: string) => {
  const { data, error } = await supabase
    .from('socio_titulares')
    .select('id, nombres, apellidoPaterno, apellidoMaterno, dni')
    .or(`nombres.ilike.%${query}%,apellidoPaterno.ilike.%${query}%,dni.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data;
};
