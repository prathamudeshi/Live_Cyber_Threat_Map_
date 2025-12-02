import { Country } from '../types';

export const countries: Country[] = [
  { name: 'United States', code: 'US', latitude: 37.0902, longitude: -95.7129 },
  { name: 'Russia', code: 'RU', latitude: 61.5240, longitude: 105.3188 },
  { name: 'China', code: 'CN', latitude: 35.8617, longitude: 104.1954 },
  { name: 'United Kingdom', code: 'GB', latitude: 55.3781, longitude: -3.4360 },
  { name: 'Germany', code: 'DE', latitude: 51.1657, longitude: 10.4515 },
  { name: 'France', code: 'FR', latitude: 46.2276, longitude: 2.2137 },
  { name: 'Brazil', code: 'BR', latitude: -14.2350, longitude: -51.9253 },
  { name: 'India', code: 'IN', latitude: 20.5937, longitude: 78.9629 },
  { name: 'Japan', code: 'JP', latitude: 36.2048, longitude: 138.2529 },
  { name: 'Australia', code: 'AU', latitude: -25.2744, longitude: 133.7751 },
  { name: 'Canada', code: 'CA', latitude: 56.1304, longitude: -106.3468 },
  { name: 'South Korea', code: 'KR', latitude: 35.9078, longitude: 127.7669 },
  { name: 'Iran', code: 'IR', latitude: 32.4279, longitude: 53.6880 },
  { name: 'North Korea', code: 'KP', latitude: 40.3399, longitude: 127.5101 },
  { name: 'Israel', code: 'IL', latitude: 31.0461, longitude: 34.8516 },
  { name: 'South Africa', code: 'ZA', latitude: -30.5595, longitude: 22.9375 },
  { name: 'Mexico', code: 'MX', latitude: 23.6345, longitude: -102.5528 },
  { name: 'Singapore', code: 'SG', latitude: 1.3521, longitude: 103.8198 },
  { name: 'Netherlands', code: 'NL', latitude: 52.1326, longitude: 5.2913 },
  { name: 'Sweden', code: 'SE', latitude: 60.1282, longitude: 18.6435 },
  { name: 'Ukraine', code: 'UA', latitude: 48.3794, longitude: 31.1656 },
  { name: 'Turkey', code: 'TR', latitude: 38.9637, longitude: 35.2433 },
  { name: 'Spain', code: 'ES', latitude: 40.4637, longitude: -3.7492 },
  { name: 'Italy', code: 'IT', latitude: 41.8719, longitude: 12.5674 },
  { name: 'Pakistan', code: 'PK', latitude: 30.3753, longitude: 69.3451 },
  { name: 'Saudi Arabia', code: 'SA', latitude: 23.8859, longitude: 45.0792 },
  { name: 'Egypt', code: 'EG', latitude: 26.8206, longitude: 30.8025 },
  { name: 'Nigeria', code: 'NG', latitude: 9.0820, longitude: 8.6753 },
  { name: 'Argentina', code: 'AR', latitude: -38.4161, longitude: -63.6167 },
  { name: 'Vietnam', code: 'VN', latitude: 14.0583, longitude: 108.2772 }
];

export const getRandomCountry = (): Country => {
  return countries[Math.floor(Math.random() * countries.length)];
};

export const getRandomCountryExcept = (excludedCountry: Country): Country => {
  let randomCountry: Country;
  do {
    randomCountry = getRandomCountry();
  } while (randomCountry.code === excludedCountry.code);
  
  return randomCountry;
};