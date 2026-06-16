import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with auth interceptor
const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(config => {
    const token = localStorage.getItem('ews_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Auth ───────────────────────────────────

export const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const signup = async (username, password, role, fullName) => {
    const response = await api.post('/auth/signup', { username, password, role, full_name: fullName });
    return response.data;
};

export const getMe = async () => {
    const response = await api.get('/auth/me');
    return response.data;
};

// ─── Prediction ─────────────────────────────

export const predictRisk = async (profile, history, threshold = 0.5) => {
    try {
        const response = await api.post('/predict', {
            profile,
            history,
            threshold
        });
        return response.data;
    } catch (error) {
        console.error('Error calling /predict', error);
        throw error;
    }
};

// ─── Patients ───────────────────────────────

export const getPatients = async () => {
    const response = await api.get('/patients');
    return response.data;
};

export const getPatient = async (patientId) => {
    const response = await api.get(`/patients/${patientId}`);
    return response.data;
};

export const createPatient = async (patientData) => {
    const response = await api.post('/patients', patientData);
    return response.data;
};

export const getPatientHistory = async (patientId) => {
    const response = await api.get(`/patients/${patientId}/history`);
    return response.data;
};

// ─── Disease Risk ───────────────────────────

export const getDiseaseRisk = async (vitals, profile) => {
    const response = await api.post('/disease-risk', { vitals, profile });
    return response.data;
};

// ─── Alerts ─────────────────────────────────

export const fetchAlerts = async () => {
    try {
        const response = await api.get('/alerts');
        return response.data;
    } catch (error) {
        console.error('Error calling /alerts', error);
        throw error;
    }
};

// ─── Health Check ───────────────────────────

export const healthCheck = async () => {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch {
        return { status: 'error', model_loaded: false };
    }
};
