-- Crear la tabla para almacenar las solicitudes de eliminación de documentos
CREATE TABLE IF NOT EXISTS public.document_deletion_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.socio_documentos(id) ON DELETE CASCADE,
    socio_id uuid NOT NULL REFERENCES public.socio_titulares(id) ON DELETE CASCADE,
    requested_by uuid NOT NULL REFERENCES auth.users(id),
    document_type text NOT NULL,
    document_link text NOT NULL,
    request_status text NOT NULL DEFAULT 'Pending' CHECK (request_status IN ('Pending', 'Approved', 'Rejected')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid REFERENCES auth.users(id),
    approved_at timestamp with time zone
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.document_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para redefinirlas
DROP POLICY IF EXISTS "Admins can manage existing requests" ON public.document_deletion_requests;
DROP POLICY IF EXISTS "Engineers and Admins can insert requests" ON public.document_deletion_requests;
DROP POLICY IF EXISTS "Engineers can view their own requests" ON public.document_deletion_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.document_deletion_requests;
DROP POLICY IF EXISTS "Debug insert" ON public.document_deletion_requests;


-- 1. Política para Administradores (SELECT, UPDATE, DELETE)
-- Admins pueden ver, actualizar y eliminar cualquier solicitud.
CREATE POLICY "Admins can manage existing requests"
ON public.document_deletion_requests
FOR SELECT, UPDATE, DELETE
USING (
    (get_user_role(auth.uid()) = 'admin')
)
WITH CHECK (
    (get_user_role(auth.uid()) = 'admin')
);

-- 2. Política para Ingenieros y Administradores (INSERT) - Unificada y estricta
-- Permite la inserción solo si el usuario es Admin/Engineer Y el ID del solicitante coincide con el usuario autenticado.
CREATE POLICY "Enable insert for authenticated users with role"
ON public.document_deletion_requests
FOR INSERT
WITH CHECK (
    (get_user_role(auth.uid()) IN ('admin', 'engineer')) 
    AND 
    (auth.uid() = requested_by)
);

-- 3. Política para Ingenieros (SELECT solo)
-- Los ingenieros pueden ver sus propias solicitudes.
CREATE POLICY "Engineers can view their own requests"
ON public.document_deletion_requests
FOR SELECT
USING (
    (auth.uid() = requested_by)
);
