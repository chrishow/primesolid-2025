


export async function loadWeather(): Promise<any> {
    let apiUrl = '';
    // console.log('import.meta.env.MODE', import.meta.env.MODE);
    if (import.meta.env.MODE === 'development') {
        apiUrl = 'weather.json';
    } else {
        apiUrl = `https://website-weather-proxy.chrislhow.workers.dev/`;
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