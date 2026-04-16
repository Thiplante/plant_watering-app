export const getRainToday = async (city: string) => {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?current_weather=true&hourly=rain&latitude=44.84&longitude=-0.58`
    );

    const data = await res.json();

    return data.hourly.rain[0] > 0;
  } catch {
    return false;
  }
};