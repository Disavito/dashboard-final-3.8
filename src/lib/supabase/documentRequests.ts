import { supabase } from '@/lib/supabaseClient';

export interface DeletionRequestInput {
    document_id: string;
    document_type: string;
    document_link: string;
    socio_id: string;
    requested_by: string; // This is the UUID of the user
    // requested_by_email: string; // Removed as it does not exist in the DB schema
}

export const createDeletionRequest = async (input: DeletionRequestInput) => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .insert([
            {
                document_id: input.document_id,
                document_type: input.document_type,
                document_link: input.document_link,
                socio_id: input.socio_id,
                requested_by: input.requested_by,
                request_status: 'Pending'
            }
        ])
        .select();

    if (error) throw error;
    return data;
};

export const fetchDeletionRequests = async () => {
    const { data, error } = await supabase
        .from('document_deletion_requests')
        .select(`
            *,
            socio_details:socio_titulares(nombres, apellidoPaterno, dni)
        `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const updateDeletionRequestStatus = async (
    requestId: string, 
    status: 'Approved' | 'Rejected',
    adminId: string
) => {
    const { error } = await supabase
        .from('document_deletion_requests')
        .update({
            request_status: status,
            approved_at: new Date().toISOString(), // Cambiado de 'processed_at' a 'approved_at'
            approved_by: adminId // Cambiado de 'processed_by' a 'approved_by'
        })
        .eq('id', requestId);

    if (error) throw error;
};
