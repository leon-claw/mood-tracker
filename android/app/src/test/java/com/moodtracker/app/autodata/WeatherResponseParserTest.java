package com.moodtracker.app.autodata;

import static org.junit.Assert.assertEquals;

import org.json.JSONObject;
import org.junit.Test;

public class WeatherResponseParserTest {
    @Test
    public void parsesCurrentOpenMeteoWeatherWithoutLocation() throws Exception {
        JSONObject weather = WeatherResponseParser.parse(
            "{\"current\":{\"weather_code\":0,\"temperature_2m\":28.4,\"relative_humidity_2m\":67,\"precipitation\":0.2},\"daily\":{\"temperature_2m_max\":[32.1],\"temperature_2m_min\":[24.3]}}",
            "2026-08-07T10:00:00Z"
        );

        assertEquals(0, weather.getInt("weatherCode"));
        assertEquals(28.4, weather.getDouble("temperatureC"), 0.001);
        assertEquals(67, weather.getInt("humidityPercent"));
        assertEquals(0.2, weather.getDouble("precipitationMm"), 0.001);
        assertEquals(32.1, weather.getDouble("temperatureMaxC"), 0.001);
        assertEquals(24.3, weather.getDouble("temperatureMinC"), 0.001);
        assertEquals(false, weather.has("latitude"));
        assertEquals(false, weather.has("longitude"));
    }
}
