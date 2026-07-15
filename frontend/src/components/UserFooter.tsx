import { Share2, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

function UserFooter() {
    const handleSharePage = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success("Page link copied to clipboard!")
    }

    return (
        <footer className="bg-white border-t border-gray-100 mt-auto transition-colors duration-300">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex flex-col items-center md:items-start gap-2">
                    <Link to="/" className="text-lg font-bold text-[#111827]">
                        Job <span className="text-[#5B3DF5]">Shortcut</span>
                    </Link>
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
                    <a
                        href="https://whatsapp.com/channel/0029Vb8k9oJ29755UuXJSc3U"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-[#FCFAFF] flex items-center justify-center text-[#5B6475] hover:text-[#25D366] transition-all border border-[#EBE3FF] hover:border-emerald-500/30 cursor-pointer active:scale-95"
                        title="Join WhatsApp Channel"
                    >
                        <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                    </a>
                    <a
                        href="https://instagram.com/job_shortcut"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-[#FCFAFF] flex items-center justify-center text-[#5B6475] hover:text-[#E1306C] transition-all border border-[#EBE3FF] hover:border-pink-500/30 cursor-pointer active:scale-95"
                        title="Follow Instagram"
                    >
                        <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                    </a>
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
    )
}

export default UserFooter
