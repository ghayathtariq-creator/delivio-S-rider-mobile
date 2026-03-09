import api from './api';
import { WorkStatus, RiderProfile, Task, Order, Earnings, DeliverySettings, ChatMessage } from '../types';

export const riderService = {
  // Work Status
  getWorkStatus: async (): Promise<WorkStatus> => {
    const response = await api.get('/rider/work-status');
    return response.data;
  },

  goOnline: async (): Promise<{ success: boolean; is_online: boolean }> => {
    const response = await api.post('/rider/go-online');
    return response.data;
  },

  goOffline: async (): Promise<{ success: boolean; is_online: boolean }> => {
    const response = await api.post('/rider/go-offline');
    return response.data;
  },

  // Location
  updateLocation: async (latitude: number, longitude: number): Promise<{ success: boolean }> => {
    const response = await api.post(`/rider/update-location?latitude=${latitude}&longitude=${longitude}`);
    return response.data;
  },

  // Tasks/Orders
  getTasks: async (): Promise<Task[]> => {
    const response = await api.get('/rider/tasks');
    return response.data;
  },

  getPendingOrders: async (): Promise<{ orders: Order[]; nearby_count: number }> => {
    const response = await api.get('/rider/pending-orders');
    return response.data;
  },

  requestOrder: async (): Promise<{ order: Order }> => {
    const response = await api.post('/rider/request-order');
    return response.data;
  },

  acceptOrder: async (orderId: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/rider/orders/${orderId}/accept`);
    return response.data;
  },

  declineOrder: async (orderId: string): Promise<{ success: boolean; decline_count: number; is_suspended: boolean }> => {
    const response = await api.post(`/rider/orders/${orderId}/decline`);
    return response.data;
  },

  updateTaskStatus: async (
    taskId: string,
    status: 'picked_up' | 'delivered',
    latitude: number,
    longitude: number
  ): Promise<{ success: boolean }> => {
    const response = await api.put(`/rider/tasks/${taskId}/status`, {
      status,
      latitude,
      longitude,
    });
    return response.data;
  },

  // Earnings
  getEarnings: async (): Promise<Earnings> => {
    const response = await api.get('/rider/earnings');
    return response.data;
  },

  // Profile
  getProfile: async (): Promise<RiderProfile> => {
    const response = await api.get('/rider/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; phone?: string; vehicle_type?: string }): Promise<RiderProfile> => {
    const response = await api.put('/rider/profile', data);
    return response.data;
  },

  // Delivery Settings
  getDeliverySettings: async (): Promise<DeliverySettings> => {
    const response = await api.get('/rider/delivery-settings');
    return response.data;
  },

  updateDeliverySettings: async (data: DeliverySettings): Promise<DeliverySettings> => {
    const response = await api.put('/rider/delivery-settings', data);
    return response.data;
  },

  // Chat
  getMessages: async (orderId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/${orderId}/messages`);
    return response.data;
  },

  sendMessage: async (orderId: string, message: string): Promise<{ success: boolean; message: ChatMessage }> => {
    const response = await api.post(`/chat/${orderId}/messages`, { message });
    return response.data;
  },
};

export default riderService;
