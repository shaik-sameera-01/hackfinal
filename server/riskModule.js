const calculateRisk = (weather) => {
    const rainfall = parseFloat(weather.rainfall) || 0; // Ensure number, handle '12mm' if parsed elsewhere or assume number

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
            explanation: `Low risk. Rainfall is within manageable limits (${rainfall}mm).`
        };
    }
};

module.exports = { calculateRisk };
