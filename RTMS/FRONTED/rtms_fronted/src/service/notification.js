// services/notificationService.js
import axios from 'axios';

const API_BASE_URL = 'https://your-api-endpoint.com';

export const sendNotification = async (notificationData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/notifications`, notificationData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Notification failed:', error);
    throw error;
  }
};

// Supported notification types
export const NOTIFICATION_METHODS = {
  SMS: 'sms',
  EMAIL: 'email',
  APP: 'app'
};