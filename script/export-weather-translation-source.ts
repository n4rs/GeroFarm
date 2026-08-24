import { supportedLocales } from "../client/src/home-copy";
import { weatherEnglishCopy } from "../client/src/app/weather/weather-locales";

console.log(JSON.stringify({
  supportedLocales,
  source: {
    ...weatherEnglishCopy,
    description: "Centrally managed virtual stations, forecasts, history and versioned agronomic indicators.",
  },
}));
