import { apiClient } from './client';

export async function loginUser(data: any) {
  return apiClient('/auth/login', {
    method: 'POST',
    body: data,
  });
}

export async function signupUser(data: any) {
  return apiClient('/auth/signup', {
    method: 'POST',
    body: data,
  });
}

export async function logoutUser() {
  return apiClient('/auth/logout', {
    method: 'GET',
  });
}
