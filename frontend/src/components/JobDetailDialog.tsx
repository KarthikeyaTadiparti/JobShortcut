import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Award, X, Copy, Check, ArrowUpRight, AlertCircle, Building } from 'lucide-react'
import { toast } from 'sonner'
import type { Job } from '@/api'

interface JobDetailDialogProps {
    job: Job | null | undefined;
    isOpen: boolean;
    isLoading?: boolean;
    onClose: () => void;
}

export default function JobDetailDialog({ job, isOpen, isLoading = false, onClose }: JobDetailDialogProps) {
    const [copied, setCopied] = useState(false);

    // Prevent scrolling background when dialog is open
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

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleCopyLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!job?.applyLink) return;

        navigator.clipboard.writeText(job.applyLink)
            .then(() => {
                setCopied(true);
                toast.success("Apply link copied to clipboard!");
                setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {
                toast.error("Failed to copy link.");
            });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-[#111827]/40 backdrop-blur-xs cursor-pointer"
                    aria-hidden="true"
                />

                {/* Dialog container with rounded-2xl and purple top gradient */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    className="relative w-full max-w-[640px] bg-white rounded-2xl p-7 sm:p-9 shadow-2xl border border-[#EBE3FF] z-10 overflow-hidden"
                >
                    {/* Purple gradient from top down through location & experience section */}
                    <div
                        className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-[#EAE2FF] via-[#F5F0FF] to-transparent pointer-events-none"
                        aria-hidden="true"
                    />

                    {/* Close button with no hover background */}
                    <button
                        onClick={onClose}
                        type="button"
                        aria-label="Close dialog"
                        className="absolute top-5 right-5 sm:top-6 sm:right-6 text-gray-400 hover:text-gray-700 p-1.5 transition-colors cursor-pointer z-20"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {isLoading ? (
                        /* Skeleton loader */
                        <div className="relative z-10 space-y-6 animate-pulse py-2">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 bg-gray-200 rounded-xs" />
                                <div className="h-4 w-28 bg-[#E1D8FF] rounded-full" />
                            </div>

                            <div className="space-y-2">
                                <div className="h-7 w-3/4 bg-gray-200 rounded-lg" />
                                <div className="h-7 w-1/2 bg-gray-200 rounded-lg" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                                <div className="h-14 bg-white/90 rounded-xl" />
                                <div className="h-14 bg-white/90 rounded-xl" />
                            </div>

                            <div className="border border-gray-100 rounded-xl p-6 space-y-4 bg-white">
                                <div className="h-5 w-28 bg-gray-200 rounded-md" />
                                <div className="h-4 w-3/4 bg-gray-100 rounded-md" />
                                <div className="h-11 bg-gray-100 rounded-xl" />
                                <div className="h-12 bg-[#5B3DF5]/30 rounded-xl" />
                            </div>
                        </div>
                    ) : !job ? (
                        /* Not found state */
                        <div className="relative z-10 text-center py-8 space-y-4">
                            <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-bold text-[#111827]">Job Opportunity Not Found</h3>
                            <p className="text-sm text-[#5B6475] max-w-sm mx-auto">
                                This opportunity may have expired or the link provided is invalid.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-[#5B3DF5] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-[#4a2ee0] transition-colors cursor-pointer"
                            >
                                Browse All Opportunities
                            </button>
                        </div>
                    ) : (
                        /* Actual Job Content */
                        <div className="relative z-10 space-y-6">
                            {/* Header: Company Icon & Company Name */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Building className="h-4 w-4 text-[#5B3DF5] shrink-0" />
                                    <span className="text-xs sm:text-sm font-extrabold text-[#5B3DF5] uppercase tracking-wider font-mono">
                                        {job.company || 'Unknown Company'}
                                    </span>
                                </div>

                                {/* Job Title */}
                                <h2 className="text-xl sm:text-2xl font-bold text-[#111827] leading-snug">
                                    {job.jobRole || 'Job Opportunity'}
                                </h2>
                            </div>

                            {/* Location & Experience Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Location Card */}
                                <div className="bg-white border border-[#EBE3FF] shadow-xs rounded-xl px-4 py-3.5 flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-[#5B6475] shrink-0 mt-0.5" />
                                    <span className="text-sm font-semibold text-[#111827] leading-relaxed break-words">
                                        {job.location || 'Location Not Specified'}
                                    </span>
                                </div>

                                {/* Experience Card */}
                                <div className="bg-white border border-[#EBE3FF] shadow-xs rounded-xl px-4 py-3.5 flex items-start gap-3">
                                    <Award className="h-5 w-5 text-[#5B6475] shrink-0 mt-0.5" />
                                    <span className="text-sm font-semibold text-[#111827] leading-relaxed break-words">
                                        {job.experience || 'Fresher - 10 Years'}
                                    </span>
                                </div>
                            </div>

                            {/* Apply Now Section Container */}
                            <div className="border border-[#EBE3FF] bg-white rounded-xl p-6 sm:p-7 space-y-4 shadow-xs">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                                        Apply Now
                                    </h3>
                                    <p className="text-xs sm:text-sm text-[#5B6475] mt-1">
                                        Click the button below to open the official application page.
                                    </p>
                                </div>

                                {/* Apply URL Box with Copy Button */}
                                <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm font-mono transition-colors">
                                    <span className="text-[#4B5563] truncate select-all">
                                        {job.applyLink}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="text-[#5B6475] hover:text-[#5B3DF5] transition-colors p-1.5 rounded-lg hover:bg-white cursor-pointer shrink-0"
                                        title="Copy Apply Link"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Primary Apply Button */}
                                <a
                                    href={job.applyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-[#5B3DF5] hover:bg-[#4a2ee0] text-white font-bold py-3.5 px-6 rounded-xl text-sm sm:text-base shadow-sm hover:shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Apply Now</span>
                                    <ArrowUpRight className="h-4.5 w-4.5" />
                                </a>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
