import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Briefcase,
    ArrowRight,
    Menu,
    X,
    Home,
    Settings,
    Users
} from 'lucide-react'

function UserNavbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [activeSection, setActiveSection] = useState<string>('')
    const location = useLocation()
    const navigate = useNavigate()

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

    useEffect(() => {
        if (location.pathname !== '/') {
            setActiveSection('')
            return
        }

        const sections = ['works', 'about']
        const observers = sections.map(id => {
            const el = document.getElementById(id)
            if (!el) return null

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveSection(id)
                    }
                },
                {
                    threshold: 0.2,
                    rootMargin: '-20% 0px -60% 0px'
                }
            )
            observer.observe(el)
            return { el, observer }
        })

        const heroEl = document.getElementById('hero-section')
        let heroObserver: IntersectionObserver | null = null
        if (heroEl) {
            heroObserver = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActiveSection('')
                    }
                },
                { threshold: 0.1, rootMargin: '0px' }
            )
            heroObserver.observe(heroEl)
        }

        const handleScroll = () => {
            if (window.scrollY < 80) {
                setActiveSection('')
            }
        }
        window.addEventListener('scroll', handleScroll)

        return () => {
            observers.forEach(obs => {
                if (obs) obs.observer.unobserve(obs.el)
            })
            if (heroObserver && heroEl) {
                heroObserver.unobserve(heroEl)
            }
            window.removeEventListener('scroll', handleScroll)
        }
    }, [location.pathname])

    const isActive = (path: string) => location.pathname === path

    const getDesktopClass = (path: string) => {
        if (path === '/') {
            return (isActive('/') && activeSection === '')
                ? "text-[#5B3DF5] font-bold"
                : "text-[#5B6475] hover:text-[#5B3DF5] transition-colors"
        }
        return isActive(path)
            ? "text-[#5B3DF5] font-bold"
            : "text-[#5B6475] hover:text-[#5B3DF5] transition-colors"
    }

    const getSectionDesktopClass = (sectionId: string) => {
        return (isActive('/') && activeSection === sectionId)
            ? "text-[#5B3DF5] font-bold cursor-pointer"
            : "text-[#5B6475] hover:text-[#5B3DF5] transition-colors cursor-pointer"
    }

    const getMobileClass = (path: string) => {
        const active = path === '/' ? (isActive('/') && activeSection === '') : isActive(path)
        return `flex items-center gap-4 w-full p-3 rounded-2xl transition-all ${
            active
                ? 'bg-[#5B3DF5]/5 text-[#5B3DF5]'
                : 'text-[#111827] hover:bg-[#5B3DF5]/5 active:bg-[#5B3DF5]/10'
        }`
    }

    const getSectionMobileClass = (sectionId: string) => {
        const active = isActive('/') && activeSection === sectionId
        return `flex items-center gap-4 w-full p-3 rounded-2xl transition-all ${
            active
                ? 'bg-[#5B3DF5]/5 text-[#5B3DF5]'
                : 'text-[#111827] hover:bg-[#5B3DF5]/5 active:bg-[#5B3DF5]/10'
        }`
    }

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
        if (location.pathname === '/') {
            e.preventDefault()
            const el = document.getElementById(sectionId)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            e.preventDefault()
            navigate(`/#${sectionId}`)
        }
        setMobileMenuOpen(false)
    }

    const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (location.pathname === '/') {
            e.preventDefault()
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        setMobileMenuOpen(false)
    }

    return (
        <header className="sticky top-0 w-full z-50 bg-transparent border-transparent backdrop-blur-md">
            <div className="w-full h-16 flex items-center justify-between px-6 md:px-10 max-w-[1280px] mx-auto relative">
                {/* Brand */}
                <Link to="/" onClick={handleHomeClick} className="flex items-center gap-3 text-xl font-black text-[#111827]">
                    <img src="/jobshortcut_logo.svg" alt="Job Shortcut Logo" className="h-8 w-auto object-contain" />
                    <span>Job <span className="text-[#5B3DF5]">Shortcut</span></span>
                </Link>

                {/* Center Links (Linear style) */}
                <nav className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#5B6475]">
                    <Link to="/" onClick={handleHomeClick} className={getDesktopClass('/')}>Home</Link>
                    <Link to="/jobs" className={getDesktopClass('/jobs')}>Job Opportunities</Link>
                    <a href="#works" onClick={(e) => handleNavClick(e, 'works')} className={getSectionDesktopClass('works')}>How it works</a>
                    <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className={getSectionDesktopClass('about')}>About us</a>
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

            {/* Mobile Dropdown Menu Drawer (Full screen overlay) */}
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
                            <Link 
                                to="/" 
                                onClick={handleHomeClick} 
                                className="flex items-center gap-3 text-xl font-black text-[#111827]"
                            >
                                <img src="/jobshortcut_logo.svg" alt="Job Shortcut Logo" className="h-8 w-auto object-contain" />
                                <span>Job <span className="text-[#5B3DF5]">Shortcut</span></span>
                            </Link>
                            <button 
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 rounded-xl text-[#5B6475] hover:text-[#5B3DF5] hover:bg-[#5B3DF5]/5 transition-all cursor-pointer"
                                aria-label="Close Mobile Menu"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Menu Options (Vertical list) */}
                        <div className="flex flex-col w-full mt-6 gap-2">
                            {/* Option 1: Home */}
                            <Link 
                                to="/" 
                                onClick={handleHomeClick}
                                className={getMobileClass('/')}
                            >
                                <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                    <Home className="h-5 w-5" />
                                </div>
                                <span className="text-[16px] font-bold">Home</span>
                            </Link>

                            <div className="h-[1px] w-[95%] bg-[#EBE3FF] opacity-50 mx-auto"></div>

                            {/* Option 2: Job Opportunities */}
                            <Link 
                                to="/jobs" 
                                onClick={() => setMobileMenuOpen(false)}
                                className={getMobileClass('/jobs')}
                            >
                                <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                    <Search className="h-5 w-5" />
                                </div>
                                <span className="text-[16px] font-bold">Job Opportunities</span>
                            </Link>

                            <div className="h-[1px] w-[95%] bg-[#EBE3FF] opacity-50 mx-auto my-1"></div>

                            {/* Option 3: How it works */}
                            <a 
                                href="#works" 
                                onClick={(e) => handleNavClick(e, 'works')}
                                className={getSectionMobileClass('works')}
                            >
                                <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <span className="text-[16px] font-bold">How It Works</span>
                            </a>

                            <div className="h-[1px] w-[95%] bg-[#EBE3FF] opacity-50 mx-auto my-1"></div>

                            {/* Option 4: About us */}
                            <a 
                                href="#about" 
                                onClick={(e) => handleNavClick(e, 'about')}
                                className={getSectionMobileClass('about')}
                            >
                                <div className="p-2.5 rounded-xl bg-[#5B3DF5]/10 text-[#5B3DF5]">
                                    <Users className="h-5 w-5" />
                                </div>
                                <span className="text-[16px] font-bold">About Us</span>
                            </a>
                        </div>

                        {/* CTA Action button at bottom */}
                        <div className="w-full mt-auto mb-6 pt-6">
                            <button 
                                onClick={() => {
                                    setMobileMenuOpen(false)
                                    navigate('/jobs')
                                }}
                                className="w-full bg-[#5B3DF5] text-white py-4 px-6 rounded-2xl flex items-center justify-between font-bold text-[16px] shadow-lg shadow-[#5B3DF5]/30 hover:bg-[#492EE0] active:scale-[0.98] transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <Briefcase className="h-5 w-5" />
                                    <span>Find Jobs Smarter</span>
                                </div>
                                <ArrowRight className="h-5 w-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}

export default UserNavbar
