export interface Team {
    id: number;
    nombre: string;
    descripcion?: string;
    owner?: number;
}

export interface Task {
    id: number;
    titulo: string;
    descripcion?: string;
    creador?: number;
    asignado?: number;
    team?: number;
    estado?: string;
    prioridad?: string;
}