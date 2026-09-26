export interface WhatsAppGroupConfig {
    groupName: string;
    targetDomain: string;
    allowedDomains?: string[] | undefined;
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
        enabled: true,
    },
    {
        groupName: 'Found The Job Alerts',
        targetDomain: 'foundthejob.com',
        allowedDomains: ['foundthejob.com'],
        enabled: true,
    },
    {
        groupName: 'Freshers Dunia Updates',
        targetDomain: 'freshersdunia.in',
        allowedDomains: ['freshersdunia.in'],
        enabled: true,
    },
];
