import React from 'react';

const DEFAULT_ALERT = {
    id: 0,
    level: 'Low',
    message: 'Weather conditions are stable.',
    action: 'Stay updated with local news.'
};

const Alerts = ({ alerts, risk }) => {
    const displayAlerts = React.useMemo(() => {
        if (alerts && alerts.length > 0) {
            return alerts.map(a => ({ ...a, level: a.level === 'Unknown' ? 'Low' : (a.level || 'Low') }));
        }
        if (risk) {
            const level = (risk.level === 'Unknown' ? 'Low' : risk.level) || 'Low';
            const msg = level === 'High' ? 'Heavy rainfall and high flood risk detected.' : level === 'Medium' ? 'Moderate rainfall causing potential waterlogging.' : 'Weather conditions are stable.';
            const action = level === 'High' ? 'Evacuate to higher ground immediately.' : level === 'Medium' ? 'Stay indoors. Avoid low-lying areas.' : 'Stay updated with local news.';
            return [{ id: 0, level, message: msg, action }];
        }
        return [DEFAULT_ALERT];
    }, [alerts, risk]);

    if (!displayAlerts || displayAlerts.length === 0) {
        return <div className="p-4 bg-gray-100 rounded text-center">No active alerts.</div>;
    }

    const getAlertColor = (level) => {
        const l = (level || 'low').toLowerCase();
        switch (l) {
            case 'high': return 'bg-red-100 border-red-500 text-red-700';
            case 'medium': return 'bg-orange-100 border-orange-500 text-orange-700';
            case 'low': return 'bg-blue-100 border-blue-500 text-blue-700';
            default: return 'bg-blue-100 border-blue-500 text-blue-700';
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-xl font-bold mb-2">Active Alerts</h3>
            {displayAlerts.map((alert) => (
                <div key={alert.id || alert.level} className={`border-l-4 p-4 rounded ${getAlertColor(alert.level)}`}>
                    <p className="font-bold">[{(alert.level === 'Unknown' ? 'LOW' : (alert.level || 'Low').toUpperCase())}] {alert.message}</p>
                    <p className="text-sm mt-1"><span className="font-semibold">Action:</span> {alert.action}</p>
                </div>
            ))}
        </div>
    );
};

export default Alerts;
