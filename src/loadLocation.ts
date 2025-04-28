


export async function loadLocation(): Promise<any> {
    let apiUrl = '';
    // console.log('import.meta.env.MODE', import.meta.env.MODE);
    if (import.meta.env.MODE === 'development') {
        apiUrl = 'location.json';
    } else {
        // TODO: Proxy this to avoid key leakage
        apiUrl = 'http://ip-api.com/json/';
    }

    const locationResponse = await fetch(apiUrl);
    const locationData = await locationResponse.json();

    return locationData;
}