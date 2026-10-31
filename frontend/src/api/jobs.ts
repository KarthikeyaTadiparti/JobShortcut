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
  return apiClient<{ status: boolean; data: Job; message: string }>('/jobs', {
    method: 'POST',
    body: data,
  });
}

export async function updateJob(id: number, data: Partial<CreateJobData>) {
  return apiClient<{ status: boolean; data: Job; message: string }>(`/jobs/${id}`, {
    method: 'PUT',
    body: data,
  });
}

export async function getJobById(id: number) {
  return apiClient<{ status: boolean; data: Job }>(`/jobs/${id}`);
}

export async function getJobs(params?: { page: number; search?: string; location?: string; filterType?: string }) {
  const query = new URLSearchParams();
  
  if (params?.page) query.append('page', params.page.toString());
  if (params?.search) query.append('search', params.search);
  if (params?.location) query.append('location', params.location);
  if (params?.filterType) query.append('filterType', params.filterType);

  const queryString = query.toString();
  return apiClient<{ status: boolean; data: { jobs: Job[]; currentPage: number; jobsPerPage: number; totalPages: number; totalCount: number } }>(`/jobs${queryString ? `?${queryString}` : ''}`);
}
