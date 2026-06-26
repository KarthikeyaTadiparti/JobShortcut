import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    Sparkles,
    ArrowRight,
    Play,
    Search,
    Filter,
    Bolt,
    Globe,
    ShieldCheck,
    Folder,
    Monitor,
    Briefcase,
    Check,
    Heart,
    Target,
    Eye,
    Smile,
    CheckCircle,
    Award
} from 'lucide-react'
import UserNavbar from '@/components/UserNavbar'
import UserFooter from '@/components/UserFooter'

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
            ease: [0.16, 1, 0.3, 1] as const
        }
    }
}

function UserHome() {
    const navigate = useNavigate()
    const location = useLocation()
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
        if (location.hash) {
            const id = location.hash.substring(1)
            const el = document.getElementById(id)
            if (el) {
                const timer = setTimeout(() => {
                    el.scrollIntoView({ behavior: 'smooth' })
                }, 150)
                return () => clearTimeout(timer)
            }
        }
    }, [location.key, location.hash])

    return (
        <div className="text-[#111827] min-h-screen flex flex-col font-sans bg-[#FCFAFF]">
            {/* Header / Navbar */}
            <UserNavbar />

            {/* Main Content Area containing the Hero Section */}
            <main className="grow">
                {/* Hero wrapper with Backdrop background shifted up under the sticky header */}
                <div 
                    className="w-full relative bg-[#FCFAFF] -mt-16"
                    style={{
                        backgroundImage: `linear-gradient(to bottom, rgba(252, 250, 255, 0) 70%, #FCFAFF 100%), url('${isMobile ? '/MobileBackdrop.webp' : '/Backdrop.webp'}')`,
                        backgroundSize: isMobile ? '100% 100%, 100% 100%' : 'cover, cover',
                        backgroundPosition: isMobile ? 'top center, top center' : 'center, 80% center',
                        backgroundRepeat: 'no-repeat, no-repeat'
                    }}
                >
                    {/* Hero Section */}
                    <section id="hero-section" className="relative min-h-[75vh] flex items-center justify-start pt-24 pb-16 md:pb-24 overflow-hidden w-full">
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
                                    One <span className="bg-clip-text text-transparent bg-linear-to-r from-[#4F46E5] to-[#7C3AED]">Dashboard</span><br />
                                    Endless Opportunities.
                                </motion.h1>

                                {/* Subtitle */}
                                <motion.p 
                                    variants={fadeUpVariants}
                                    className="text-[15px] md:text-[17px] leading-[1.7] text-[#5B6475] max-w-[600px] font-normal"
                                >
                                    Stop opening endless tabs to find one opportunity. JobShortCut collects verified openings from multiple career websites and brings them together in one place.
                                </motion.p>

                                {/* Primary Actions */}
                                <motion.div 
                                    variants={fadeUpVariants}
                                    className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4"
                                >
                                    <motion.button
                                        onClick={() => navigate('/jobs')}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full sm:w-auto bg-[#5B3DF5] text-white h-14 px-8 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg hover:bg-[#4a2ee0] transition-all cursor-pointer"
                                    >
                                        <span>Find Jobs Smarter</span>
                                        <ArrowRight className="h-4.5 w-4.5" />
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full sm:w-auto flex items-center justify-center gap-3 text-[#5B6475] hover:text-[#5B3DF5] text-[15px] font-bold h-14 px-6 rounded-xl hover:bg-[#5B3DF5]/5 transition-colors cursor-pointer"
                                    >
                                        <span className="w-8 h-8 rounded-full border-2 border-[#5B6475]/30 flex items-center justify-center shrink-0">
                                            <Play className="h-3.5 w-3.5 fill-current text-current" />
                                        </span>
                                        <a href="#works" >See How It Works</a>
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

            {/* Section 1: How JobShortCut Works */}
            <section id="works" className="py-24 max-w-[1280px] mx-auto px-6 md:px-10 text-center">
                <div className="space-y-2 mb-20">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight">
                        How <span className="text-[#5B3DF5]">JobShortCut</span> Works
                    </h2>
                    {/* Centered Separator Line and Bullet */}
                    <div className="flex items-center justify-center gap-1 text-[#5B3DF5] mt-3">
                        <div className="h-[2px] w-6 bg-[#5B3DF5]/30"></div>
                        <div className="h-2 w-2 rounded-full bg-[#5B3DF5] flex items-center justify-center">
                            <div className="h-1 w-1 rounded-full bg-white"></div>
                        </div>
                        <div className="h-[2px] w-6 bg-[#5B3DF5]/30"></div>
                    </div>
                    <p className="text-[#5B6475] text-[15px] md:text-[16px] font-medium pt-2">
                        See how we simplify your job search in just a few simple steps.
                    </p>
                </div>

                {/* 6-Step Flow */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-y-16 gap-x-8 max-w-[1200px] mx-auto">
                    {[
                        {
                            title: "10+ Trusted Career Websites",
                            desc: "We search top career websites every day.",
                            customIcon: (
                                <div className="relative w-16 h-16 rounded-full bg-white flex items-center justify-center">
                                    {/* Mini logos cluster */}
                                    <div className="absolute top-1 left-2.5 w-4 h-4 rounded bg-[#0A66C2] flex items-center justify-center text-white text-[8px] font-black tracking-tighter">in</div>
                                    <div className="absolute top-1 right-2.5 w-4 h-4 rounded bg-[#FF7A00] flex items-center justify-center text-white text-[7px] font-bold">DJ</div>
                                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded bg-[#E51C23] flex items-center justify-center text-white text-[8px] font-black">N</div>
                                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-6 h-3 rounded-full bg-[#0052FF] flex items-center justify-center text-white text-[5px] font-black leading-none">up</div>
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded bg-[#00C26D] flex items-center justify-center text-white text-[9px] font-bold leading-none">匚</div>
                                </div>
                            )
                        },
                        {
                            title: "We Search",
                            desc: "We find relevant job openings that match your needs.",
                            icon: Search
                        },
                        {
                            title: "We Verify",
                            desc: "We check and verify the job and apply link to ensure authenticity.",
                            icon: ShieldCheck
                        },
                        {
                            title: "We Organize",
                            desc: "We organize everything neatly in one simple dashboard.",
                            icon: Folder
                        },
                        {
                            title: "One Simple Dashboard",
                            desc: "You get all opportunities in one place. No more tab switching.",
                            icon: Monitor
                        },
                        {
                            title: "You Apply Directly",
                            desc: "Apply directly on official career pages with verified links.",
                            customIcon: (
                                <div className="relative">
                                    <Briefcase className="h-10 w-10 text-[#5B3DF5]" />
                                    <div className="absolute -bottom-1 -right-1 bg-[#5B3DF5] text-white rounded-full p-0.5 border border-white">
                                        <Check className="h-2 w-2" strokeWidth={3} />
                                    </div>
                                </div>
                            )
                        }
                    ].map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center group relative">
                            {/* Dotted Purple Border Circle Wrapper */}
                            <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-[#5B3DF5]/30 flex items-center justify-center transition-colors duration-300 group-hover:border-[#5B3DF5]/60">
                                {/* Number Badge */}
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#5B3DF5] text-white text-[11px] font-bold flex items-center justify-center shadow-md z-10">
                                    {idx + 1}
                                </div>

                                {/* Inner White Circle Bubble Container */}
                                <div className="w-22 h-22 rounded-full border border-gray-150 bg-white shadow-sm flex items-center justify-center transition-all duration-300 group-hover:border-[#7B61FF]/40 group-hover:shadow-md">
                                    {/* Render Icon */}
                                    {step.customIcon ? (
                                        step.customIcon
                                    ) : (
                                        step.icon && <step.icon className="h-9 w-9 text-[#5B3DF5]" />
                                    )}
                                </div>

                                {/* Connecting dashed arrow on desktop (hidden on last step) */}
                                {idx < 5 && (
                                    <div className="hidden lg:block absolute top-1/2 left-[calc(100%+12px)] -translate-y-1/2 w-16 z-20 text-gray-300">
                                        <svg className="w-full h-4 text-gray-300" fill="none" viewBox="0 0 64 16" stroke="currentColor">
                                            <path strokeDasharray="3 3" strokeWidth="2" strokeLinecap="round" d="M2 8h56" />
                                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m50 4 4 4-4 4" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Texts */}
                            <div className="mt-6 space-y-2 max-w-[160px]">
                                <h3 className="font-bold text-[#111827] text-[15px] leading-snug">
                                    {step.title}
                                </h3>
                                <p className="text-[12px] text-[#5B6475] font-medium leading-relaxed">
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section 2: What Makes Us Different */}
            <section className="py-24 bg-[#FCFAFF] relative overflow-hidden">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
                            What Makes Us Different
                        </h2>
                        <p className="text-[#5B6475] text-[15px] md:text-[17px] max-w-xl mx-auto font-normal leading-relaxed">
                            Why job seekers choose JobShortCut over typical noisy job boards.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {[
                            {
                                title: "10+ Trusted Sources",
                                desc: "Fresh opportunities collected from trusted career websites.",
                                icon: Globe
                            },
                            {
                                title: "Verified Apply Links",
                                desc: "Every Apply button redirects to the official company career page.",
                                icon: ShieldCheck
                            },
                            {
                                title: "Daily Fresh Jobs",
                                desc: "New opportunities are added every day.",
                                icon: Sparkles
                            },
                            {
                                title: "0 Ads",
                                desc: "No advertisements. No distractions. Only opportunities.",
                                icon: CheckCircle
                            },
                            {
                                title: "100% Free",
                                desc: "No subscriptions. No hidden charges. Always free.",
                                icon: Award
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white/60 backdrop-blur-md p-6 rounded-2xl border border-white/80 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col items-start gap-4 text-left">
                                <div className="p-2.5 bg-[#5B3DF5]/10 rounded-xl text-[#5B3DF5]">
                                    <feature.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#111827] text-[15px] mb-1.5">{feature.title}</h4>
                                    <p className="text-[12px] text-[#5B6475] leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3, 4, 6: Story, Mission & Vision */}
            <section id="about" className="py-24 max-w-[1280px] mx-auto px-6 md:px-10 space-y-16">
                {/* Story Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    <div className="lg:col-span-4 flex justify-center lg:justify-start">
                        <div className="relative w-44 h-44 rounded-full bg-[#5B3DF5]/5 border border-[#EBE3FF] flex items-center justify-center shadow-inner group">
                            <div className="absolute inset-0 rounded-full bg-[#5B3DF5]/5 scale-110 blur-xl opacity-30 animate-pulse"></div>
                            <Heart className="h-20 w-20 text-[#5B3DF5] fill-[#5B3DF5]/10 group-hover:scale-110 group-hover:fill-[#5B3DF5]/20 transition-all duration-300 cursor-default" />
                        </div>
                    </div>
                    <div className="lg:col-span-8 space-y-6 text-left">
                        <h2 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
                            Why We Built <span className='text-[#5B3DF5]'>JobShortCut</span>
                        </h2>
                        <p className="text-[#5B6475] text-[15px] md:text-[17px] leading-[1.8] font-normal">
                            We experienced the same frustration every job seeker faces—opening multiple career websites, searching for the right opportunity, and wasting valuable time before even applying.
                        </p>
                        <p className="text-[16px] md:text-[18px] font-bold text-[#5B3DF5] leading-[1.8]">
                            That's why we built JobShortCut.
                        </p>
                        <p className="text-[#5B6475] text-[15px] md:text-[17px] leading-[1.8] font-normal">
                            We search across trusted career websites, verify every opportunity, and organize everything into one simple dashboard so you can spend less time searching and more time applying.
                        </p>
                    </div>
                </div>

                {/* Mission and Vision Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                    {/* Mission */}
                    <div className="bg-white border border-[#EBE3FF] p-8 rounded-3xl flex items-start gap-5 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="p-3.5 bg-[#5B3DF5]/10 rounded-2xl text-[#5B3DF5] shrink-0">
                            <Target className="h-7 w-7" />
                        </div>
                        <div className="space-y-2.5 text-left">
                            <h3 className="text-[18px] font-black text-[#111827] uppercase tracking-wide">
                                Our Mission
                            </h3>
                            <p className="text-[14px] text-[#5B6475] leading-relaxed">
                                To help students and professionals spend less time searching and more time applying by making job discovery simple, fast, and trustworthy.
                            </p>
                        </div>
                    </div>

                    {/* Vision */}
                    <div className="bg-white border border-[#EBE3FF] p-8 rounded-3xl flex items-start gap-5 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="p-3.5 bg-[#5B3DF5]/10 rounded-2xl text-[#5B3DF5] shrink-0">
                            <Eye className="h-7 w-7" />
                        </div>
                        <div className="space-y-2.5 text-left">
                            <h3 className="text-[18px] font-black text-[#111827] uppercase tracking-wide">
                                Our Vision
                            </h3>
                            <p className="text-[14px] text-[#5B6475] leading-relaxed">
                                To become the most trusted platform for discovering verified career opportunities across the web.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: Our Values */}
            <section className="py-24 bg-[#FCFAFF]">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10">
                    <div className="text-center space-y-4 mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
                            Our Values
                        </h2>
                        <p className="text-[#5B6475] text-[15px] md:text-[17px] max-w-xl mx-auto font-normal leading-relaxed">
                            The core principles that guide everything we build.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Transparency",
                                desc: "Every apply link leads directly to the official company career page.",
                                icon: Smile
                            },
                            {
                                title: "Simplicity",
                                desc: "One dashboard. Zero clutter. Everything you need.",
                                icon: Sparkles
                            },
                            {
                                title: "Trust",
                                desc: "Only verified opportunities from trusted career websites.",
                                icon: ShieldCheck
                            }
                        ].map((value, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 text-left flex flex-col gap-5">
                                <div className="p-3 bg-[#5B3DF5]/10 rounded-2xl text-[#5B3DF5] self-start">
                                    <value.icon className="h-6 w-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="font-bold text-[#111827] text-[18px]">{value.title}</h3>
                                    <p className="text-[14px] text-[#5B6475] leading-relaxed">{value.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 7: Built by People Who Care */}
            <section className="py-24 max-w-[1280px] mx-auto px-6 md:px-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Left column illustration */}
                    <div className="lg:col-span-5 flex justify-center">
                        <div className="relative w-full max-w-[400px]">
                            <div className="absolute inset-0 bg-linear-to-tr from-[#5B3DF5]/10 to-[#8F75FF]/10 rounded-3xl blur-2xl transform -rotate-6"></div>
                            <img 
                                src="/aboutus.webp" 
                                alt="Modern Developers Working Together" 
                                className="relative w-full h-auto object-contain rounded-3xl shadow-lg border border-[#EBE3FF]"
                            />
                        </div>
                    </div>

                    {/* Right column copy */}
                    <div className="lg:col-span-7 text-left space-y-6">
                        <div className="inline-flex items-center gap-2">
                            <img src="/jobshortcut_logo.svg" alt="Job Shortcut Logo" className="h-6 w-auto object-contain opacity-80" />
                            <span className="text-[12px] font-bold tracking-widest text-[#5B3DF5] uppercase">JobShortCut Creators</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#111827] tracking-tight leading-[1.1]">
                            Built by People Who Care
                        </h2>
                        <p className="text-[#5B6475] text-[15px] md:text-[17px] leading-[1.8] font-normal">
                            JobShortCut is built by people who understand how frustrating job searching can be.
                        </p>
                        <p className="text-[18px] md:text-[20px] font-black text-[#111827] leading-tight">
                            Our goal is simple:
                        </p>
                        <div className="border-l-4 border-[#5B3DF5] pl-5 py-2">
                            <p className="text-[16px] md:text-[18px] font-bold text-[#5B3DF5] leading-relaxed">
                                Make job searching easier, faster, and completely distraction-free for every student and job seeker.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>

            {/* Footer */}
            <UserFooter />
        </div>
    )
}

export default UserHome
