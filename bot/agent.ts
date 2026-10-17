import { defineAgent } from '@cursor/bdk';

export default defineAgent({
  description:
    'Finds the 15 best-fit Product Manager / Product Owner roles per day and prepares a tailored CV and cover letter for each.',
  model: {
    id: 'grok-4.5',
    params: [
      { id: 'effort', value: 'high' },
      { id: 'fast', value: 'true' },
    ],
  },
  hosting: {
    egressDomains: [
      'linkedin.com',
      'www.linkedin.com',
      'staff.am',
      'www.google.com',
      'remotive.com',
      'himalayas.app',
      'remoteok.com',
      'serpapi.com',
    ],
    secretNames: ['SERPAPI_API_KEY'],
  },
});
