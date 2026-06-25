import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob } from '@/api';
import { Button } from './ui/button';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateJobDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateJobDialog({ isOpen, onClose }: CreateJobDialogProps) {
    const [company, setCompany] = useState('');
    const [jobRole, setJobRole] = useState('');
    const [experience, setExperience] = useState('');
    const [location, setLocation] = useState('');
    const [applyLink, setApplyLink] = useState('');

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const queryClient = useQueryClient();
    const createMutation = useMutation({
        mutationFn: createJob,
        onSuccess: () => {
            toast.success("Job created successfully!");
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            // Reset form
            setCompany('');
            setJobRole('');
            setExperience('');
            setLocation('');
            setApplyLink('');
            onClose();
        },
        onError: (err: any) => {
            if (err && err.status === 409) {
                toast.error("This job link already exists in the database.");
            } else {
                toast.error(err.message || "Failed to create job.");
            }
        }
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!jobRole.trim()) {
            toast.error("Job role/title is required.");
            return;
        }
        if (!applyLink.trim()) {
            toast.error("Apply link is required.");
            return;
        }
        createMutation.mutate({
            company: company.trim() || null,
            jobRole: jobRole.trim(),
            experience: experience.trim() || null,
            location: location.trim() || null,
            applyLink: applyLink.trim(),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative">
                
                {/* Close Button */}
                <button 
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary transition-all cursor-pointer"
                    aria-label="Close dialog"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border pb-3">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Create Job</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Fill in the details to add a job to the tracker.</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Job Title *
                            </label>
                            <input
                                type="text"
                                value={jobRole}
                                onChange={(e) => setJobRole(e.target.value)}
                                required
                                placeholder="e.g. Software Engineer"
                                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Company Name
                            </label>
                            <input
                                type="text"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="e.g. Google"
                                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Location
                            </label>
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Remote / Bangalore"
                                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Experience
                            </label>
                            <input
                                type="text"
                                value={experience}
                                onChange={(e) => setExperience(e.target.value)}
                                placeholder="e.g. 1-3 years"
                                className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Apply Link *
                        </label>
                        <input
                            type="url"
                            value={applyLink}
                            onChange={(e) => setApplyLink(e.target.value)}
                            required
                            placeholder="https://company.com/careers/job-123"
                            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="outline"
                            className="px-4 py-4 rounded-md text-sm font-medium border-border hover:bg-secondary cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md text-sm cursor-pointer flex items-center gap-2"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Job"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
