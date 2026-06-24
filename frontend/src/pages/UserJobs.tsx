import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    MapPin,
    Briefcase,
    Award,
    Share2,
    Globe,
    ArrowRight,
    Clock,
    Building,
    ChevronLeft,
    ChevronRight,
    Play,
    Bolt,
    Filter,
    Sparkles,
    Menu,
    X,
    Home,
    Settings,
    Users
} from 'lucide-react'
import { getJobs } from '@/api'
import { toast } from 'sonner'

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

// Default mock jobs to display if DB is empty
const SAMPLE_JOBS: Job[] = [
    {
        id: 1,
        company: "CloudScale Systems",
        jobRole: "Senior Frontend Engineer",
        location: "San Francisco, CA",
        experience: "5+ Years Experience",
        applyLink: "https://example.com/apply/1",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 2,
        company: "PixelFlow Creative",
        jobRole: "Junior Product Designer",
        location: "Remote, Global",
        experience: "Freshers Welcome",
        applyLink: "https://example.com/apply/2",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 3,
        company: "NeuralPath AI",
        jobRole: "AI Research Scientist",
        location: "New York, NY",
        experience: "3+ Years Experience",
        applyLink: "https://example.com/apply/3",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 4,
        company: "GlobalStore Inc.",
        jobRole: "Backend Architect",
        location: "Seattle, WA",
        experience: "8+ Years Experience",
        applyLink: "https://example.com/apply/4",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 5,
        company: "EcoVolt Labs",
        jobRole: "QA Engineer",
        location: "Austin, TX",
        experience: "2+ Years Experience",
        applyLink: "https://example.com/apply/5",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 6,
        company: "PulseMedia",
        jobRole: "Growth Marketing Manager",
        location: "Los Angeles, CA",
        experience: "4+ Years Experience",
        applyLink: "https://example.com/apply/6",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
    }
]

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

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15
        }
    }
}

const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1] as const // Custom ease-out
        }
    }
}

function UserJobs() {
    // Mobile menu toggle state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Check screen size for responsive background asset selection
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [mobileMenuOpen])

    // Search state
    const [searchInput, setSearchInput] = useState('')
    const [locationInput, setLocationInput] = useState('')

    // Search queries that actually trigger fetch
    const [searchQuery, setSearchQuery] = useState('')
    const [locationQuery, setLocationQuery] = useState('')

    // Filter state
    const [filterType, setFilterType] = useState<string>('') // '', 'freshers', 'experienced', 'remote'

    // Fetch approved jobs
    const { data: dbJobs, isLoading } = useQuery({
        queryKey: ['jobs', { search: searchQuery, location: locationQuery, filterType }],
        queryFn: async () => {
            const response = await getJobs({
                search: searchQuery || undefined,
                location: locationQuery || undefined,
                filterType: filterType || undefined
            })
            return response.data || []
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

    // Handle share page click
    const handleSharePage = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success("Page link copied to clipboard!")
    }

    // Select which list to display
    const isSearchActive = !!searchQuery || !!locationQuery || !!filterType
    const displayJobs = (dbJobs && dbJobs.length > 0) ? dbJobs : (isSearchActive ? [] : SAMPLE_JOBS)
    const isDemoData = !isLoading && (!dbJobs || dbJobs.length === 0) && !isSearchActive

    // Pagination logic
    const [currentPage, setCurrentPage] = useState(1)
    const jobsPerPage = 6

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, locationQuery, filterType])

    const totalPages = Math.ceil(displayJobs.length / jobsPerPage)
    const indexOfLastJob = currentPage * jobsPerPage
    const indexOfFirstJob = indexOfLastJob - jobsPerPage
    const paginatedJobs = displayJobs.slice(indexOfFirstJob, indexOfLastJob)

    return (
        <div className="text-[#111827] min-h-screen flex flex-col font-sans bg-[#FCFAFF]">
            {/* Navbar (Sticky transparent SaaS style with backdrop blur) */}
            <header className="sticky top-0 w-full z-50 bg-transparent border-transparent backdrop-blur-md">
                <div className="w-full h-16 flex items-center justify-between px-6 md:px-10 max-w-[1280px] mx-auto relative">
                    {/* Brand */}
                    <a href="#" className="flex items-center gap-3 text-xl font-black text-[#111827]">
                        <img src="/jobshortcut_logo.svg" alt="Job Shortcut Logo" className="h-8 w-auto object-contain" />
                        <span>Job <span className="text-[#5B3DF5]">Shortcut</span></span>
                    </a>

                    {/* Center Links (Linear style) */}
                    <nav className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#5B6475]">
                        <a href="#hero-section" className="hover:text-[#5B3DF5] transition-colors">Home</a>
                        <a href="#jobs-section" className="hover:text-[#5B3DF5] transition-colors">Job Opporunities</a>
                        <a href="#" className="hover:text-[#5B3DF5] transition-colors">How it works</a>
                        <a href="#" className="hover:text-[#5B3DF5] transition-colors">About us</a>
                    </nav>

                    {/* Mobile Hamburger Button */}
                    <button 
                        onClick={() => setMobileMenuOpen(prev => !prev)}
                        className="lg:hidden p-2 rounded-xl text-[#5B6475] hover:text-[#5B3DF5] hover:bg-[#5B3DF5]/5 transition-all cursor-pointer"
                        aria-label="Toggle Mobile Menu"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                </div>

                {/* Mobile Dropdown Menu Drawer (Full screen overlay matching image layout) */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="fixed inset-0 w-full h-screen bg-gradient-to-b from-[#FCFAFF] via-[#FCFAFF] to-[#EBE3FF]/40 z-[100] px-6 py-6 flex flex-col justify-between lg:hidden overflow-y-auto"
                        >
                            {/* Header row in full overlay */}
                            <div className="w-full flex items-center justify-between h-16">
                                <a 
                                    href="#" 
                                    onClick={() => setMobileMenuOpen(false)} 
                                    className="flex items-center gap-3 text-xl font-black text-[#111827]"
                                >
                                    <img src="/jobshortcut_logo.svg" alt="Job Shortcut Logo" className="h-8 w-auto object-contain" />
                                    <span>Job <span className="text-[#5B3DF5]">Shortcut</span></span>
                                </a>
                                <button 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 rounded-xl text-[#5B6475] hover:text-[#5B3DF5] hover:bg-[#5B3DF5]/5 transition-all cursor-pointer"
                                    aria-label="Close Mobile Menu"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Menu Options (Vertical list matching user image style) */}
                            <div className="flex flex-col w-full mt-6 gap-2">
                                {/* Option 1: Home (Active highlight style) */}
                                <a 
                                    href="#hero-section" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-4 w-full p-3 rounded-2xl bg-[#5B3DF5]/5 text-[#111827] transition-all hover:bg-[#5B3DF5]/10 active:bg-[#5B3DF5]/15"
                                >
                                    <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                        <Home className="h-5 w-5" />
                                    </div>
                                    <span className="text-[16px] font-bold">Home</span>
                                </a>

                                <div className="h-[1px] w-[95%] bg-[#EBE3FF] opacity-50 mx-auto"></div>

                                {/* Option 2: Job Opportunities */}
                                <a 
                                    href="#jobs-section" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-4 w-full p-3 rounded-2xl text-[#111827] transition-all hover:bg-[#5B3DF5]/5 active:bg-[#5B3DF5]/10"
                                >
                                    <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                        <Search className="h-5 w-5" />
                                    </div>
                                    <span className="text-[16px] font-bold">Job Opportunities</span>
                                </a>

                                <div className="h-[1px] w-[95%] bg-[#EBE3FF] opacity-50 mx-auto my-1"></div>

                                {/* Option 3: How it works */}
                                <a 
                                    href="#" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-4 w-full p-3 rounded-2xl text-[#111827] transition-all hover:bg-[#5B3DF5]/5 active:bg-[#5B3DF5]/10"
                                >
                                    <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <span className="text-[16px] font-bold">How It Works</span>
                                </a>

                                <div className="h-[1px] w-[95%] bg-[#EBE3FF] opacity-50 mx-auto my-1"></div>

                                {/* Option 4: About us */}
                                <a 
                                    href="#" 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-4 w-full p-3 rounded-2xl text-[#111827] transition-all hover:bg-[#5B3DF5]/5 active:bg-[#5B3DF5]/10"
                                >
                                    <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <span className="text-[16px] font-bold">About Us</span>
                                </a>
                            </div>

                            {/* CTA Action button at bottom */}
                            <div className="w-full mt-auto mb-6 pt-6">
                                <a 
                                    href="#jobs-section"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full bg-[#5B3DF5] text-white py-4 px-6 rounded-2xl flex items-center justify-between font-bold text-[16px] shadow-lg shadow-[#5B3DF5]/30 hover:bg-[#492EE0] active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <Briefcase className="h-5 w-5" />
                                        <span>Find Jobs Smarter</span>
                                    </div>
                                    <ArrowRight className="h-5 w-5" />
                                </a>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Hero wrapper with Backdrop background shifted up under the sticky header */}
            <div 
                className="w-full relative bg-[#FCFAFF] -mt-16"
                style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(252, 250, 255, 0) 70%, #FCFAFF 100%), url('${isMobile ? '/MobileBackdrop.png' : '/Backdrop.png'}')`,
                    backgroundSize: isMobile ? '100% 100%, 100% 100%' : 'cover, cover',
                    backgroundPosition: isMobile ? 'top center, top center' : 'center, 80% center',
                    backgroundRepeat: 'no-repeat, no-repeat'
                }}
            >
                {/* Hero Section (Left-aligned layout, shares Backdrop background with header wrapper) */}
                <section id="hero-section" className="mt-6 relative min-h-[75vh] flex items-center justify-start pt-24 pb-16 md:pb-24 overflow-hidden w-full">
                    <div className="max-w-[1280px] mx-auto w-full px-6 md:px-10 flex justify-start">
                        
                        {/* Left-aligned Column Content */}
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex flex-col items-start text-left space-y-6 max-w-2xl"
                        >
                            {/* Top Badge */}
                            <motion.div 
                                variants={fadeUpVariants}
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#EBE3FF] text-[#5B3DF5] text-[12px] font-semibold shadow-sm"
                            >
                                <Sparkles className="h-4 w-4 text-[#5B3DF5]" />
                                <span>Open Doors. Not Tabs.</span>
                            </motion.div>

                            {/* Main Heading */}
                            <motion.h1 
                                variants={fadeUpVariants}
                                className="text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.05] font-black text-[#111827] tracking-tighter"
                            >
                                One <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]">Dashboard</span><br />
                                Endless Opportunities.
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p 
                                variants={fadeUpVariants}
                                className="text-[15px] md:text-[17px] leading-[1.7] text-[#5B6475] max-w-[600px] font-normal"
                            >
                                Stop opening endless tabs to find one opportunity. JobShortCut collects verified openings from multiple career websites and brings them together in one place.                            </motion.p>

                            {/* Primary Actions */}
                            <motion.div 
                                variants={fadeUpVariants}
                                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4"
                            >
                                <motion.button
                                    onClick={() => document.getElementById('jobs-section')?.scrollIntoView({ behavior: 'smooth' })}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto bg-[#5B3DF5] text-white h-14 px-8 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#4a2ee0] transition-all cursor-pointer"
                                >
                                    <span>Find Jobs Smarter</span>
                                    <ArrowRight className="h-4.5 w-4.5" />
                                </motion.button>

                                <motion.button
                                    onClick={() => toast.info("Check back soon! Video demo coming shortly.")}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 text-[#5B6475] hover:text-[#5B3DF5] text-[15px] font-bold h-14 px-6 rounded-xl hover:bg-[#5B3DF5]/5 transition-colors cursor-pointer"
                                >
                                    <span className="w-8 h-8 rounded-full border-2 border-[#5B6475]/30 flex items-center justify-center shrink-0">
                                        <Play className="h-3.5 w-3.5 fill-current text-current" />
                                    </span>
                                    <span>See How It Works</span>
                                </motion.button>
                            </motion.div>

                            {/* Feature Pills */}
                            <motion.div 
                                variants={containerVariants}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-10"
                            >
                                <motion.div 
                                    variants={fadeUpVariants}
                                    whileHover={{ y: -3 }}
                                    className="bg-white p-4 rounded-2xl border border-white/80 shadow-md flex items-center gap-3.5 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="p-2 bg-[#5B3DF5]/10 rounded-xl text-[#5B3DF5] shrink-0">
                                        <Search className="h-5 w-5" />
                                    </div>
                                    <div className="text-left leading-tight">
                                        <h4 className="font-bold text-[#111827] text-xs">10+ Trusted</h4>
                                        <p className="text-[10px] text-[#5B6475]">Aggregation sources</p>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    variants={fadeUpVariants}
                                    whileHover={{ y: -3 }}
                                    className="bg-white p-4 rounded-2xl border border-white/80 shadow-md flex items-center gap-3.5 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="p-2 bg-[#5B3DF5]/10 rounded-xl text-[#5B3DF5] shrink-0">
                                        <Filter className="h-5 w-5" />
                                    </div>
                                    <div className="text-left leading-tight">
                                        <h4 className="font-bold text-[#111827] text-xs">Smart Filters</h4>
                                        <p className="text-[10px] text-[#5B6475]">Clean structured fields</p>
                                    </div>
                                </motion.div>

                                <motion.div 
                                    variants={fadeUpVariants}
                                    whileHover={{ y: -3 }}
                                    className="bg-white p-4 rounded-2xl border border-white/80 shadow-md flex items-center gap-3.5 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="p-2 bg-[#5B3DF5]/10 rounded-xl text-[#5B3DF5] shrink-0">
                                        <Bolt className="h-5 w-5" />
                                    </div>
                                    <div className="text-left leading-tight">
                                        <h4 className="font-bold text-[#111827] text-xs">Direct Apply</h4>
                                        <p className="text-[10px] text-[#5B6475]">Official registration sites</p>
                                    </div>
                                </motion.div>
                            </motion.div>

                            {/* Trust Line */}
                            <motion.div 
                                variants={fadeUpVariants}
                                className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-6 text-[13px] font-semibold text-[#5B6475]/90"
                            >
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#5B3DF5] text-sm font-bold">✓</span>
                                    <span>No Ads</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#5B3DF5] text-sm font-bold">✓</span>
                                    <span>No Noise</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#5B3DF5] text-sm font-bold">✓</span>
                                    <span>No Endless Scrolling</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[#5B3DF5] text-sm font-bold">✓</span>
                                    <span>100% Free</span>
                                </div>
                            </motion.div>
                        </motion.div>

                    </div>
                </section>
            </div>

            <main className="flex-grow">
                {/* Main Content Search/Filter & Streams Area */}
                <section id="jobs-section" className="max-w-[1280px] mx-auto px-6 md:px-10 py-20">
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
                                <div className="md:col-span-5 flex items-center gap-3 border border-[#E5E7EB] rounded-2xl px-4 py-2.5 bg-[#FCFAFF] focus-within:border-[#7B61FF] focus-within:bg-white transition-all">
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
                                <div className="md:col-span-3">
                                    <motion.button
                                        type="submit"
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full bg-[#5B3DF5] text-white font-bold text-sm py-3 rounded-2xl shadow-md hover:bg-[#4a2ee0] transition-colors cursor-pointer"
                                    >
                                        Search Stream
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
                                {isDemoData ? "Default Sample Career Listings" : "Live feeds"}
                            </span>
                            <span className="text-xs bg-[#5B3DF5]/10 text-[#5B3DF5] px-3 py-1.5 rounded-full font-bold">
                                {displayJobs.length} active opportunities
                            </span>
                        </div>

                        {/* Loading state Skeletons */}
                        {isLoading && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1280px] w-full mx-auto">
                                {[...Array(6)].map((_, idx) => (
                                    <div key={idx} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-pulse space-y-5">
                                        <div className="space-y-3">
                                            <div className="h-3 w-1/3 bg-gray-100 rounded" />
                                            <div className="h-3.5 w-1/2 bg-gray-100 rounded" />
                                        </div>
                                        <div className="space-y-2.5 pt-4">
                                            <div className="h-3.5 w-2/3 bg-gray-100 rounded" />
                                            <div className="h-3.5 w-3/5 bg-gray-100 rounded" />
                                        </div>
                                        <div className="h-10 w-full bg-gray-100 rounded-xl pt-4" />
                                    </div>
                                ))}
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
                                                {isDemoData && (
                                                    <span className="bg-[#5B3DF5]/10 text-[#5B3DF5] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#5B3DF5]/20 font-mono uppercase tracking-wider">
                                                        Demo
                                                    </span>
                                                )}
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

            {/* Premium Light-Only Footer */}
            <footer className="bg-white border-t border-gray-100 mt-auto transition-colors duration-300">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <span className="text-lg font-bold text-[#111827]">
                            Job <span className="text-[#5B3DF5]">Shortcut</span>
                        </span>
                        <p className="text-xs text-[#5B6475] opacity-80">
                            © {new Date().getFullYear()} Job Shortcut. Building the future of tech recruitment.
                        </p>
                    </div>

                    <nav className="flex flex-wrap justify-center gap-8 text-xs font-semibold text-[#5B6475]">
                        <a href="#" className="hover:text-[#5B3DF5] transition-all">About Us</a>
                        <a href="#" className="hover:text-[#5B3DF5] transition-all">Privacy Policy</a>
                        <a href="#" className="hover:text-[#5B3DF5] transition-all">Terms &amp; Conditions</a>
                    </nav>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSharePage}
                            className="w-10 h-10 rounded-full bg-[#FCFAFF] flex items-center justify-center text-[#5B6475] hover:text-[#5B3DF5] transition-all border border-[#EBE3FF] hover:border-[#7B61FF]/30 cursor-pointer active:scale-95"
                            title="Copy Page Link"
                        >
                            <Share2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                            onClick={() => toast.info("Pipeline translation under development.")}
                            className="w-10 h-10 rounded-full bg-[#FCFAFF] flex items-center justify-center text-[#5B6475] hover:text-[#5B3DF5] transition-all border border-[#EBE3FF] hover:border-[#7B61FF]/30 cursor-pointer active:scale-95"
                            title="Language settings"
                        >
                            <Globe className="h-4.5 w-4.5" />
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default UserJobs