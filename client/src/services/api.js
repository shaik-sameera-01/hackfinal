import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

const buildParams = (location) => {
    if (location?.lat != null && location?.lng != null) {
        return { lat: location.lat, lng: location.lng };
    }
    return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
};

export const fetchWeather = async (location) => {
    try {
        const response = await axios.get(`${API_URL}/weather`, { params: buildParams(location) });
        return response.data;
    } catch (error) {
        console.error("Error fetching weather:", error);
        return null; // Return null to handle UI fallback
    }
};

export const fetchRisk = async (location) => {
    try {
        const response = await axios.get(`${API_URL}/risk`, { params: buildParams(location) });
        return response.data;
    } catch (error) {
        console.error("Error fetching risk:", error);
        // Fallback or attempt local storage load
        return { level: 'Low', details: 'Could not fetch risk data. Conditions assumed stable.' };
    }
};

export const fetchAlerts = async (location) => {
    try {
        const response = await axios.get(`${API_URL}/alerts`, { params: buildParams(location) });
        return response.data;
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return [];
    }
};

export const fetchClimate = async (location) => {
    try {
        const response = await axios.get(`${API_URL}/climate`, { params: buildParams(location) });
        return response.data;
    } catch (error) {
        console.error("Error fetching climate:", error);
        return null;
    }
};

export const fetchRiskExplanation = async (location, currentRainfall = 0) => {
    try {
        const params = { ...buildParams(location) };
        if (currentRainfall > 0) params.rainfall = currentRainfall;
        const response = await axios.get(`${API_URL}/risk-explanation`, { params });
        return response.data;
    } catch (error) {
        console.error("Error fetching risk explanation:", error);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const fallbackMonthly = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            fallbackMonthly.push({ month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, rainfall: 30 + i * 5, key });
        }
        return {
            bullet1: '—',
            bullet2: '—',
            bullet3: '—',
            narrative: 'Data temporarily unavailable.',
            isWettestMonth: false,
            recent7Day: 0,
            avgWeekly: 25,
            monthlyRainfall: fallbackMonthly,
            wettestMonthKey: null,
            peakDay: null
        };
    }
};

export const fetchRainfallHistory = async (location) => {
    try {
        const response = await axios.get(`${API_URL}/rainfall-history`, { params: buildParams(location) });
        return response.data;
    } catch (error) {
        console.error("Error fetching rainfall history:", error);
        return null;
    }
};

export const fetchRoutes = async () => {
    try {
        const response = await axios.get(`${API_URL}/routes`);
        return response.data;
    } catch (error) {
        console.error("Error fetching routes:", error);
        return [];
    }
};
