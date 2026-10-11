import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nexus — Autonomous Business Operating System',
    short_name: 'Nexus',
    description: 'Autonomous AI Business Agent & Multi-Channel Operating System',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0B0A09',
    theme_color: '#E0533C',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        url: '/dashboard',
        description: 'View Nexus Overview & Key Metrics',
      },
      {
        name: 'Autonomous Agent',
        url: '/dashboard/agent',
        description: 'AI Autonomous Agent & Workflow Studio',
      },
      {
        name: 'CRM & Pipeline',
        url: '/dashboard/crm',
        description: 'Manage Leads, Contacts & Deals',
      },
      {
        name: 'Marketing Engine',
        url: '/dashboard/marketing',
        description: 'Multi-Channel Outreach & Campaigns',
      },
    ],
    categories: ['business', 'productivity', 'finance'],
  };
}
