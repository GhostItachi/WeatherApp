// This interface describes the weather object used by frontend screens.
export interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  humidity: number;
  icon: string;
}

// This interface describes the token payload returned after login.
export interface LoginResponse {
  access_token: string;
  token_type: string;
}
