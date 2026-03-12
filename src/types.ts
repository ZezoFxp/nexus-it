export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'a fazer' | 'em andamento' | 'concluido';
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  dueDate: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: 'available' | 'in_use' | 'maintenance' | 'broken';
  assignedTo?: string;
  assignedToName?: string;
  notes: string;
}

export interface AcervoEntry {
  id: string;
  title: string;
  content: string;
  type: 'code' | 'link' | 'tool' | 'note';
  tags: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}
