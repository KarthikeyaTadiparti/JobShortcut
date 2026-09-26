import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import {
  Loader2,
  CheckCircle2,
  QrCode,
  Radio,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import {
  startWhatsAppScraperStream,
  type ExtractionScope,
  type WhatsAppImportResult,
} from '@/api/scraper';
import { toast } from 'sonner';

interface WhatsAppImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (urls: string[]) => void;
}

interface LogEntry {
  type: 'status' | 'group' | 'complete' | 'error';
  message: string;
  time: string;
}

export default function WhatsAppImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: WhatsAppImportModalProps) {
  const [scope, setScope] = useState<ExtractionScope>('unread');
  const [isRunning, setIsRunning] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finalResult, setFinalResult] = useState<WhatsAppImportResult | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  if (!isOpen) return null;

  const resetState = () => {
    setIsRunning(false);
    setQrCodeUrl(null);
    setCurrentProgress('');
    setLogs([]);
    setFinalResult(null);
  };

  const handleStopWorkflow = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setCurrentProgress('');
    addLog('error', 'WhatsApp extraction stopped by user.');
    toast.info('WhatsApp extraction stopped.');
  };

  const handleClose = () => {
    if (isRunning) {
      handleStopWorkflow();
    }
    resetState();
    onClose();
  };

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        type,
        message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
  };

  const handleStartImport = async () => {
    setIsRunning(true);
    setQrCodeUrl(null);
    setLogs([]);
    setFinalResult(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    addLog('status', `Starting WhatsApp extraction with scope '${scope.toUpperCase()}'...`);

    try {
      await startWhatsAppScraperStream(
        { scope, headless: true, signal: abortController.signal },
        {
          onStatus: (msg) => {
            setCurrentProgress(msg);
            addLog('status', msg);
          },
          onQR: (qrDataUrl) => {
            setQrCodeUrl(qrDataUrl);
            addLog('status', 'QR Code required for WhatsApp login. Scan with your phone.');
          },
          onAuthenticated: () => {
            setQrCodeUrl(null);
            addLog('status', 'WhatsApp session authenticated successfully!');
            toast.success('WhatsApp connected!');
          },
          onGroupStart: (groupName, targetDomain, index, total) => {
            setCurrentProgress(`[${index}/${total}] Searching ${groupName} (${targetDomain})...`);
            addLog('group', `Checking group (${index}/${total}): ${groupName}`);
          },
          onGroupProgress: (groupName, message) => {
            setCurrentProgress(`${groupName}: ${message}`);
          },
          onGroupComplete: (_groupName, result) => {
            if (result.status === 'success') {
              addLog('complete', `✓ ${result.groupName}: Extracted ${result.extractedLinks.length} job link(s)`);
            } else if (result.status === 'skipped') {
              addLog('status', `○ ${result.groupName}: Skipped (${result.warning || 'No unread'})`);
            } else if (result.status === 'warning') {
              addLog('status', `⚠ ${result.groupName}: ${result.warning}`);
            } else {
              addLog('error', `✗ ${result.groupName}: ${result.error || 'Failed'}`);
            }
          },
          onDone: (result) => {
            setFinalResult(result);
            setIsRunning(false);
            setCurrentProgress('');
            addLog('complete', `Import completed! Harvested ${result.totalUrls} unique links.`);

            if (result.totalUrls > 0) {
              onImportComplete(result.urls);
              toast.success(`Successfully imported ${result.totalUrls} job link(s) from WhatsApp!`);
            } else {
              toast.info('No new job links found in the selected scope.');
            }
          },
          onError: (errMsg) => {
            if (abortController.signal.aborted) return;
            setIsRunning(false);
            setCurrentProgress('');
            addLog('error', `Error: ${errMsg}`);
            toast.error(errMsg || 'WhatsApp extraction encountered an error.');
          },
        }
      );
    } catch (err: any) {
      if (abortController.signal.aborted) return;
      setIsRunning(false);
      addLog('error', err.message || 'Failed to connect to WhatsApp scraper stream.');
      toast.error(err.message || 'Scraper failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              Import from WhatsApp
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scan group messages, filter target domains, and populate job links directly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-1">
          {/* Scope Selector */}
          {!isRunning && !qrCodeUrl && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Extraction Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'unread' as ExtractionScope,
                    label: 'Unread Only',
                    desc: 'Last N unread messages per badge',
                    recommended: true,
                  },
                  {
                    id: 'today' as ExtractionScope,
                    label: 'Today',
                    desc: "Messages sent during today's date",
                  },
                  {
                    id: 'yesterday' as ExtractionScope,
                    label: 'Yesterday',
                    desc: "Messages sent during yesterday's date",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScope(item.id)}
                    className={`cursor-pointer rounded-lg border p-3 text-left transition-all relative flex flex-col justify-between ${
                      scope === item.id
                        ? 'border-indigo-600 bg-indigo-500/10 text-foreground ring-1 ring-indigo-500/30'
                        : 'border-border bg-background hover:bg-secondary/50 text-muted-foreground'
                    }`}
                  >
                    {item.recommended && (
                      <span className="absolute -top-2 right-2 rounded bg-secondary text-foreground text-[9px] font-semibold uppercase px-1.5 py-0.2 border border-border">
                        Default
                      </span>
                    )}
                    <span className="font-semibold text-xs text-foreground block">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 leading-snug block">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* QR Code Presentation */}
          {qrCodeUrl && (
            <div className="rounded-lg border border-border bg-background p-4 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="inline-flex items-center gap-2 text-foreground font-semibold text-sm">
                <QrCode className="h-4 w-4 text-indigo-500" />
                <span>Scan with WhatsApp on your Phone</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Open WhatsApp &gt; Linked Devices &gt; Link a Device and point your camera at the QR code below.
              </p>
              <div className="inline-block rounded-lg bg-white p-2.5 shadow-sm border border-border">
                <img
                  src={qrCodeUrl}
                  alt="WhatsApp Web Login QR Code"
                  className="w-48 h-48 object-contain mx-auto"
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span>Waiting for scan... Session will be saved persistently.</span>
              </div>
            </div>
          )}

          {/* Live Progress & Status Feed */}
          {(isRunning || logs.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Live Feed
                </label>
                {currentProgress && isRunning && (
                  <span className="text-[11px] font-mono text-indigo-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {currentProgress}
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg bg-background p-3 border border-border font-mono text-[11px] scrollbar-thin">
                {logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-0.5 leading-relaxed">
                    <span className="text-muted-foreground/50 shrink-0 text-[10px]">{log.time}</span>
                    <span
                      className={`flex-1 break-words ${
                        log.type === 'complete'
                          ? 'text-emerald-500 font-semibold'
                          : log.type === 'error'
                          ? 'text-red-400 font-semibold'
                          : log.type === 'group'
                          ? 'text-indigo-400 font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}

          {/* Completion Summary Card */}
          {finalResult && (
            <div className="rounded-lg border border-border bg-background p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-foreground">Import Complete</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Harvested <strong className="text-foreground">{finalResult.totalUrls}</strong> unique links from {finalResult.processedGroups} groups.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-border">
          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleStopWorkflow}
              className="px-4 py-2 rounded-md text-sm font-medium border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer flex items-center gap-1.5"
            >
              <X className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="px-4 py-2 rounded-md text-sm font-medium border-border hover:bg-secondary text-foreground cursor-pointer"
            >
              {finalResult ? 'Close' : 'Cancel'}
            </Button>
          )}

          {!finalResult && (
            <Button
              type="button"
              onClick={handleStartImport}
              disabled={isRunning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md text-sm cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  Start Import
                </>
              )}
            </Button>
          )}

          {finalResult && (
            <Button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md text-sm cursor-pointer transition-colors"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

