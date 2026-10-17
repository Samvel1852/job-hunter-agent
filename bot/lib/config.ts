export type Region = 'armenia' | 'eu' | 'us' | 'uae' | 'remote';

export type JobSource =
  | 'linkedin'
  | 'staffam'
  | 'google-careers'
  | 'google-jobs'
  | 'remotive'
  | 'himalayas'
  | 'remoteok';

export const ALL_REGIONS: Region[] = ['armenia', 'eu', 'us', 'uae', 'remote'];

export const ALL_SOURCES: JobSource[] = [
  'linkedin',
  'staffam',
  'google-careers',
  'google-jobs',
  'remotive',
  'himalayas',
  'remoteok',
];

export const CANDIDATE = {
  name: 'Samvel Demirtshyan',
  email: 'sam.demirtshyan@gmail.com',
  canvaDesignId: 'DAHYNhleQV4',
  canvaDesignUrl: 'https://www.canva.com/design/DAHYNhleQV4/htPca5hyr4h524p9R2tLaQ/edit',
  timeZone: 'Asia/Yerevan',
};

export const DAILY_LIMIT = 15;

export const SEARCH_KEYWORDS = ['Product Manager', 'Product Owner', 'Technical Product Manager'];

export const TITLE_INCLUDE =
  /\bproduct\s+(manager|owner|lead|director)\b|\b(head|vp|director)\s+of\s+product\b|\bproduct\s+management\b/i;

export const TITLE_EXCLUDE =
  /\b(intern|internship|trainee|working student|werkstudent)\b|\bproduct\s+(analytics|marketing|design)\b/i;

export const LINKEDIN_GEO_IDS: Record<Exclude<Region, 'remote'>, string> = {
  armenia: '103030111',
  eu: '91000000',
  us: '103644278',
  uae: '104305776',
};

/** LinkedIn `f_TPR` window. One week keeps enough fresh candidates after dedupe. */
export const LINKEDIN_POSTED_WITHIN = 'r604800';

export const GOOGLE_CAREERS_LOCATIONS: Record<Exclude<Region, 'remote'>, string[]> = {
  armenia: [],
  eu: ['Germany', 'Ireland', 'Netherlands', 'Poland', 'Switzerland'],
  us: ['United States'],
  uae: ['Dubai, United Arab Emirates'],
};

export const GOOGLE_JOBS_LOCATIONS: Record<Exclude<Region, 'remote'>, string> = {
  armenia: 'Yerevan, Armenia',
  eu: 'European Union',
  us: 'United States',
  uae: 'United Arab Emirates',
};

/** Hosts `get_job_details` may fetch. Keeps the model from pointing the host at arbitrary URLs. */
export const DETAIL_HOSTS = [
  'linkedin.com',
  'staff.am',
  'google.com',
  'remotive.com',
  'himalayas.app',
  'remoteok.com',
];
