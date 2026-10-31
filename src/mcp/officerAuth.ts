export interface OfficerProfile {
  officer_id: string;
  name: string;
  designation: string;
  role: 'BLOCK_DEVELOPMENT_OFFICER' | 'DISTRICT_MAGISTRATE';
  assigned_blocks: string[]; // e.g. ['Sonari'] or ['*'] for District Magistrate
  token: string;
}

export const OFFICER_REGISTRY: Record<string, OfficerProfile> = {
  'tok_officer_sonari': {
    officer_id: 'bdo_sonari',
    name: 'Pranjal Gogoi',
    designation: 'Block Development Officer, Sonari',
    role: 'BLOCK_DEVELOPMENT_OFFICER',
    assigned_blocks: ['Sonari'],
    token: 'tok_officer_sonari',
  },
  'tok_officer_rajapara': {
    officer_id: 'bdo_rajapara',
    name: 'Nilima Das',
    designation: 'Block Development Officer, Rajapara',
    role: 'BLOCK_DEVELOPMENT_OFFICER',
    assigned_blocks: ['Rajapara'],
    token: 'tok_officer_rajapara',
  },
  'tok_officer_namti': {
    officer_id: 'bdo_namti',
    name: 'Dipen Barua',
    designation: 'Block Development Officer, Namti',
    role: 'BLOCK_DEVELOPMENT_OFFICER',
    assigned_blocks: ['Namti'],
    token: 'tok_officer_namti',
  },
  'tok_officer_borgaon': {
    officer_id: 'bdo_borgaon',
    name: 'Hemanta Kalita',
    designation: 'Block Development Officer, Borgaon',
    role: 'BLOCK_DEVELOPMENT_OFFICER',
    assigned_blocks: ['Borgaon'],
    token: 'tok_officer_borgaon',
  },
  'tok_dm_purvanchal': {
    officer_id: 'dm_purvanchal',
    name: 'District Magistrate, Purvanchal',
    designation: 'District Magistrate & Collector',
    role: 'DISTRICT_MAGISTRATE',
    assigned_blocks: ['*'], // Supervisory access across all 6 blocks
    token: 'tok_dm_purvanchal',
  },
  // Default shared gateway token mapped to District Magistrate role for remote SSE clients
  'officer-secret-key-purvanchal-2026': {
    officer_id: 'officer_gateway_purvanchal',
    name: 'Authorized Departmental Officer',
    designation: 'State Welfare Directorate',
    role: 'DISTRICT_MAGISTRATE',
    assigned_blocks: ['*'],
    token: 'officer-secret-key-purvanchal-2026',
  },
};

export function authenticateOfficerToken(token?: string): OfficerProfile | null {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, '').trim();
  return OFFICER_REGISTRY[clean] || null;
}

export function canOfficerAccessBlock(officer: OfficerProfile, targetBlock: string): boolean {
  if (!targetBlock) return false;
  if (officer.assigned_blocks.includes('*')) return true;
  return officer.assigned_blocks.some(b => b.toLowerCase() === targetBlock.toLowerCase());
}
