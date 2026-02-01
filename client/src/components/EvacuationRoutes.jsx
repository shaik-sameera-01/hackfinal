import React from 'react';

const EvacuationRoutes = ({ routes = [] }) => {
    if (!routes || routes.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <span className="font-semibold text-amber-800">⚠️ Based on current risk level and historical rainfall, the Safest Route is recommended.</span>
            </div>

            <div className="space-y-4">
                {routes.map((route) => (
                    <div
                        key={route.id}
                        className={`rounded-lg border-2 p-4 ${
                            route.safe
                                ? 'border-green-300 bg-green-50'
                                : 'border-amber-300 bg-amber-50'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full shrink-0 ${route.safe ? 'bg-green-500' : 'bg-amber-500'}`} />
                                <h3 className="font-bold text-gray-900">
                                    {route.safe ? '✅ ' : '🟡 '}
                                    {route.name}
                                </h3>
                            </div>
                            <span className="text-sm font-medium text-gray-600 shrink-0">
                                Confidence: {route._calculating
                                    ? 'Calculating…'
                                    : route.confidence != null && route.confidenceLabel
                                        ? `${route.confidenceLabel} (${route.confidence.toFixed(2)})`
                                        : 'N/A'}
                            </span>
                        </div>

                        {route.whyText && (
                            <p className="font-semibold text-gray-700 text-sm mt-2">{route.whyText}</p>
                        )}
                        {route.whyPoints && route.whyPoints.length > 0 && (
                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-1 ml-1">
                                {route.whyPoints.map((point, i) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        )}

                        {route.bestFor && (
                            <p className="text-sm text-gray-600 mt-2">
                                <span className="font-medium">Best for:</span> {route.bestFor}
                            </p>
                        )}

                        {route.riskWarning && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                <span className="font-medium">⚠️ Risk:</span> {route.riskWarning}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-xs text-gray-500 mt-3">
                Confidence is calculated using historical rainfall and elevation risk patterns.
            </p>
        </div>
    );
};

export default EvacuationRoutes;
