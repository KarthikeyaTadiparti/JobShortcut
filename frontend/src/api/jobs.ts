import { apiClient } from './client';

export interface CreateJobData {
  company: string | null;
  jobRole: string | null;
  experience: string | null;
  location: string | null;
  applyLink: string;
}

export async function createJob(data: CreateJobData) {
  return apiClient('/jobs', {
    method: 'POST',
    body: data,
  });
}
