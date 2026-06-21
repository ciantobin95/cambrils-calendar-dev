// Coordinates for Cambrils, Spain
const LAT = 41.0667;
const LON = 1.05;

function getWeatherDesc(code) {
    const codes = {
        0:  { text: "Clear Sky", icon: "☀️" },
        1:  { text: "Mainly Clear", icon: "🌤️" },
        2:  { text: "Partly Cloudy", icon: "⛅" },
        3:  { text: "Overcast", icon: "☁️" },
        45: { text: "Foggy", icon: "🌫️" },
        51: { text: "Light Drizzle", icon: "🌦️" },
        53: { text: "Drizzle", icon: "🌦️" },
        55: { text: "Heavy Drizzle", icon: "🌧️" },
        61: { text: "Rain", icon: "🌧️" },
        63: { text: "Moderate Rain", icon: "🌧️" },
        65: { text: "Heavy Rain", icon: "⛈️" },
        80: { text: "Rain Showers", icon: "🌦️" },
        95: { text: "Thunderstorm", icon: "⚡" },
        96: { text: "Thunderstorm", icon: "⚡" }
    };
    return codes[code] || { text: "Unknown", icon: "❓" };
}

// Helper to get suffix (st, nd, rd, th)
function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

async function fetchWeather() {
    try {
        // Request daily weather + sunrise + sunset
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;
        
        const response = await fetch(url);
        const data = await response.json();

        // 1. Update Current Weather
        const current = data.current_weather;
        const currentInfo = getWeatherDesc(current.weathercode);

        document.getElementById('currentTemp').innerText = Math.round(current.temperature) + "°C";
        document.getElementById('currentCondition').innerText = `${currentInfo.icon} ${currentInfo.text}`;
        document.getElementById('windSpeed').innerText = current.windspeed;
        
        // 2. Update Sunrise & Sunset
        // The API returns an array of times, index 0 is today
        const todaySunrise = new Date(data.daily.sunrise[0]);
        const todaySunset = new Date(data.daily.sunset[0]);
        
        // Format to HH:MM (e.g. 07:15)
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        document.getElementById('sunriseTime').innerText = todaySunrise.toLocaleTimeString([], timeOptions);
        document.getElementById('sunsetTime').innerText = todaySunset.toLocaleTimeString([], timeOptions);

        document.getElementById('loadingText').style.display = 'none';
        document.getElementById('weatherContent').style.display = 'block';

        // 3. Update 7-Day Forecast
        const daily = data.daily;
        const forecastContainer = document.getElementById('forecastList');
        forecastContainer.innerHTML = ''; 

        for(let i = 0; i < 7; i++) {
            const dateStr = daily.time[i];
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);
            const code = daily.weathercode[i];
            const info = getWeatherDesc(code);

            // Create Date Object
            const dateObj = new Date(dateStr);
            
            // Get parts: "Mon", "Feb", 23
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
            const dayNum = dateObj.getDate();
            const suffix = getOrdinalSuffix(dayNum);

            // Combine: "Mon, 23rd Feb"
            const finalDateString = `${dayName}, ${dayNum}${suffix} ${monthName}`;

            const row = document.createElement('div');
            row.className = 'forecast-row';
            row.innerHTML = `
                <div class="day-name" style="width:120px; font-size:0.95rem;">${finalDateString}</div>
                <div class="day-icon">${info.icon}</div>
                <div class="day-temp">
                    <span class="max">${maxTemp}°</span> 
                    <span class="min">${minTemp}°</span>
                </div>
            `;
            forecastContainer.appendChild(row);
        }

    } catch (error) {
        console.error("Weather load failed", error);
        document.getElementById('loadingText').innerText = "Could not load weather.";
    }
}

document.addEventListener('DOMContentLoaded', fetchWeather);