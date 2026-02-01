import React from 'react';

const EvacuationRecommendation = ({ risk, riskExplanation }) => {
    const evacuationRecommended =
        risk?.level === 'High' &&
        riskExplanation?.recent7Day > riskExplanation?.avgWeekly &&
        riskExplanation?.isWettestMonth === true;

    return (
        <div
            className={`p-6 rounded-lg shadow-lg ${
                evacuationRecommended ? 'bg-red-100 border-2 border-red-400' : 'bg-green-50 border-2 border-green-200'
            }`}
        >
            <h2 className="text-xl font-bold mb-2">
                {evacuationRecommended ? '⚠️ Evacuation Recommended' : '✅ Stay Alert'}
            </h2>
            {evacuationRecommended ? (
                <div>
                    <p className="text-red-800 font-medium">Time window: 24–48 hours</p>
                    <p className="text-sm text-red-700 mt-1">
                        High risk + above-average rainfall + wettest month. Consider moving to higher ground.
                    </p>
                </div>
            ) : (
                <p className="text-green-800">No evacuation needed yet. Stay informed with local updates.</p>
            )}
        </div>
    );
};

export default EvacuationRecommendation;
