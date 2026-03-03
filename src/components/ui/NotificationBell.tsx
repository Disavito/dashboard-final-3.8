import React from 'react';
import { Bell, FileText, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePendingRequests from '@/hooks/usePendingRequests';
import { cn } from '@/lib/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationBell: React.FC = () => {
    const { pendingRequests, pendingCount, canManageRequests } = usePendingRequests();

    if (!canManageRequests) return null;

    const hasPending = pendingCount > 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button 
                    className={cn(
                        "relative p-2.5 rounded-full transition-all duration-300 outline-none group",
                        "bg-muted/50 hover:bg-primary/20 border border-border/50 shadow-sm",
                        "focus:ring-2 focus:ring-primary/50 active:scale-95"
                    )}
                    aria-label={`Notificaciones: ${pendingCount} pendientes`}
                >
                    <Bell className={cn(
                        "w-5 h-5 transition-all duration-300", 
                        hasPending 
                            ? 'text-primary fill-primary/10 animate-ring' 
                            : 'text-foreground/70 group-hover:text-primary'
                    )} />
                    
                    {hasPending && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-destructive border-2 border-background text-[10px] font-bold text-white items-center justify-center shadow-sm">
                                {pendingCount > 9 ? '9+' : pendingCount}
                            </span>
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 p-0 bg-card border-border shadow-2xl z-[100]" align="end">
                <div className="p-4 flex items-center justify-between bg-muted/30">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <Bell size={16} className="text-primary" />
                        Notificaciones
                    </h3>
                    {hasPending && (
                        <span className="text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {pendingCount} Pendientes
                        </span>
                    )}
                </div>
                <Separator className="bg-border/50" />
                
                <ScrollArea className="h-[350px]">
                    {pendingRequests.length > 0 ? (
                        <div className="flex flex-col">
                            {pendingRequests.map((req) => (
                                <div 
                                    key={req.id} 
                                    className="p-4 hover:bg-primary/5 transition-colors border-b border-border/30 last:border-0 group"
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                            <FileText size={16} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-semibold text-foreground leading-none">
                                                Solicitud de Eliminación
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {req.document_type} - {req.socio_details?.nombres} {req.socio_details?.apellidoPaterno}
                                            </p>
                                            <div className="flex items-center gap-2 pt-2">
                                                <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-7 px-2 text-[11px] font-medium"
                                                    asChild
                                                >
                                                    <a href={req.document_link} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink size={12} className="mr-1" /> Ver Doc
                                                    </a>
                                                </Button>
                                                <span className="text-[10px] text-muted-foreground flex items-center ml-auto font-medium">
                                                    <Clock size={10} className="mr-1" />
                                                    {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-center p-6">
                            <div className="p-4 rounded-full bg-muted mb-4">
                                <Bell className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No hay solicitudes</p>
                            <p className="text-xs text-muted-foreground mt-1">Todo está al día por aquí</p>
                        </div>
                    )}
                </ScrollArea>
                
                <Separator className="bg-border/50" />
                <div className="p-2">
                    <Button 
                        variant="ghost" 
                        className="w-full text-xs font-bold text-primary hover:bg-primary/10" 
                        asChild
                    >
                        <Link to="/partner-documents?tab=requests">
                            VER TODAS LAS SOLICITUDES
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBell;
