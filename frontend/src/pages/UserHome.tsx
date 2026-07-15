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

                                {/* Social Channel Links */}
                                <motion.div 
                                    variants={containerVariants}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-10"
                                >
                                    <motion.a 
                                        href="https://whatsapp.com/channel/0029Vb8k9oJ29755UuXJSc3U"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variants={fadeUpVariants}
                                        whileHover={{ y: -3 }}
                                        className="bg-white p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 shadow-md flex items-center gap-3.5 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="p-2.5 bg-[#25D366]/10 rounded-xl text-[#25D366] shrink-0">
                                            <svg className="h-5.5 w-5.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                        </div>
                                        <div className="text-left leading-tight">
                                            <h4 className="font-bold text-[#111827] text-sm">Join WhatsApp</h4>
                                            <p className="text-[11px] text-[#5B6475] mt-0.5">Daily Job Opportunity Alerts</p>
                                        </div>
                                    </motion.a>

                                    <motion.a 
                                        href="https://instagram.com/job_shortcut"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variants={fadeUpVariants}
                                        whileHover={{ y: -3 }}
                                        className="bg-white p-4 rounded-2xl border border-pink-500/20 hover:border-pink-500/40 shadow-md flex items-center gap-3.5 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                    >
                                        <div className="p-2.5 bg-radial from-[#FFB900] via-[#FF0078] to-[#9B00E8] bg-[#E1306C]/10 rounded-xl text-[#E1306C] shrink-0">
                                            <svg className="h-5.5 w-5.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                            </svg>
                                        </div>
                                        <div className="text-left leading-tight">
                                            <h4 className="font-bold text-[#111827] text-sm">Follow Instagram</h4>
                                            <p className="text-[11px] text-[#5B6475] mt-0.5">@job_shortcut Updates</p>
                                        </div>
                                    </motion.a>
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
