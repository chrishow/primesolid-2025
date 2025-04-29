


export async function loadWeather(lat: string, lon: string): Promise<any> {
    let apiUrl = '';
    // console.log('import.meta.env.MODE', import.meta.env.MODE);
    if (import.meta.env.MODE === 'development') {
        apiUrl = 'weather.json';
    } else {
        // TODO: Proxy this to avoid key leakage
        apiUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat}%2C${lon}?unitGroup=metric&include=current&key=CZWZGWKKZEH274SCFWU2G4GJ3&contentType=json`;
    }

    const locationResponse = await fetch(apiUrl);
    const locationData = await locationResponse.json();

    // Convert wind direction from degrees to cardinal direction
    const windDirection = locationData.currentConditions.winddir;
    const windDirectionCardinal = Math.round((windDirection % 360) / 22.5);
    const cardinalDirections = [
        'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];
    locationData.currentConditions.winddir = cardinalDirections[windDirectionCardinal];

    return locationData;
}