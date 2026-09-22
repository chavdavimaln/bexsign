import axios from 'axios';
import { API_BASE } from '../utils/api';

const API = axios.create({
  baseURL: API_BASE,
});

// Interceptor to attach Authorization header automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default API;
