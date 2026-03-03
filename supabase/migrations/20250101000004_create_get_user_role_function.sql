-- Función para obtener el nombre del rol de un usuario, utilizada en las políticas RLS.
-- Consulta las tablas user_roles y roles.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT r.role_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id
  ORDER BY r.role_name DESC -- Prioriza roles como 'admin' si hay múltiples
  LIMIT 1;
$$;

-- Asegurar que la función pueda ser ejecutada por todos los usuarios (incluyendo anon y authenticated)
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, authenticated;
