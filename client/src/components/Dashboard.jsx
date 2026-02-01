import React, { useState, useEffect, useRef, useMemo } from 'react';
import Alerts from './Alerts';
import MapView from './MapView';
import RainfallChart from './RainfallChart';
import EvacuationRecommendation from './EvacuationRecommendation';
import EvacuationRoutes from './EvacuationRoutes';
import SafetyRouteCard from './SafetyRouteCard';
import { fetchWeather, fetchRisk, fetchAlerts, fetchRoutes, fetchClimate, fetchRiskExplanation, fetchRainfallHistory } from '../services/api';

const Dashboard = () => {
    const [weather, setWeather] = useState(null);
    const [climate, setClimate] = useState(null);
    const [risk, setRisk] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [riskExplanation, setRiskExplanation] = useState(null);
    const [rainfallHistory, setRainfallHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const fetchedForRef = useRef(null);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setUserLocation({ lat: 28.7041, lng: 77.1025 });
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
            );
        } else {
            setUserLocation({ lat: 28.7041, lng: 77.1025 });
        }
    }, []);

    useEffect(() => {
        const loc = userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number'
            ? userLocation
            : { lat: 28.6139, lng: 77.209 };
        const locKey = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
        if (fetchedForRef.current === locKey) return;
        fetchedForRef.current = locKey;

        if (!hasLoadedRef.current) setLoading(true);
        const loadData = async () => {
            try {
                const weatherData = await fetchWeather(loc);
                const [climateData, riskData, alertsData, routesData, explanationData, rainfallData] = await Promise.all([
                    fetchClimate(loc),
                    fetchRisk(loc),
                    fetchAlerts(loc),
                    fetchRoutes(),
                    fetchRiskExplanation(loc, weatherData?.rainfall),
                    fetchRainfallHistory(loc)
                ]);

                setWeather(weatherData || { temp: '—', condition: 'Unavailable', rainfall: 0, humidity: '—', location: 'N/A' });
                setClimate(climateData || { seasonalPattern: '—', lastMajorDisaster: '—', monthlyRainfallAvg: '—' });
                setRisk(riskData || { level: 'Low', explanation: 'Data unavailable.' });
                setAlerts(alertsData);
                setRoutes(routesData);
                setRiskExplanation(explanationData);
                setRainfallHistory(rainfallData);

                localStorage.setItem('lastWeather', JSON.stringify(weatherData));
                localStorage.setItem('lastClimate', JSON.stringify(climateData));
                localStorage.setItem('lastRisk', JSON.stringify(riskData));
                localStorage.setItem('lastAlerts', JSON.stringify(alertsData));
                localStorage.setItem('lastRoutes', JSON.stringify(routesData));
                localStorage.setItem('lastRiskExplanation', JSON.stringify(explanationData));
                localStorage.setItem('lastRainfallHistory', JSON.stringify(rainfallData));
            } catch (error) {
                console.error("Failed to fetch fresh data, loading from cache...", error);
                const cachedWeather = localStorage.getItem('lastWeather');
                const cachedClimate = localStorage.getItem('lastClimate');
                const cachedRisk = localStorage.getItem('lastRisk');
                const cachedAlerts = localStorage.getItem('lastAlerts');
                const cachedRoutes = localStorage.getItem('lastRoutes');
                const cachedExp = localStorage.getItem('lastRiskExplanation');
                const cachedRainfall = localStorage.getItem('lastRainfallHistory');

                if (cachedWeather) setWeather(JSON.parse(cachedWeather));
                else setWeather({ temp: '—', condition: 'Check connection', rainfall: 0, humidity: '—', location: 'N/A' });
                if (cachedClimate) setClimate(JSON.parse(cachedClimate));
                else setClimate({ seasonalPattern: 'Data unavailable', lastMajorDisaster: '—', monthlyRainfallAvg: '—' });
                if (cachedRisk) setRisk(JSON.parse(cachedRisk));
                else setRisk({ level: 'Low', explanation: 'Unable to fetch. Showing default.' });
                if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
                else setAlerts([{ id: 1, level: 'Low', message: 'Weather conditions are stable.', action: 'Stay updated with local news.' }]);
                if (cachedRoutes) setRoutes(JSON.parse(cachedRoutes));
                if (cachedExp) setRiskExplanation(JSON.parse(cachedExp));
                if (cachedRainfall) setRainfallHistory(JSON.parse(cachedRainfall));
            } finally {
                hasLoadedRef.current = true;
                setLoading(false);
            }
        };

        loadData();
    }, [userLocation?.lat ?? 'init', userLocation?.lng ?? 'init']);

    const getRiskBgColor = (level) => {
        switch (level) {
            case 'High': return 'bg-red-500 text-white';
            case 'Medium': return 'bg-orange-400 text-white';
            case 'Low': return 'bg-green-500 text-white';
            default: return 'bg-gray-400 text-white';
        }
    };

    const routesWithConfidence = useMemo(() => {
        if (!routes || routes.length === 0) return [];
        const hasData = risk && riskExplanation != null;
        if (!hasData) {
            return routes.map(r => ({ ...r, confidence: null, confidenceLabel: null, _calculating: true }));
        }
        const riskHigh = risk?.level === 'High';
        const rainfallAboveAvg = (riskExplanation?.recent7Day ?? 0) > (riskExplanation?.avgWeekly ?? 0);
        const isWettestMonth = riskExplanation?.isWettestMonth === true;

        let safestConfidence = 0.6;
        if (riskHigh) safestConfidence += 0.2;
        if (rainfallAboveAvg) safestConfidence += 0.1;
        if (isWettestMonth) safestConfidence += 0.1;
        safestConfidence = Math.min(1, safestConfidence);

        let fastestConfidence = 0.7;
        if (riskHigh) fastestConfidence -= 0.2;
        if (rainfallAboveAvg) fastestConfidence -= 0.2;
        fastestConfidence = Math.max(0.3, fastestConfidence);

        const getLabel = (c) => c >= 0.7 ? 'High' : c >= 0.5 ? 'Medium' : 'Low';

        return routes.map(r => {
            const conf = r.safe ? safestConfidence : fastestConfidence;
            return { ...r, confidence: conf, confidenceLabel: getLabel(conf), _calculating: false };
        });
    }, [routes, risk, riskExplanation]);

    if (loading && !weather) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-slate-100 text-gray-800 gap-3">
                <div className="animate-pulse text-lg font-medium">Loading Dashboard...</div>
                <p className="text-sm text-gray-500">Fetching weather and risk data</p>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen p-4 md:p-6 text-black">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Disaster Ready Dashboard</h1>
                <p className="text-gray-600">Real-time Safety & Monitoring System</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left column - Info cards */}
                <div className="xl:col-span-4 space-y-6">
                    {/* Risk Level Card */}
                    <div className={`p-6 rounded-lg shadow-lg ${risk ? getRiskBgColor(risk.level) : 'bg-gray-200'}`}>
                        <h2 className="text-xl font-bold mb-2">Current Risk Level</h2>
                        <p className="text-4xl font-extrabold">{risk ? (risk.level === 'Unknown' ? 'Low' : risk.level) : '—'}</p>
                        <p className="mt-2 text-sm opacity-90">{risk ? risk.explanation || risk.details : 'Checking...'}</p>
                    </div>

                    {/* Safety Route - Prominent card */}
                    <SafetyRouteCard routes={routesWithConfidence} />

                    {/* Evacuation Recommendation */}
                    <EvacuationRecommendation risk={risk} riskExplanation={riskExplanation} />

                    {/* Risk Explanation Card - Why is this risky? (Decision-support) */}
                    <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-lg shadow-lg ring-1 ring-amber-100">
                        <h2 className="text-xl font-bold mb-1 text-amber-900">Risk Explanation</h2>
                        <p className="text-xs text-amber-700 mb-3 font-medium">Why is this risky?</p>
                        {riskExplanation ? (
                            <>
                                <p className="text-sm text-gray-700 mb-4 italic">
                                    {riskExplanation.narrative}
                                </p>
                                <ul className="space-y-2 text-sm text-gray-800">
                                    <li className="flex gap-2">
                                        <span className="text-amber-600 font-bold">•</span>
                                        <span><strong>Current vs average:</strong> {riskExplanation.bullet1}</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-amber-600 font-bold">•</span>
                                        <span><strong>Wettest month?</strong> {riskExplanation.bullet2}</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-amber-600 font-bold">•</span>
                                        <span><strong>Highest event (1yr):</strong> {riskExplanation.bullet3}</span>
                                    </li>
                                </ul>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">Loading risk analysis...</p>
                        )}
                    </div>

                    {/* Weather Card */}
                    <div className="p-6 bg-blue-500 text-white rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-2">Weather Summary</h2>
                        {weather ? (
                            <div>
                                <p className="text-3xl font-bold">{weather.temp}°C</p>
                                <p className="text-lg">{weather.condition}</p>
                                <div className="mt-2 text-sm grid grid-cols-2 gap-2">
                                    <span>Rainfall: {weather.rainfall}</span>
                                    <span>Humidity: {weather.humidity}%</span>
                                </div>
                            </div>
                        ) : (
                            <p>Loading weather...</p>
                        )}
                    </div>

                    {/* Climate/History Card */}
                    <div className="p-6 bg-teal-600 text-white rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-2">Historical Data</h2>
                        {climate ? (
                            <div>
                                <p className="font-semibold">{climate.seasonalPattern}</p>
                                <div className="mt-2 text-sm">
                                    <p>Notable Event: {climate.lastMajorDisaster}</p>
                                    <p>Avg Daily Rainfall: {climate.monthlyRainfallAvg}</p>
                                </div>
                            </div>
                        ) : (
                            <p>Loading history...</p>
                        )}
                    </div>

                    {/* Status / Offline Indicator */}
                    <div className="p-6 bg-gray-100 rounded-lg shadow-lg flex flex-col justify-center items-center">
                        <h2 className="text-xl font-bold mb-2">System Status</h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <span>{loading ? 'Updating...' : 'Online & Active'}</span>
                        </div>
                    </div>
                </div>

                {/* Right column - Map & Alerts */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Map Section - Large */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Live Safe Map</h2>
                        <MapView
                            userLocation={userLocation}
                            riskZones={[]}
                            evacuationRoutes={routesWithConfidence}
                        />
                        {routes && routes.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h3 className="font-semibold mb-3">Evacuation Routes</h3>
                                <EvacuationRoutes routes={routesWithConfidence} />
                            </div>
                        )}
                    </div>

                    {/* Current Rainfall Chart */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Current Rainfall (Last 14 Days)</h2>
                        <RainfallChart
                            monthlyRainfall={rainfallHistory?.monthlyRainfall ?? riskExplanation?.monthlyRainfall}
                            wettestMonthKey={rainfallHistory?.wettestMonthKey ?? riskExplanation?.wettestMonthKey}
                            peakDay={rainfallHistory?.peakDay ?? riskExplanation?.peakDay}
                            isLoading={loading && !rainfallHistory && !riskExplanation}
                        />
                    </div>

                    {/* Alerts Section */}
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <Alerts alerts={alerts} risk={risk} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
