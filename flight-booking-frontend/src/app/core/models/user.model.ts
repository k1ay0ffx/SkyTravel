export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  passport_number?: string;
  passport_expiry?: string;
  nationality?: string;
  date_of_birth?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;  
  first_name: string;
  last_name: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}