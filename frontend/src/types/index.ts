export interface User {
  id: string;
  email: string;
  name: string;
  user_type: 'rider';
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface WorkStatus {
  is_online: boolean;
  is_suspended: boolean;
  suspend_until: string | null;
}

export interface RiderProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle_type: 'bicycle' | 'motorcycle' | 'car';
  work_region: string;
  rating: number;
  status: 'pending' | 'approved' | 'suspended';
  total_deliveries: number;
  created_at: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  status: 'pending' | 'assigned' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';
  restaurant_name: string;
  restaurant_address: string;
  restaurant_phone: string;
  restaurant_latitude: number;
  restaurant_longitude: number;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  customer_latitude: number;
  customer_longitude: number;
  delivery_notes?: string;
  items: OrderItem[];
  total: number;
  delivery_fee: number;
  rider_price: number;
  created_at: string;
}

export interface Task extends Order {}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_type: 'customer' | 'rider';
  message: string;
  created_at: string;
}

export interface Earnings {
  today: number;
  this_week: number;
  this_month: number;
  total_deliveries: number;
  tasks: Task[];
}

export interface DeliverySettings {
  work_region: string;
  vehicle_type: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
}
