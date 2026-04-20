// This interface describes the weather object used in the frontend.
export interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  icon: string;
}

// This interface describes the token response after login.
export interface LoginResponse {
  access_token: string;
  token_type: string;
}
