import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://sales-dashboard-320.preview.emergentagent.com';

export const Config = {
  API_BASE_URL,
  API_URL: `${API_BASE_URL}/api`,
  GPS_UPDATE_INTERVAL: 10000, // 10 seconds
  ORDER_POLL_INTERVAL: 30000, // 30 seconds
};

export default Config;
