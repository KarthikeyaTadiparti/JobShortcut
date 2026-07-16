import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
    Search,
    MapPin,
    Briefcase,
    Award,
    Clock,
    Building,
    ChevronLeft,
    ChevronRight,
    AlertCircle
} from 'lucide-react'
import { getJobs } from '@/api'
import UserNavbar from '@/components/UserNavbar'
import UserFooter from '@/components/UserFooter'

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

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
        return diffMins <= 1 ? "Posted just now" : `Posted ${diffMins} mins ago`
    } else if (diffHours < 24) {
        return diffHours === 1 ? "Posted 1 hour ago" : `Posted ${diffHours} hours ago`
    } else {
        return diffDays === 1 ? "Posted 1 day ago" : `Posted ${diffDays} days ago`
    }
}

function UserJobs() {
    // Search state
    const [searchInput, setSearchInput] = useState('')
    const [locationInput, setLocationInput] = useState('')

    // Search queries that actually trigger fetch
    const [searchQuery, setSearchQuery] = useState('')
    const [locationQuery, setLocationQuery] = useState('')

    // Pagination logic
    const [currentPage, setCurrentPage] = useState(1)

    // Filter state
    const [filterType, setFilterType] = useState<string>('') // '', 'freshers', 'experienced', 'remote'

    // Fetch approved jobs
    const { data: dbJobs, isLoading } = useQuery({
        queryKey: ['jobs', { page: currentPage, search: searchQuery, location: locationQuery, filterType }],
        queryFn: async () => {
            const response = await getJobs({
                page: currentPage,
                search: searchQuery || undefined,
                location: locationQuery || undefined,
                filterType: filterType || undefined
            })

            return response.data || undefined;
        }
    })

    // Handle Search submit
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSearchQuery(searchInput)
        setLocationQuery(locationInput)
        // Scroll to search section
        document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
    }

    // Select which list to display
    const displayJobs = dbJobs?.jobs || [];
    const totalPages = dbJobs?.totalPages || 1;
    const totalCount = dbJobs?.totalCount || 0;


    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, locationQuery, filterType])

    
    const paginatedJobs = displayJobs

    return (
        <div className="text-[#111827] min-h-screen flex flex-col font-sans bg-[#FCFAFF]">
            <UserNavbar />

            <main className="grow">
                {/* Main Content Search/Filter & Streams Area */}
                <section id="jobs-section" className="max-w-[1280px] mx-auto px-6 md:px-10 py-10">
                    <div className="flex flex-col space-y-12">
                        
                        {/* Interactive Search Console panel */}
                        <div className="bg-white border border-[#EBE3FF] shadow-lg p-6 rounded-3xl w-full max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center gap-3 border-b border-[#F3EBFF] pb-4">
                                <div className="p-2 bg-[#5B3DF5]/10 rounded-xl text-[#5B3DF5]">
                                    <Search className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-bold text-[#111827]">Opportunities Search</h3>
                            </div>

                            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                {/* Keywords input */}
                                <div className="md:col-span-6 flex items-center gap-3 border border-[#E5E7EB] rounded-2xl px-4 py-2.5 bg-[#FCFAFF] focus-within:border-[#7B61FF] focus-within:bg-white transition-all">
                                    <Search className="h-4.5 w-4.5 text-[#5B6475]" />
                                    <input
                                        type="text"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="Job title, keywords..."
                                        className="w-full bg-transparent border-none outline-none text-[15px] focus:ring-0 text-[#111827] placeholder:text-[#5B6475]/50"
                                    />
                                </div>

                                {/* Location input */}
                                <div className="md:col-span-4 flex items-center gap-3 border border-[#E5E7EB] rounded-2xl px-4 py-2.5 bg-[#FCFAFF] focus-within:border-[#7B61FF] focus-within:bg-white transition-all">
                                    <MapPin className="h-4.5 w-4.5 text-[#5B6475]" />
                                    <input
                                        type="text"
                                        value={locationInput}
                                        onChange={(e) => setLocationInput(e.target.value)}
                                        placeholder="City or remote"
                                        className="w-full bg-transparent border-none outline-none text-[15px] focus:ring-0 text-[#111827] placeholder:text-[#5B6475]/50"
                                    />
                                </div>

                                {/* Search button */}
                                <div className="md:col-span-2">
                                    <motion.button
                                        type="submit"
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-[#5B3DF5] text-white font-bold text-sm py-3 rounded-2xl shadow-md hover:bg-[#4a2ee0] transition-colors cursor-pointer"
                                    >
                                        Search
                                    </motion.button>
                                </div>
                            </form>

                            {/* Category Filter Chips list */}
                            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
                                {[
                                    { label: 'All Jobs', value: '' },
                                    { label: 'Freshers', value: 'freshers' },
                                    { label: 'Experienced', value: 'experienced' },
                                    { label: 'Remote', value: 'remote' }
                                ].map((chip) => {
                                    const isActive = filterType === chip.value
                                    return (
                                        <button
                                            key={chip.value}
                                            onClick={() => setFilterType(chip.value)}
                                            className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                                                isActive
                                                    ? 'bg-[#5B3DF5] text-white border-transparent shadow-sm'
                                                    : 'bg-white hover:bg-[#FCFAFF] text-[#5B6475] hover:text-[#5B3DF5] border-[#E5E7EB]'
                                            }`}
                                        >
                                            {chip.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Stream Listings metadata */}
                        <div className="flex items-center justify-between max-w-4xl mx-auto w-full border-b border-[#F3EBFF] pb-4">
                            <span className="text-sm font-bold text-[#5B6475] uppercase tracking-wider font-mono">
                                Live feeds
                            </span>
                            <span className="text-xs bg-[#5B3DF5]/10 text-[#5B3DF5] px-3 py-1.5 rounded-full font-bold">
                                {totalCount} active opportunities
                            </span>
                        </div>

                        {/* Loading state Skeletons */}
                        {isLoading && (
                            <div className="w-full max-w-[1280px] mx-auto space-y-6">
                                {/* Render Cold Start Warning Box */}
                                <div className="bg-[#FFFDF5] border border-[#F3E8B4] text-[#8C6D1F] p-5 rounded-2xl flex items-start gap-4 shadow-sm max-w-4xl mx-auto animate-pulse">
                                    <AlertCircle className="h-6 w-6 text-[#D4AF37] shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-[#755D18]">Connecting to Backend Server...</h4>
                                        <p className="text-xs text-[#8C6D1F]/90 leading-relaxed font-medium">
                                            Please note: Initial data fetch might take <strong>1-2 minutes</strong> due to a cold start on the Render free hosting tier. We appreciate your patience!
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[...Array(6)].map((_, idx) => (
                                        <div key={idx} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-pulse space-y-6 flex flex-col justify-between min-h-[340px]">
                                            <div className="space-y-4">
                                                {/* Date Skeleton */}
                                                <div className="flex justify-between items-center">
                                                    <div className="h-3.5 w-24 bg-gray-200 rounded-full" />
                                                </div>
                                                
                                                {/* Company Name Skeleton */}
                                                <div className="h-3.5 w-32 bg-[#E1D8FF] rounded-full" />
                                                
                                                {/* Job Title Skeleton */}
                                                <div className="space-y-2">
                                                    <div className="h-5 w-11/12 bg-gray-200 rounded-lg" />
                                                    <div className="h-5 w-2/3 bg-gray-200 rounded-lg" />
                                                </div>
                                            </div>

                                            <div>
                                                {/* Location / Experience Skeleton */}
                                                <div className="space-y-3 mb-8 border-t border-gray-100 pt-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-4 w-4 bg-gray-200 rounded-full shrink-0" />
                                                        <div className="h-3.5 w-2/3 bg-gray-200 rounded-full" />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-4 w-4 bg-gray-200 rounded-full shrink-0" />
                                                        <div className="h-3.5 w-1/2 bg-gray-200 rounded-full" />
                                                    </div>
                                                </div>
                                                
                                                {/* Apply Button Skeleton */}
                                                <div className="h-11 w-full bg-gray-200 rounded-xl" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty search results state */}
                        {!isLoading && displayJobs.length === 0 && (
                            <div className="max-w-md mx-auto text-center py-16 space-y-4">
                                <div className="w-16 h-16 bg-[#5B3DF5]/5 rounded-full flex items-center justify-center mx-auto border border-[#EBE3FF]">
                                    <Briefcase className="h-8 w-8 text-[#5B6475]" />
                                </div>
                                <h3 className="text-lg font-bold text-[#111827]">No opportunities found</h3>
                                <p className="text-sm text-[#5B6475] leading-relaxed">
                                    We couldn't find any approved jobs matching "{searchQuery}" in {locationQuery || 'the requested filters'}. Try adjustments.
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchInput('')
                                        setLocationInput('')
                                        setSearchQuery('')
                                        setLocationQuery('')
                                        setFilterType('')
                                    }}
                                    className="text-xs font-bold text-[#5B3DF5] hover:underline"
                                >
                                    Clear all search parameters
                                </button>
                            </div>
                        )}

                        {/* Job Card Grid */}
                        {!isLoading && paginatedJobs.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1280px] w-full mx-auto">
                                {paginatedJobs.map((job) => (
                                    <motion.div
                                        key={job.id}
                                        whileHover={{ y: -4, boxShadow: "0 12px 24px -10px rgba(91,61,245,0.15)" }}
                                        className="group bg-white p-8 rounded-2xl border border-gray-100 hover:border-[#7B61FF]/40 shadow-sm transition-all duration-300 flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                {/* Posted date */}
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#5B6475]/70 font-mono">
                                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                                    {formatRelativeTime(job.createdAt)}
                                                </span>
                                            </div>

                                            <p className="text-xs font-bold text-[#5B3DF5] mb-2.5 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                                                <Building className="h-3.5 w-3.5" />
                                                {job.company || 'Unknown Company'}
                                            </p>

                                            <h3 className="text-lg font-bold text-[#111827] group-hover:text-[#5B3DF5] transition-colors line-clamp-2 leading-tight">
                                                {job.jobRole || 'Unknown Role'}
                                            </h3>
                                        </div>

                                        <div>
                                            {/* Location & Experience */}
                                            <div className="space-y-2.5 mb-8 border-t border-gray-100 pt-4 font-medium text-[13px] text-[#5B6475]">
                                                <div className="flex items-center gap-3">
                                                    <MapPin className="h-4.5 w-4.5 text-[#5B6475]/60 shrink-0" />
                                                    <span>{job.location || 'Not Specified'}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Award className="h-4.5 w-4.5 text-[#5B6475]/60 shrink-0" />
                                                    <span>{job.experience || 'Experience Not Stated'}</span>
                                                </div>
                                            </div>

                                            {/* Apply Now button */}
                                            <a
                                                href={job.applyLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full text-center bg-[#FCFAFF] text-[#5B3DF5] hover:bg-[#5B3DF5] hover:text-white py-3 rounded-xl font-bold text-xs border border-[#EBE3FF] transition-all duration-300 cursor-pointer active:scale-95"
                                            >
                                                Apply Now
                                            </a>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Pagination Section */}
                        {!isLoading && totalPages > 1 && (
                            <div className="mt-8 flex justify-center items-center gap-2">
                                <button
                                    onClick={() => {
                                        setCurrentPage(prev => Math.max(prev - 1, 1))
                                        document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                                    }}
                                    disabled={currentPage === 1}
                                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-[#111827] hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer active:scale-95 duration-200"
                                    aria-label="Previous Page"
                                >
                                    <ChevronLeft className="h-4.5 w-4.5" />
                                </button>

                                {[...Array(totalPages)].map((_, idx) => {
                                    const pageNumber = idx + 1
                                    const isActive = currentPage === pageNumber
                                    return (
                                        <button
                                            key={pageNumber}
                                            onClick={() => {
                                                setCurrentPage(pageNumber)
                                                document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                                            }}
                                            className={`flex items-center justify-center w-10 h-10 rounded-xl border font-bold text-sm transition-all cursor-pointer active:scale-95 duration-200 ${
                                                isActive
                                                    ? 'bg-[#5B3DF5] text-white border-transparent shadow-sm'
                                                    : 'border-gray-200 bg-white hover:bg-gray-50 text-[#5B6475] hover:text-[#5B3DF5]'
                                            }`}
                                        >
                                            {pageNumber}
                                        </button>
                                    )
                                })}

                                <button
                                    onClick={() => {
                                        setCurrentPage(prev => Math.min(prev + 1, totalPages))
                                        document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })
                                    }}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-[#111827] hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer active:scale-95 duration-200"
                                    aria-label="Next Page"
                                >
                                    <ChevronRight className="h-4.5 w-4.5" />
                                </button>
                            </div>
                        )}

                    </div>
                </section>
            </main>

            <UserFooter />
        </div>
    )
}

export default UserJobs