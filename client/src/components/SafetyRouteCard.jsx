import React from 'react';

const SafetyRouteCard = ({ routes = [] }) => {
    const safestRoute = routes?.find(r => r.safe);
    if (!safestRoute) return null;

    return (
        <div className="p-6 bg-green-50 border-2 border-green-300 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-green-800">🛡️ Safety Route (Recommended)</h2>
            <p className="text-green-700 font-semibold mb-2">{safestRoute.name}</p>
            <p className="text-sm text-gray-700 mb-2">
                {safestRoute.confidenceLabel && (
                    <span className="inline-block px-2 py-0.5 bg-green-200 rounded text-green-800 mr-2">
                        Confidence: {safestRoute.confidenceLabel} ({(safestRoute.confidence || 0).toFixed(2)})
                    </span>
                )}
            </p>
            {safestRoute.whyPoints && safestRoute.whyPoints.length > 0 && (
                <ul className="text-sm text-gray-600 space-y-1 mb-2">
                    {safestRoute.whyPoints.slice(0, 2).map((point, i) => (
                        <li key={i}>• {point}</li>
                    ))}
                </ul>
            )}
            {safestRoute.bestFor && (
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Best for:</span> {safestRoute.bestFor}
                </p>
            )}
        </div>
    );
};

export default SafetyRouteCard;
