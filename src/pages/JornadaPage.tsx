import { useUser } from '@/context/UserContext';
import { useQuery } from '@tanstack/react-query';
import { getColaboradorProfile } from '@/lib/api/jornadaApi';
import { Loader2, UserX } from 'lucide-react'; // Corregido: era lucide-center
import ClockManager from '@/components/jornada/ClockManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminJornadaView from '@/components/jornada/AdminJornadaView';
import AdminClockManager from '@/components/jornada/AdminClockManager';

const JornadaPage = () => {
  const { user, roles } = useUser();
  const isAdmin = roles?.includes('admin') || roles?.includes('finanzas_senior');

  const { data: colaborador, isLoading, isError } = useQuery({
    queryKey: ['colaboradorProfile', user?.id],
    queryFn: () => getColaboradorProfile(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg">Cargando tu perfil de colaborador...</p>
      </div>
    );
  }

  if (isError || !colaborador) {
    return (
      <Alert variant="destructive">
        <UserX className="h-4 w-4" />
        <AlertTitle>Error de Perfil</AlertTitle>
        <AlertDescription>
          No se encontró un perfil de colaborador vinculado a tu cuenta.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <Tabs defaultValue="mi-jornada" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mi-jornada">Mi Jornada</TabsTrigger>
            <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
            <TabsTrigger value="registro-manual">Registro Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="mi-jornada">
            <div className="mt-6">
              <ClockManager colaborador={colaborador} />
            </div>
          </TabsContent>
          <TabsContent value="seguimiento">
             <Card className="mt-4">
              <CardHeader><CardTitle>Seguimiento de Equipo</CardTitle></CardHeader>
              <CardContent><AdminJornadaView /></CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="registro-manual">
             <Card className="mt-4">
              <CardHeader><CardTitle>Registro Manual</CardTitle></CardHeader>
              <CardContent><AdminClockManager /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="mt-6">
          <ClockManager colaborador={colaborador} />
        </div>
      )}
    </div>
  );
};

export default JornadaPage;
