// WeatherData matches the normalized weather objects consumed by app screens.
export interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  icon: string;
  city_name?: string;
}

// LoginResponse matches the backend OAuth-style login payload.
export interface LoginResponse {
  access_token: string;
  token_type: string;
}
