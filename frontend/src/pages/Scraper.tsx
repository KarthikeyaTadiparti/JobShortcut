import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useDispatch, useSelector } from 'react-redux'
import { type RootState } from '@/redux/reducers'
import { clearUser } from '@/redux/reducers/auth-reducer'
import { logoutUser, createJob, startScraperStream } from '@/api'
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
    Terminal,
    Sun,
    Moon
} from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'


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

function Scraper() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { userData, isAuthenticated } = useSelector((state: RootState) => state.auth)

    // Global theme context
    const { setTheme, resolvedTheme } = useTheme()

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }

    // Form and Scraper State
    const [urlInput, setUrlInput] = useState('')
    const [currentlyScraping, setCurrentlyScraping] = useState('')
    const [scrapedCount, setScrapedCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [results, setResults] = useState<Record<string, ScrapedJob | null>>({})
    const [logs, setLogs] = useState<ScrapeLog[]>([])
    const [error, setError] = useState<string | null>(null)

    // Approve / Reject States
    const [approvedUrls, setApprovedUrls] = useState<string[]>([])
    const [rejectedUrls, setRejectedUrls] = useState<string[]>([])

    // Track selected apply link for each scraped card (keyed by card url)
    const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>({})

    // Dialog modal state
    const [showDialog, setShowDialog] = useState(false)
    const [dialogMessage, setDialogMessage] = useState('')

    const approveMutation = useMutation({
        mutationFn: async ({ jobData, selectedLink }: { url: string; jobData: ScrapedJob; selectedLink: string }) => {
            return createJob({
                company: jobData.company,
                jobRole: jobData.jobRole,
                experience: jobData.experience,
                location: jobData.location,
                applyLink: selectedLink,
            });
        },
        onSuccess: (_data, variables) => {
            setApprovedUrls((prev) => [...prev, variables.url]);
            setRejectedUrls((prev) => prev.filter((u) => u !== variables.url));
            toast.success("Job added successfully!");
        },
        onError: (err: any, variables) => {
            if (err && err.status === 409) {
                setDialogMessage(`This job link already exists in the database:\n${variables.selectedLink}`);
                setShowDialog(true);
                toast.error("This job link already exists in the database.");
                return;
            }
            console.error("Failed to approve job:", err);
            toast.error(err.message || "Failed to approve job.");
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (url: string) => {
            // Simulate premium loader duration
            await new Promise((resolve) => setTimeout(resolve, 300));
            return url;
        },
        onSuccess: (url) => {
            const isCurrentlyRejected = rejectedUrls.includes(url);
            setRejectedUrls((prev) =>
                prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
            )
            setApprovedUrls((prev) => prev.filter((u) => u !== url))

            if (!isCurrentlyRejected) {
                toast.success("Job marked as rejected.");
            } else {
                toast.info("Rejection undone.");
            }
        },
        onError: () => {
            toast.error("Failed to reject job.");
        }
    });

    const handleApprove = (url: string, jobData: ScrapedJob) => {
        const selectedLink = selectedLinks[url] || (jobData.applyLinks && jobData.applyLinks[0]) || "";

        if (!selectedLink) {
            toast.error("No apply link selected or available for this job.");
            return;
        }

        approveMutation.mutate({ url, jobData, selectedLink });
    }

    const handleReject = (url: string) => {
        rejectMutation.mutate(url);
    }



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

    const scrapeMutation = useMutation({
        mutationFn: async (urls: string) => {
            setError(null)
            setCurrentlyScraping('')
            setScrapedCount(0)
            setResults({})
            setLogs([])

            await startScraperStream(urls, {
                onStatus: (url, message) => {
                    setCurrentlyScraping(url);
                    setLogs((prev) => {
                        const exists = prev.some((l) => l.url === url);
                        if (exists) {
                            return prev.map((l) =>
                                l.url === url
                                    ? { ...l, status: 'scraping', message }
                                    : l
                            );
                        }
                        return [...prev, { url, status: 'scraping', message }];
                    });
                },
                onProgress: (url, result) => {
                    setScrapedCount((prev) => prev + 1);
                    setResults((prev) => ({
                        ...prev,
                        [url]: result
                    }));
                    setLogs((prev) =>
                        prev.map((l) =>
                            l.url === url
                                ? { ...l, status: result ? 'success' : 'failed' }
                                : l
                        )
                    );
                },
                onDone: (results) => {
                    setResults(results);
                    setCurrentlyScraping('');
                }
            });
        },
        onError: (err: any) => {
            console.error('Scraping error:', err);
            setError(err.message || 'An unexpected error occurred during scraping.');
            toast.error(err.message || 'Failed to complete scraping.');
        },
        onSettled: () => {
            setCurrentlyScraping('');
        }
    });

    const handleStartScrape = () => {
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

        setTotalCount(urlsArray.length)
        scrapeMutation.mutate(urlInput)
    }


    const progressPercentage = totalCount > 0 ? Math.round((scrapedCount / totalCount) * 100) : 0

    return (
        <div className="min-h-screen bg-background text-foreground font-sans pb-16 transition-colors duration-200">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-indigo-600/10 p-2 text-indigo-400 border border-indigo-500/20">
                                <Terminal className="h-6 w-6" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                                Job Shortcut
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={toggleTheme}
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-lg border border-border text-foreground hover:bg-secondary cursor-pointer transition-all"
                                aria-label="Toggle Theme"
                            >
                                {resolvedTheme === 'dark' ? (
                                    <Sun className="h-4 w-4 text-yellow-500" />
                                ) : (
                                    <Moon className="h-4 w-4 text-indigo-600" />
                                )}
                            </Button>
                            <div className="hidden md:flex flex-col text-right">
                                <span className="text-sm font-semibold text-foreground">{userData.name || 'Admin'}</span>
                                <span className="text-xs text-muted-foreground">{userData.email}</span>
                            </div>
                            <Button
                                onClick={() => logoutMutation.mutate()}
                                disabled={logoutMutation.isPending}
                                variant="destructive"
                                className="cursor-pointer font-medium transition-all gap-2"
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
                        <div className="rounded-2xl border border-border bg-card/30 p-6 shadow-xl backdrop-blur-sm">
                            <h2 className="text-lg font-bold text-foreground mb-2">Scrape Jobs</h2>
                            <p className="text-xs text-muted-foreground mb-4">
                                Enter job URLs from supported sites separated by commas.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="urls" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        Job URLs
                                    </label>
                                    <textarea
                                        id="urls"
                                        rows={6}
                                        value={urlInput}
                                        onChange={(e) => setUrlInput(e.target.value)}
                                        disabled={scrapeMutation.isPending}
                                        placeholder="https://placement-officer.com/job-post, https://dailypharmajobs.in/pharma-job"
                                        className="w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground placeholder-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors resize-y font-mono"
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
                                    disabled={scrapeMutation.isPending || !urlInput.trim()}
                                    className="w-full cursor-pointer bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-950/40 text-white font-medium transition-all gap-2 py-6 rounded-xl text-base"
                                >
                                    {scrapeMutation.isPending ? (
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
                            <div className="mt-8 border-t border-border pt-6">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Supported Domains</h3>
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
                                            className="rounded-full bg-secondary border border-border px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                                        >
                                            {domain}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Progress */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* Progress and Live Loader Block */}
                        <div className="rounded-2xl border border-border bg-card/30 p-6 shadow-xl backdrop-blur-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold text-foreground">Scraping Progress</h3>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {scrapedCount} / {totalCount} Completed
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>

                            

                            {/* Live Activity Logs */}
                            <div className="border-t border-border pt-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Live Scrape Feed</h4>
                                <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl bg-background p-3 border border-border font-mono text-[11px] scrollbar-thin">
                                    {logs.map((log, index) => (
                                        <div key={index} className="flex items-start justify-between gap-4 py-0.5">
                                            <span className="text-muted-foreground truncate">{log.url}</span>
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
                                        <p className="text-muted-foreground/60 text-center py-2">Waiting to start...</p>
                                    )}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Section: Scraped Results */}
                <div className="mt-12 space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <h2 className="text-xl font-bold text-foreground">Scraped Results</h2>
                        <span className="rounded-full bg-secondary border border-border px-3 py-1 text-xs text-secondary-foreground font-semibold">
                            {Object.keys(results).length} URLs
                        </span>
                    </div>

                    {/* Job Details Cards Grid */}
                    {Object.keys(results).length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(results).map(([url, jobData]) => {
                                if (jobData === null) {
                                    return (
                                        <div key={url} className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-md flex items-start gap-4 h-full">
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
                                                        className="text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1 shrink-0"
                                                    >
                                                        Source <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                </div>
                                                <p className="mt-2 text-xs font-mono text-muted-foreground truncate">{url}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    Unable to scrape. The link is either invalid, currently inaccessible, or belongs to an unsupported domain.
                                                </p>
                                            </div>
                                        </div>
                                    )
                                }

                                const isApproved = approvedUrls.includes(url)
                                const isRejected = rejectedUrls.includes(url)
                                const isApprovePending = approveMutation.isPending && approveMutation.variables?.url === url
                                const isRejectPending = rejectMutation.isPending && rejectMutation.variables === url
                                const isCardPending = isApprovePending || isRejectPending

                                return (
                                    <div
                                        key={url}
                                        className={`rounded-xl border p-6 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4 h-full ${isApproved
                                                ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                                                : isRejected
                                                    ? "border-red-500/20 bg-red-500/5 dark:bg-red-950/10 opacity-60"
                                                    : "border-border bg-card/40 hover:border-border/80"
                                            }`}
                                    >
                                        <div className="space-y-4">
                                            {/* Card Top */}
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
                                                <div className="min-w-0">
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isApproved
                                                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                            : isRejected
                                                                ? "bg-red-500/20 text-red-600 dark:text-red-400"
                                                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                        }`}>
                                                        {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Scraped'}
                                                    </span>
                                                    <h3 className="text-base font-bold text-foreground mt-2 truncate" title={jobData.jobRole || 'Unknown Role'}>
                                                        {jobData.jobRole || 'Unknown Role'}
                                                    </h3>
                                                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1 truncate" title={jobData.company || 'Unknown Company'}>
                                                        {jobData.company || 'Unknown Company'}
                                                    </p>
                                                </div>
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium text-xs flex items-center gap-1.5 self-start shrink-0"
                                                >
                                                    Source <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-1 gap-2.5 text-xs">
                                                <div className="flex items-center gap-2.5 text-foreground/80">
                                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="truncate">{jobData.location || 'Not Specified'}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 text-foreground/80">
                                                    <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="truncate">{jobData.experience || 'Not Specified'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Apply Links Section */}
                                        <div className="border-t border-border pt-4 mt-auto">
                                            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between gap-1">
                                                <span className="flex items-center gap-1">
                                                    <Globe className="h-3 w-3" /> Select Apply Link
                                                </span>
                                                <span className="text-[9px] text-indigo-500 font-bold uppercase">
                                                    (Only 1 approved)
                                                </span>
                                            </h4>
                                            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1.5 scrollbar-thin rounded-lg border border-border bg-background p-1">
                                                {jobData.applyLinks.map((link, idx) => {
                                                    const isSelected = selectedLinks[url]
                                                        ? selectedLinks[url] === link
                                                        : idx === 0;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={() => setSelectedLinks((prev) => ({ ...prev, [url]: link }))}
                                                            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] font-medium max-w-full cursor-pointer transition-colors ${isSelected
                                                                    ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                                                                    : "hover:bg-secondary text-muted-foreground hover:text-foreground border border-transparent"
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-center shrink-0">
                                                                <input
                                                                    type="radio"
                                                                    name={`selected-link-${url}`}
                                                                    checked={isSelected}
                                                                    onChange={() => setSelectedLinks((prev) => ({ ...prev, [url]: link }))}
                                                                    className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
                                                                />
                                                            </div>
                                                            <span className="truncate text-left flex-1" title={link}>{link}</span>
                                                            <a
                                                                href={link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
                                                                title="Open Link in New Tab"
                                                            >
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        </div>
                                                    );
                                                })}
                                                {jobData.applyLinks.length === 0 && (
                                                    <span className="text-xs text-muted-foreground italic p-2 text-center block w-full">
                                                        No apply links extracted from details.
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 border-t border-border pt-4">
                                            <Button
                                                onClick={() => handleApprove(url, jobData)}
                                                variant={isApproved ? "default" : "outline"}
                                                disabled={isCardPending}
                                                className={`flex-1 gap-1.5 text-xs py-1.5 h-8 cursor-pointer transition-all ${isApproved
                                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border-transparent"
                                                        : "border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                                                    }`}
                                            >
                                                {isApprovePending ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                )}
                                                Approve
                                            </Button>
                                            <Button
                                                onClick={() => handleReject(url)}
                                                variant={isRejected ? "default" : "outline"}
                                                disabled={isCardPending}
                                                className={`flex-1 gap-1.5 text-xs py-1.5 h-8 cursor-pointer transition-all ${isRejected
                                                        ? "bg-red-600 hover:bg-red-500 text-white border-transparent"
                                                        : "border-border text-foreground hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30"
                                                    }`}
                                            >
                                                {isRejectPending ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <XCircle className="h-3.5 w-3.5" />
                                                )}
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {Object.keys(results).length === 0 && !scrapeMutation.isPending && (
                        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground space-y-3">
                            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" />
                            <p className="text-sm">No results to show. Input URLs and click Start Scraping to fetch details.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Custom Dialog Warning Modal for duplicates */}
            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500">
                            <XCircle className="h-6 w-6 shrink-0" />
                            <h3 className="text-lg font-bold text-foreground">Duplicate Job Link</h3>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all">
                            {dialogMessage}
                        </p>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={() => {
                                    setShowDialog(false)
                                    setDialogMessage('')
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm"
                            >
                                Dismiss
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    )
}

export default Scraper