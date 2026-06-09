export type Role = 'admin' | 'gestion' | 'soporte' | 'tecnico';

export interface User {
  id: number;
  username: string;
  role: Role;
  name: string;
  phone?: string;
  profile_picture?: string;
}

export interface Client {
  id: number;
  unique_id?: string;
  name: string;
  location: string;
  branch: string;
  full_address: string;
}

export interface Task {
  id: number;
  client_id: number;
  client_name: string;
  client_location: string;
  client_branch: string;
  client_address?: string;
  client_unique_id?: string;
  problem: string;
  type: Role;
  assigned_to: string; // JSON string of names/IDs
  scheduled_time: string;
  contact_phone?: string;
  attachment_url?: string;
  sub_type?: string;
  location?: string;
  companion?: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

export interface ReportItem {
  model: string;
  serial: string;
  name: string;
  type: string;
  quantity: number;
}

export interface Report {
  id: number;
  task_id?: number;
  client_id: number;
  type: 'instalacion' | 'mantenimiento_correctivo' | 'mantenimiento_preventivo';
  description: string;
  evidence_url?: string;
  signature_url?: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  tecnico_id: number;
  client_name: string;
  location: string;
  problem: string;
  evidence_url?: string;
  status: 'open' | 'closed';
  created_at: string;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  comment: string;
  created_at: string;
}
