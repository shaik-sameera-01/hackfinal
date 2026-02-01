import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet with Webpack/Vite
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to fly map to user location when it becomes available
const LocationUpdater = ({ center, recenterRef }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 15, { duration: 1.5 });
        }
    }, [center, map]);
    useEffect(() => {
        if (recenterRef && center) {
            recenterRef.current = () => map.flyTo(center, 15, { duration: 1 });
        }
    }, [center, map, recenterRef]);
    return null;
};

const MapView = ({ userLocation, riskZones, evacuationRoutes }) => {
    const center = userLocation ? [userLocation.lat, userLocation.lng] : [28.7041, 77.1025];
    const hasUserLocation = userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number';
    const recenterRef = useRef(null);

    const getRiskColor = (level) => {
        switch (level) {
            case 'High': return 'red';
            case 'Medium': return 'orange';
            case 'Low': return 'blue';
            default: return 'gray';
        }
    };

    return (
        <div className="relative h-[400px] md:h-[500px] w-full rounded-lg overflow-hidden border border-gray-300">
            {hasUserLocation && (
                <button
                    type="button"
                    onClick={() => recenterRef.current?.()}
                    className="absolute top-2 right-2 z-[1000] px-3 py-1.5 bg-white border border-gray-300 rounded shadow text-sm font-medium hover:bg-gray-50"
                >
                    📍 Locate me
                </button>
            )}
            <MapContainer
                key={hasUserLocation ? `map-${userLocation.lat.toFixed(4)}-${userLocation.lng.toFixed(4)}` : 'map-default'}
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationUpdater center={hasUserLocation ? center : null} recenterRef={recenterRef} />

                {/* User Location */}
                <Marker position={center}>
                    <Popup>
                        You are here.
                    </Popup>
                </Marker>

                {/* Risk Zones - Placeholder implementation */}
                {/* In a real app, riskZones would contain actual lat/lng arrays */}

                {/* Routes */}
                {evacuationRoutes && evacuationRoutes.map(route => (
                    <Polyline
                        key={route.id}
                        positions={route.path || []}
                        color={route.safe ? 'green' : 'orange'}
                        weight={5}
                        opacity={0.7}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                <strong>{route.name}</strong>
                                <p className="text-xs mt-1 text-gray-600">
                                    Confidence: {route._calculating ? 'Calculating…' : route.confidence != null && route.confidenceLabel ? `${route.confidenceLabel} (${route.confidence.toFixed(2)})` : 'N/A'}
                                </p>
                                {route.bestFor && <p className="text-xs mt-1">Best for: {route.bestFor}</p>}
                            </div>
                        </Popup>
                    </Polyline>
                ))}

            </MapContainer>
        </div>
    );
};

export default MapView;
