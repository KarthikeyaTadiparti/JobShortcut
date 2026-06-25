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
