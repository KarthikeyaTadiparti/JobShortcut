export type WhatsAppSourceType = 'group' | 'channel';

export interface WhatsAppSourceConfig {
    /** Discriminator indicating whether the source is a regular group chat or a broadcast channel */
    type: WhatsAppSourceType;
    /** Exact display name of the group or channel used for search/navigation in WhatsApp Web */
    name: string;
    /** Primary expected target domain (e.g. 'foundthejob.com', 'freshershunt.in') */
    targetDomain: string;
    /** Array of allowed hostnames/domains for extracted hyperlinks; defaults to [targetDomain] */
    allowedDomains?: string[] | undefined;
    /**
     * Optional regex (as a string) the URL path must match to count as a job post, for sites with a
     * stable job URL shape (e.g. '^/\d{4}/\d{2}/[^/]+\.html$'). Homepages and non-job pages are
     * always dropped regardless of this setting.
     */
    jobPathPattern?: string | undefined;
    /** Whether this source is active during batch scraping runs (defaults to true) */
    enabled?: boolean | undefined;
}

export interface WhatsAppGroupConfig {
    groupName: string;
    targetDomain: string;
    allowedDomains?: string[] | undefined;
    jobPathPattern?: string | undefined;
    enabled?: boolean | undefined;
}

export interface WhatsAppChannelConfig {
    channelName: string;
    targetDomain: string;
    allowedDomains?: string[] | undefined;
    jobPathPattern?: string | undefined;
    enabled?: boolean | undefined;
}

export const DEFAULT_WHATSAPP_GROUPS: WhatsAppGroupConfig[] = [
    {
        groupName: 'Jobcode 37',
        targetDomain: 'jobcode.in',
        allowedDomains: ['jobcode.in'],
        enabled: true,
    },
    {
        groupName: 'Fresher Openings - 86',
        targetDomain: 'freshersrecruitment.co.in',
        allowedDomains: [
            'freshersrecruitment.co.in',
            'freshersvoice.com',
            'fvoice.site',
            'fresheropenings.com',
            'fresherscareers.co.in',
        ],
        enabled: true,
    },
    {
        groupName: 'Placement Officer (2026 Batch)',
        targetDomain: 'placement-officer.com',
        allowedDomains: ['placement-officer.com', 'www.placement-officer.com'],
        jobPathPattern: '^/\\d{4}/\\d{2}/[^/]+\\.html$',
        enabled: true,
    },
    {
        groupName: '39 -Freshersdunia.in - Freshers Job - Off Campus Drive',
        targetDomain: 'freshersdunia.in',
        allowedDomains: ['freshersdunia.in'],
        enabled: true,
    },
];

export const DEFAULT_WHATSAPP_CHANNELS: WhatsAppChannelConfig[] = [
    {
        channelName: 'Freshershunt',
        targetDomain: 'freshershunt.in',
        allowedDomains: ['freshershunt.in'],
        enabled: true,
    },
    {
        channelName: 'Job Update With FoundtheJob',
        targetDomain: 'foundthejob.com',
        allowedDomains: ['foundthejob.com'],
        enabled: true,
    },
];

export const DEFAULT_WHATSAPP_SOURCES: WhatsAppSourceConfig[] = [
    ...DEFAULT_WHATSAPP_GROUPS.map((g) => ({
        type: 'group' as const,
        name: g.groupName,
        targetDomain: g.targetDomain,
        allowedDomains: g.allowedDomains,
        jobPathPattern: g.jobPathPattern,
        enabled: g.enabled,
    })),
    ...DEFAULT_WHATSAPP_CHANNELS.map((c) => ({
        type: 'channel' as const,
        name: c.channelName,
        targetDomain: c.targetDomain,
        allowedDomains: c.allowedDomains,
        jobPathPattern: c.jobPathPattern,
        enabled: c.enabled,
    })),
];
