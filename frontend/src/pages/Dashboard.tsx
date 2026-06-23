import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useDispatch, useSelector } from 'react-redux'
import { type RootState } from '@/redux/reducers'
import { clearUser } from '@/redux/reducers/auth-reducer'
import { logoutUser } from '@/api'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Navigate } from 'react-router-dom'
import {
    Play,
    Loader2,
    LogOut,
    Globe,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Briefcase,
    MapPin,
    Award,
    FileText,
    Terminal
} from 'lucide-react'

interface ScrapedJob {
    company: string | null;
    jobRole: string | null;
    experience: string | null;
    location: string | null;
    applyLinks: string[];
}

interface ScrapeLog {
    url: string;
    status: 'scraping' | 'success' | 'failed';
    message?: string;
}

function Dashboard() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { userData, isAuthenticated } = useSelector((state: RootState) => state.auth)

    // Form and Scraper State
    const [urlInput, setUrlInput] = useState('')
    const [isScraping, setIsScraping] = useState(false)
    const [currentlyScraping, setCurrentlyScraping] = useState('')
    const [scrapedCount, setScrapedCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [results, setResults] = useState<Record<string, ScrapedJob | null>>({})
    const [logs, setLogs] = useState<ScrapeLog[]>([])
    const [error, setError] = useState<string | null>(null)

    // UI refs
    const logEndRef = useRef<HTMLDivElement>(null)

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    const logoutMutation = useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
            dispatch(clearUser())
            navigate('/login')
        },
    })

    const handleStartScrape = async () => {
        if (!urlInput.trim()) return

        // Parse URLs locally to calculate total count
        const urlsArray = urlInput
            .split(',')
            .map((url) => url.trim())
            .filter(Boolean)

        if (urlsArray.length === 0) {
            setError('Please enter at least one valid URL.')
            return
        }

        // Initialize Scraper State
        setIsScraping(true)
        setError(null)
        setCurrentlyScraping('')
        setScrapedCount(0)
        setTotalCount(urlsArray.length)
        setResults({})
        setLogs([])

        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
            const response = await fetch(`${API_URL}/api/scrapers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls: urlInput }),
                credentials: 'include',
            })

            if (!response.ok) {
                const errText = await response.text()
                let errMsg = `Request failed with status ${response.status}`
                try {
                    const errJson = JSON.parse(errText)
                    errMsg = errJson.message || errMsg
                } catch (_) { }
                throw new Error(errMsg)
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('Response stream is not readable.')
            }

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { value, done } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmedLine = line.trim()
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const eventData = JSON.parse(trimmedLine.slice(6))

                            if (eventData.type === 'status') {
                                setCurrentlyScraping(eventData.url)
                                // Append or update log
                                setLogs((prev) => {
                                    const exists = prev.some((l) => l.url === eventData.url)
                                    if (exists) {
                                        return prev.map((l) =>
                                            l.url === eventData.url
                                                ? { ...l, status: 'scraping', message: eventData.message }
                                                : l
                                        )
                                    }
                                    return [...prev, { url: eventData.url, status: 'scraping', message: eventData.message }]
                                })
                            } else if (eventData.type === 'progress') {
                                setScrapedCount((prev) => prev + 1)
                                setResults((prev) => ({
                                    ...prev,
                                    [eventData.url]: eventData.result
                                }))
                                setLogs((prev) =>
                                    prev.map((l) =>
                                        l.url === eventData.url
                                            ? { ...l, status: eventData.result ? 'success' : 'failed' }
                                            : l
                                    )
                                )
                            } else if (eventData.type === 'done') {
                                setResults(eventData.results)
                                setCurrentlyScraping('')
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE line:', e)
                        }
                    }
                }
            }
        } catch (err: any) {
            console.error('Scraping error:', err)
            setError(err.message || 'An unexpected error occurred during scraping.')
        } finally {
            setIsScraping(false)
            setCurrentlyScraping('')
        }
    }

    const progressPercentage = totalCount > 0 ? Math.round((scrapedCount / totalCount) * 100) : 0

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans pb-16">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-600/10 p-2 text-indigo-400 border border-indigo-500/20">
                                <Terminal className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-zinc-100 bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                                Universal Job Scraper
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex flex-col text-right">
                                <span className="text-sm font-semibold text-zinc-200">{userData.name || 'Admin'}</span>
                                <span className="text-xs text-zinc-500">{userData.email}</span>
                            </div>
                            <Button
                                onClick={() => logoutMutation.mutate()}
                                disabled={logoutMutation.isPending}
                                variant="outline"
                                className="cursor-pointer border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium transition-all gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

                    {/* Left Column: Form Controls */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-6 shadow-xl backdrop-blur-sm">
                            <h2 className="text-lg font-bold text-zinc-100 mb-2">Scrape Jobs</h2>
                            <p className="text-xs text-zinc-400 mb-4">
                                Enter job URLs from supported sites separated by commas.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="urls" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                                        Job URLs
                                    </label>
                                    <textarea
                                        id="urls"
                                        rows={6}
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        disabled={isScraping}
                                        placeholder="https://placement-officer.com/job-post, https://dailypharmajobs.in/pharma-job"
                                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors resize-y font-mono"
                                    />
                                </div>

                                {error && (
                                    <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-400 flex items-start gap-2 animate-in fade-in duration-200">
                                        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button
                                    onClick={handleStartScrape}
                                    disabled={isScraping || !urlInput.trim()}
                                    className="w-full cursor-pointer bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950/40 text-white font-medium transition-all gap-2 py-6 rounded-xl text-base shadow-lg shadow-indigo-600/20"
                                >
                                    {isScraping ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Scraping Links...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-5 w-5" />
                                            Start Scraping
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Supported Job Boards info */}
                            <div className="mt-8 border-t border-zinc-800/80 pt-6">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Supported Domains</h3>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        'jobcode.in',
                                        'placement-officer.com',
                                        'freshersrecruitment.co.in',
                                        'freshersvoice.com',
                                        'freshershunt.in',
                                        'dailypharmajobs.in'
                                    ].map((domain) => (
                                        <span
                                            key={domain}
                                            className="rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:border-zinc-700 transition-colors"
                                        >
                                            {domain}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Progress & Results */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Progress and Live Loader Block */}
                        {(isScraping || totalCount > 0) && (
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 shadow-xl backdrop-blur-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-zinc-200">Scraping Progress</h3>
                                    <span className="text-xs font-mono text-zinc-400">
                                        {scrapedCount} / {totalCount} Completed
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-900">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>

                                {/* Currently Scraping URL & Loader */}
                                {isScraping && currentlyScraping && (
                                    <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4 flex items-center justify-between gap-4 animate-pulse">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin shrink-0" />
                                            <div className="overflow-hidden">
                                                <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                                                    Currently Scraping
                                                </span>
                                                <span className="block text-xs font-mono text-zinc-300 truncate mt-0.5">
                                                    {currentlyScraping}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Live Activity Logs */}
                                <div className="border-t border-zinc-800/80 pt-4">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Live Scrape Feed</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl bg-zinc-950 p-3 border border-zinc-900 font-mono text-[11px] scrollbar-thin">
                                        {logs.map((log, index) => (
                                            <div key={index} className="flex items-start justify-between gap-4 py-0.5">
                                                <span className="text-zinc-400 truncate">{log.url}</span>
                                                {log.status === 'scraping' && (
                                                    <span className="text-yellow-500 font-semibold shrink-0 animate-pulse">Scraping...</span>
                                                )}
                                                {log.status === 'success' && (
                                                    <span className="text-green-500 font-semibold shrink-0 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> SUCCESS
                                                    </span>
                                                )}
                                                {log.status === 'failed' && (
                                                    <span className="text-red-500 font-semibold shrink-0 flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" /> FAILED
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {logs.length === 0 && (
                                            <p className="text-zinc-600 text-center py-2">Waiting to start...</p>
                                        )}
                                        <div ref={logEndRef} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Scraped Results Block */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-zinc-100">Scraped Results</h2>
                                <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                                    {Object.keys(results).length} URLs
                                </span>
                            </div>

                            {/* Job Details Cards */}
                            <div className="space-y-4">
                                {Object.entries(results).map(([url, jobData]) => {
                                    if (jobData === null) {
                                        return (
                                            <div key={url} className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-md flex items-start gap-4">
                                                <div className="rounded-lg bg-red-500/10 p-2 text-red-400 shrink-0">
                                                    <XCircle className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                                                            Failed / Unsupported
                                                        </span>
                                                        <a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs flex items-center gap-1 shrink-0"
                                                        >
                                                            Source <ExternalLink className="h-3.5 w-3.5" />
                                                        </a>
                                                    </div>
                                                    <p className="mt-2 text-xs font-mono text-zinc-400 truncate">{url}</p>
                                                    <p className="mt-1 text-sm text-zinc-400">
                                                        Unable to scrape. The link is either invalid, currently inaccessible, or belongs to an unsupported domain.
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div key={url} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-6 shadow-md hover:border-zinc-700/80 transition-all space-y-4">
                                            {/* Card Top */}
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/80 pb-4">
                                                <div>
                                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                                                        Scraped
                                                    </span>
                                                    <h3 className="text-lg font-bold text-zinc-100 mt-2">
                                                        {jobData.jobRole || 'Unknown Role'}
                                                    </h3>
                                                    <p className="text-sm font-semibold text-indigo-400 mt-1">
                                                        {jobData.company || 'Unknown Company'}
                                                    </p>
                                                </div>
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-400 hover:text-indigo-300 font-medium text-xs flex items-center gap-1.5 self-start"
                                                >
                                                    View Original Link <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                <div className="flex items-center gap-2.5 text-zinc-300">
                                                    <MapPin className="h-4 w-4 text-zinc-500" />
                                                    <span>{jobData.location || 'Not Specified'}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-zinc-300">
                                                    <Award className="h-4 w-4 text-zinc-500" />
                                                    <span>{jobData.experience || 'Not Specified'}</span>
                                                </div>
                                            </div>

                                            {/* Apply Links Section */}
                                            <div className="border-t border-zinc-800/80 pt-4">
                                                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1">
                                                    <Globe className="h-3 w-3" /> Apply Links Found
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {jobData.applyLinks.map((link, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 transition-colors font-medium"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />
                                                            Link {idx + 1}
                                                        </a>
                                                    ))}
                                                    {jobData.applyLinks.length === 0 && (
                                                        <span className="text-xs text-zinc-500 italic">
                                                            No apply links extracted from details.
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {Object.keys(results).length === 0 && !isScraping && (
                                    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-500 space-y-3">
                                        <Briefcase className="mx-auto h-10 w-10 text-zinc-700" />
                                        <p className="text-sm">No results to show. Input URLs and click Start Scraping to fetch details.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}

export default Dashboard