export interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  icon: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
