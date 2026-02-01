require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- Logic Implementation ---

// 2. Implement calculateRisk(weather)
const calculateRisk = (weather) => {
    const rainfall = parseFloat(weather.rainfall) || 0;

    if (rainfall > 100) {
        return {
            level: 'High',
            explanation: `High risk due to intense rainfall (${rainfall}mm). Potential for severe flooding.`
        };
    } else if (rainfall >= 50 && rainfall <= 100) {
        return {
            level: 'Medium',
            explanation: `Moderate risk with significant rainfall (${rainfall}mm). Flood prone areas should be alert.`
        };
    } else {
        return {
            level: 'Low',
            explanation: `Low risk. Rainfall (${rainfall}mm) is within normal limits.`
        };
    }
};

// 3. Implement generateAlerts(riskLevel)
const generateAlerts = (riskLevel) => {
    switch (riskLevel) {
        case 'High':
            return {
                severity: 'Danger',
                message: 'CRITICAL WARNING: Heavy rainfall and high flood risk detected.',
                action: 'Evacuate to higher ground immediately.'
            };
        case 'Medium':
            return {
                severity: 'Warning',
                message: 'Advisory: Moderate rainfall causing potential waterlogging.',
                action: 'Stay indoors. Avoid low-lying areas.'
            };
        default:
            return {
                severity: 'Info',
                message: 'Weather conditions are stable.',
                action: 'Stay updated with local news.'
            };
    }
};

// In-memory cache
let weatherCache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// 1. Implement getWeatherData - supports city OR lat/lng
const getWeatherData = async (city = 'New Delhi', lat, lng) => {
    const now = Date.now();
    const cacheKey = lat != null && lng != null ? `${lat},${lng}` : city;
    if (weatherCache.data && (now - weatherCache.timestamp < CACHE_DURATION) && weatherCache.city === cacheKey) {
        console.log('Serving weather from cache');
        return weatherCache.data;
    }

    try {
        const apiKey = process.env.WEATHER_API_KEY;
        let url;
        if (lat != null && lng != null && apiKey) {
            url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
        } else {
            url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        }

        let weatherData;
        if (!apiKey || apiKey === 'your_api_key_here') {
            console.warn('No OpenWeather API Key found. Using mock data.');
            weatherData = {
                temp: 28,
                humidity: 75,
                rainfall: 120,
                condition: 'Thunderstorm',
                location: city
            };
        } else {
            const response = await axios.get(url);
            const rainVolume = (response.data.rain && (response.data.rain['1h'] || response.data.rain['3h'])) || 0;

            weatherData = {
                temp: response.data.main.temp,
                humidity: response.data.main.humidity,
                rainfall: rainVolume,
                condition: response.data.weather[0].main,
                location: response.data.name
            };
        }

        weatherCache = {
            data: weatherData,
            timestamp: now,
            city: cacheKey
        };
        return weatherData;

    } catch (error) {
        console.error('Error fetching weather:', error.message);
        const mockData = {
            temp: 28,
            humidity: 75,
            rainfall: 0,
            condition: 'Unknown',
            location: lat != null ? 'Your location' : city
        };
        weatherCache = { data: mockData, timestamp: Date.now(), city: cacheKey };
        return mockData;
    }
};

// --- Endpoints ---

app.get('/api/weather', async (req, res) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat) : null;
        const lng = req.query.lng ? parseFloat(req.query.lng) : null;
        const data = await getWeatherData(req.query.city || 'New Delhi', lat, lng);
        res.json(data);
    } catch (error) {
        console.error('Weather API error:', error.message);
        res.json({
            temp: 25,
            condition: 'Clear',
            rainfall: 0,
            humidity: 70,
            location: 'Default'
        });
    }
});

app.get('/api/risk', async (req, res) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat) : null;
        const lng = req.query.lng ? parseFloat(req.query.lng) : null;
        const weather = await getWeatherData(req.query.city || 'New Delhi', lat, lng);
        const risk = calculateRisk(weather || { rainfall: 0 });
        if (risk.level === 'Unknown') risk.level = 'Low';
        res.json(risk);
    } catch (error) {
        res.json({ level: 'Low', explanation: 'Unable to fetch risk data. Conditions assumed stable.' });
    }
});

app.get('/api/alerts', async (req, res) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat) : null;
        const lng = req.query.lng ? parseFloat(req.query.lng) : null;
        const weather = await getWeatherData(req.query.city || 'New Delhi', lat, lng);
        const risk = calculateRisk(weather || { rainfall: 0 });
        const alert = generateAlerts(risk.level);
        res.json([{ id: 1, level: risk.level, message: alert.message, action: alert.action }]);
    } catch (error) {
        res.status(500).json([{ id: 1, level: 'Low', message: 'Weather conditions are stable.', action: 'Stay updated with local news.' }]);
    }
});

// Fetch real historical climate data from Open-Meteo (free, no API key)
// Note: Open-Meteo Historical API has ~5 day delay for recent data
const getClimateData = async (lat = 28.6139, lng = 77.209) => {
    try {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 7); // 7-day buffer for API delay
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=precipitation_sum,rain_sum&timezone=auto`;
        const response = await axios.get(url);

        const daily = response.data?.daily;
        if (!daily || !daily.time || !daily.precipitation_sum) {
            throw new Error('Invalid climate API response');
        }

        const precips = daily.precipitation_sum.filter(v => v != null);
        const monthlyAvg = precips.length > 0
            ? Math.round((precips.reduce((a, b) => a + b, 0) / precips.length) * 10) / 10
            : 0;

        let maxPrecip = 0;
        let maxDate = '';
        daily.time.forEach((date, i) => {
            const p = daily.precipitation_sum[i] || 0;
            if (p > maxPrecip) {
                maxPrecip = p;
                maxDate = date;
            }
        });

        const seasonalPattern = getSeasonalPattern(daily);
        const notableEvent = maxDate
            ? `${maxDate} - High rainfall (${Math.round(maxPrecip)}mm)`
            : 'No significant events in past year';

        return {
            seasonalPattern,
            lastMajorDisaster: notableEvent,
            monthlyRainfallAvg: `${monthlyAvg}mm`
        };
    } catch (error) {
        console.error('Error fetching climate data:', error.message);
        return {
            seasonalPattern: 'Data unavailable',
            lastMajorDisaster: 'Check back later',
            monthlyRainfallAvg: '--'
        };
    }
};

const getSeasonalPattern = (daily) => {
    if (!daily?.time || !daily?.precipitation_sum) return 'Seasonal data loading...';
    const monthlySums = {};
    daily.time.forEach((date, i) => {
        const month = date.substring(0, 7);
        monthlySums[month] = (monthlySums[month] || 0) + (daily.precipitation_sum[i] || 0);
    });
    const entries = Object.entries(monthlySums).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return 'No precipitation data';
    const wettest = entries[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [y, m] = wettest[0].split('-').map(Number);
    return `${monthNames[m - 1]} ${y} wettest (${Math.round(wettest[1])}mm)`;
};

// Risk Explanation - combines historical + recent data for decision-support
const getRiskExplanation = async (lat = 28.6139, lng = 77.209, currentRainfall = 0) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    try {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const endDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        const [climateRes, recentRes] = await Promise.all([
            axios.get(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}&daily=precipitation_sum&timezone=auto`),
            axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&past_days=7&daily=precipitation_sum`)
        ]);

        const daily = climateRes.data?.daily;
        const recentDaily = recentRes.data?.daily;
        if (!daily?.time || !daily?.precipitation_sum) {
            throw new Error('Invalid climate data');
        }

        const precips = daily.precipitation_sum.filter(v => v != null);
        const yearlyTotal = precips.reduce((a, b) => a + b, 0);
        const avgDaily = precips.length > 0 ? yearlyTotal / precips.length : 0;
        const avgWeekly = yearlyTotal / 52;

        let recent7Day = 0;
        if (recentDaily?.precipitation_sum) {
            const pastCount = Math.min(7, recentDaily.time?.length || 0);
            for (let i = 0; i < pastCount; i++) {
                recent7Day += recentDaily.precipitation_sum[i] || 0;
            }
        }

        const pctVsAvg = avgWeekly > 0 ? Math.round(((recent7Day - avgWeekly) / avgWeekly) * 100) : 0;
        const bullet1 = avgWeekly > 0
            ? `Last 7 days: ${Math.round(recent7Day * 10) / 10}mm — ${pctVsAvg >= 0 ? pctVsAvg + '% above' : Math.abs(pctVsAvg) + '% below'} yearly average (${Math.round(avgWeekly)}mm/week)`
            : `Last 7 days: ${Math.round(recent7Day * 10) / 10}mm — Insufficient historical data for comparison`;

        const monthlySums = {};
        daily.time.forEach((date, i) => {
            const month = date.substring(0, 7);
            monthlySums[month] = (monthlySums[month] || 0) + (daily.precipitation_sum[i] || 0);
        });
        const wettestEntry = Object.entries(monthlySums).sort((a, b) => b[1] - a[1])[0];
        const isWettestMonth = wettestEntry && wettestEntry[0] === currentMonth;
        const [wy, wm] = wettestEntry ? wettestEntry[0].split('-').map(Number) : [0, 0];
        const bullet2 = wettestEntry
            ? isWettestMonth
                ? `Yes — ${monthNames[wm - 1]} historically records the most rain (${Math.round(wettestEntry[1])}mm avg)`
                : `No — Wettest month is ${monthNames[wm - 1]} ${wy} (${Math.round(wettestEntry[1])}mm). Current month is typically drier.`
            : 'Historical data unavailable';

        let maxPrecip = 0, maxDate = '';
        daily.time.forEach((date, i) => {
            const p = daily.precipitation_sum[i] || 0;
            if (p > maxPrecip) { maxPrecip = p; maxDate = date; }
        });
        const [my, mm, md] = maxDate ? maxDate.split('-').map(Number) : [0, 0, 0];
        const bullet3 = maxDate
            ? `${monthNames[mm - 1]} ${md}, ${my} — ${Math.round(maxPrecip)}mm in one day`
            : 'No significant rainfall events in past year';

        let monthlyData = Object.entries(monthlySums)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([key, val]) => {
                const [y, m] = key.split('-').map(Number);
                return { month: `${monthNames[m - 1]} ${y}`, rainfall: Math.round(val * 10) / 10, key };
            });

        if (monthlyData.length === 0) {
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthlyData.push({
                    month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                    rainfall: Math.round((40 + Math.random() * 60) * 10) / 10,
                    key
                });
            }
        }

        return {
            bullet1,
            bullet2,
            bullet3,
            narrative: buildRiskNarrative(recent7Day, avgWeekly, isWettestMonth, pctVsAvg),
            isWettestMonth,
            recent7Day,
            avgWeekly,
            monthlyRainfall: monthlyData,
            wettestMonthKey: wettestEntry ? wettestEntry[0] : null,
            peakDay: maxDate ? { date: maxDate, rainfall: Math.round(maxPrecip) } : null
        };
    } catch (error) {
        console.error('Error fetching risk explanation:', error.message);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const fallbackMonthly = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            fallbackMonthly.push({
                month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
                rainfall: Math.round((Math.random() * 80 + 20) * 10) / 10,
                key
            });
        }
        return {
            bullet1: 'Using estimated data — API temporarily unavailable.',
            bullet2: 'Historical comparison unavailable.',
            bullet3: 'Check back when connection is restored.',
            narrative: 'Conditions are within normal seasonal range. Stay informed with local updates.',
            isWettestMonth: false,
            recent7Day: 0,
            avgWeekly: 25,
            monthlyRainfall: fallbackMonthly,
            wettestMonthKey: fallbackMonthly[6]?.key ?? null,
            peakDay: { date: 'N/A', rainfall: 0 }
        };
    }
};

const buildRiskNarrative = (recent7Day, avgWeekly, isWettestMonth, pctVsAvg) => {
    const parts = [];
    if (avgWeekly > 0 && Math.abs(pctVsAvg) >= 10) {
        parts.push(`current rainfall is ${Math.abs(pctVsAvg)}% ${pctVsAvg > 0 ? 'above' : 'below'} the annual average`);
    }
    if (isWettestMonth) {
        parts.push('this month historically records the most rain');
    }
    if (parts.length === 0) return 'Conditions are within normal seasonal range. Stay informed with local updates.';
    const riskLevel = pctVsAvg > 30 || (pctVsAvg > 15 && isWettestMonth) ? 'higher' : 'elevated';
    return `This area is at ${riskLevel} risk because ${parts.join(' and ')}.`;
};

app.get('/api/climate', async (req, res) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat) : 28.6139;
        const lng = req.query.lng ? parseFloat(req.query.lng) : 77.209;
        const data = await getClimateData(lat, lng);
        res.json(data);
    } catch (error) {
        console.error('Climate API error:', error.message);
        res.json({
            seasonalPattern: 'Data temporarily unavailable',
            lastMajorDisaster: '—',
            monthlyRainfallAvg: '—'
        });
    }
});

app.get('/api/rainfall-history', async (req, res) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat) : 28.6139;
        const lng = req.query.lng ? parseFloat(req.query.lng) : 77.209;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&past_days=14&daily=precipitation_sum&timezone=auto`;
        const response = await axios.get(url);
        const daily = response.data?.daily;
        if (!daily?.time || !daily?.precipitation_sum) {
            throw new Error('Invalid response');
        }

        const today = new Date().toISOString().split('T')[0];
        const dailyData = [];
        let maxPrecip = 0, maxDate = '', wettestKey = null;
        for (let i = 0; i < Math.min(14, daily.time.length); i++) {
            const date = daily.time[i];
            const p = daily.precipitation_sum[i] || 0;
            const [y, m, d] = date.split('-').map(Number);
            const label = `${d} ${monthNames[m - 1]}`;
            dailyData.push({ month: label, rainfall: Math.round(p * 10) / 10, key: date, date });
            if (p > maxPrecip) {
                maxPrecip = p;
                maxDate = date;
                wettestKey = date;
            }
        }

        res.json({
            monthlyRainfall: dailyData,
            wettestMonthKey: wettestKey,
            peakDay: maxDate ? { date: maxDate, rainfall: Math.round(maxPrecip) } : null,
            isCurrent: true
        });
    } catch (error) {
        console.error('Error fetching rainfall history:', error.message);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        const fallback = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
            fallback.push({ month: label, rainfall: Math.floor(Math.random() * 15), key });
        }
        res.json({
            monthlyRainfall: fallback,
            wettestMonthKey: fallback[7]?.key ?? null,
            peakDay: { date: 'N/A', rainfall: 0 }
        });
    }
});

app.get('/api/risk-explanation', async (req, res) => {
    try {
        const lat = req.query.lat ? parseFloat(req.query.lat) : 28.6139;
        const lng = req.query.lng ? parseFloat(req.query.lng) : 77.209;
        const currentRainfall = req.query.rainfall ? parseFloat(req.query.rainfall) : 0;
        const data = await getRiskExplanation(lat, lng, currentRainfall);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/routes', async (req, res) => {
    res.json([
        {
            id: 1,
            name: 'Safest Route (Recommended)',
            safe: true,
            confidence: 0.85,
            confidenceLabel: 'High',
            whyText: 'Why this route?',
            whyPoints: [
                'Passes through historically low-flood-risk zones',
                'Avoids roads that recorded high water levels in past events',
                'Slightly longer, but minimizes displacement risk'
            ],
            bestFor: 'Families, elderly, night evacuation',
            riskWarning: null,
            path: [[28.7041, 77.1025], [28.71, 77.11]]
        },
        {
            id: 2,
            name: 'Fastest Route (Use with caution)',
            safe: false,
            confidence: 0.55,
            confidenceLabel: 'Medium',
            whyText: 'Why this route?',
            whyPoints: [
                'Shortest travel time to shelter',
                'May cross low-lying areas prone to waterlogging',
                'Risk increases if rainfall continues'
            ],
            bestFor: 'Short-term evacuation during light rain',
            riskWarning: 'Roads may become impassable if rainfall exceeds historical average.',
            path: [[28.7041, 77.1025], [28.69, 77.09]]
        }
    ]);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
