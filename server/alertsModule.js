const generateAlerts = (riskLevel) => {
    switch (riskLevel) {
        case 'High':
            return {
                severity: 'Danger',
                message: 'CRITICAL WARNING: Heavy rainfall and high flood risk detected.',
                action: 'Evacuate to higher ground immediately. Do not attempt to cross flooded roads.'
            };
        case 'Medium':
            return {
                severity: 'Warning',
                message: 'Advisory: Moderate rainfall causing potential waterlogging.',
                action: 'Stay indoors. Avoid low-lying areas and unnecessary travel.'
            };
        default:
            return {
                severity: 'Info',
                message: 'Weather conditions are stable.',
                action: 'Stay updated with local news. No immediate action required.'
            };
    }
};

module.exports = { generateAlerts };
