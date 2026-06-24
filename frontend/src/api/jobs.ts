import { apiClient } from './client';

export interface CreateJobData {
  company: string | null;
  jobRole: string | null;
  experience: string | null;
  location: string | null;
  applyLink: string;
}

export interface Job {
  id: number;
  company: string | null;
  jobRole: string | null;
  experience: string | null;
  location: string | null;
  applyLink: string;
  createdAt: string;
  updatedAt: string;
}

export async function createJob(data: CreateJobData) {
  return apiClient('/jobs', {
    method: 'POST',
    body: data,
  });
}

export async function getJobs(params?: { search?: string; location?: string; filterType?: string }) {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.location) query.append('location', params.location);
  if (params?.filterType) query.append('filterType', params.filterType);

  const queryString = query.toString();
  return apiClient<{ status: boolean; data: Job[] }>(`/jobs${queryString ? `?${queryString}` : ''}`);
}

