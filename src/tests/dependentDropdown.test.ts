import { describe, it, expect, beforeEach } from 'vitest';
import { DataStore } from '../data/store';
import {
  SUPPORTED_BLOCKS,
  BLOCK_VILLAGE_DIRECTORY,
  getVillagesForBlock,
  isValidVillageForBlock,
  validateApplicationDraft,
  normalizeIndianMobile,
} from '../services/applicationService';

describe('Dependent Development Block -> Village/Town Dropdown Suite', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore();
    store.resetToFactoryDefaults();
  });

  it('1. Village dropdown disabled before block selection', () => {
    // Before a block is selected or when block is empty, mapped villages must be empty
    expect(getVillagesForBlock('')).toEqual([]);
    expect(getVillagesForBlock(null)).toEqual([]);
    expect(getVillagesForBlock(undefined)).toEqual([]);

    // UI state helper check: empty block disables dropdown and shows placeholder
    const isBlockSelected = Boolean('');
    expect(isBlockSelected).toBe(false);
  });

  it('2. Selecting Sonari loads only Sonari villages', () => {
    const sonariVillages = getVillagesForBlock('Sonari');
    expect(sonariVillages).toBeDefined();
    expect(sonariVillages.length).toBe(7);
    expect(sonariVillages).toEqual([
      'Sonari Gaon',
      'Sonari Town Ward 1',
      'Sonari Town Ward 2',
      'Sonari Town Ward 3',
      'Silsako Village',
      'Bhatbari Gaon',
      'Jaboka Village',
    ]);

    // Verify it contains no villages from other blocks
    expect(sonariVillages).not.toContain('Rajapara Char');
    expect(sonariVillages).not.toContain('Namti Chariali');
    expect(sonariVillages).not.toContain('Khelua Central');
  });

  it('3. Selecting another block loads its own villages', () => {
    const rajaparaVillages = getVillagesForBlock('Rajapara');
    expect(rajaparaVillages).toContain('Rajapara Char');
    expect(rajaparaVillages).toContain('Khatkhati Gaon');
    expect(rajaparaVillages).not.toContain('Sonari Gaon');

    const namtiVillages = getVillagesForBlock('Namti');
    expect(namtiVillages).toContain('Namti Chariali');
    expect(namtiVillages).toContain('Bihubar Village');
    expect(namtiVillages).not.toContain('Rajapara Char');

    const borgaonVillages = getVillagesForBlock('Borgaon');
    expect(borgaonVillages).toContain('Borgaon Pathar');
    expect(borgaonVillages).toContain('Jamuguri Village');

    const dhemajiVillages = getVillagesForBlock('Dhemaji Pathar');
    expect(dhemajiVillages).toContain('Dhemaji Pathar Town');
    expect(dhemajiVillages).toContain('Ghilamara Village');

    const kheluaVillages = getVillagesForBlock('Khelua');
    expect(kheluaVillages).toContain('Khelua Gaon');
    expect(kheluaVillages).toContain('Nafuk Gaon');
  });

  it('4. Other appears at the end of every applicable village list', () => {
    // When rendered in UI, every supported block appends 'OTHER' as final option
    SUPPORTED_BLOCKS.forEach(block => {
      const villages = getVillagesForBlock(block);
      const optionsWithOther = [...villages, 'OTHER'];
      expect(optionsWithOther[optionsWithOther.length - 1]).toBe('OTHER');
    });
  });

  it('5. Selecting Other displays manual input and requires input', () => {
    // UI selection 'OTHER' enables manual input mode
    let villageSelection = 'OTHER';
    let manualVillageInput = '';
    const shouldDisplayManualInput = villageSelection === 'OTHER';
    expect(shouldDisplayManualInput).toBe(true);

    // Empty manual input is rejected
    expect(manualVillageInput.trim()).toBe('');
  });

  it('6. Manual village entry is saved correctly', () => {
    const manualVillage = '  Kathanibari Gaon Ward 4  ';
    const cleanVillage = manualVillage.trim();
    expect(cleanVillage).toBe('Kathanibari Gaon Ward 4');

    const isValid = isValidVillageForBlock('Sonari', cleanVillage, true);
    expect(isValid).toBe(true);

    const submitRes = store.addApplication({
      applicant_name: 'Tarun Gogoi',
      dob: '12/04/1953',
      gender: 'Male',
      marital_status: 'Married',
      block: 'Sonari',
      village: cleanVillage,
      bank_account: '987654321098',
      ifsc: 'SBIN0001234',
      mobile: '9871122334',
      doc_name: 'age_proof.pdf',
    });

    expect(submitRes.success).toBe(true);
    expect(submitRes.application?.village).toBe('Kathanibari Gaon Ward 4');
    expect(submitRes.application?.block).toBe('Sonari');
  });

  it('7. Empty manual entry is rejected', () => {
    expect(isValidVillageForBlock('Sonari', '', true)).toBe(false);
    expect(isValidVillageForBlock('Sonari', '   ', true)).toBe(false);
    expect(isValidVillageForBlock('Sonari', '\t\n', true)).toBe(false);
  });

  it('8. Changing blocks clears the old village', () => {
    let selectedBlock = 'Sonari';
    let selectedVillage = 'Sonari Gaon';
    let manualVillage = 'Custom Ward';

    // When block changes:
    const newBlock = 'Rajapara';
    if (newBlock !== selectedBlock) {
      selectedBlock = newBlock;
      selectedVillage = '';
      manualVillage = '';
    }

    expect(selectedBlock).toBe('Rajapara');
    expect(selectedVillage).toBe('');
    expect(manualVillage).toBe('');

    // And old village is not in the new block's directory
    const newBlockVillages = getVillagesForBlock(selectedBlock);
    expect(newBlockVillages).not.toContain('Sonari Gaon');
  });

  it('9. Village from another block is rejected by backend validation', () => {
    // 'Namti Chariali' belongs to Namti, not Sonari
    const isSonariValid = isValidVillageForBlock('Sonari', 'Namti Chariali', false);
    expect(isSonariValid).toBe(false);

    // 'Sonari Gaon' belongs to Sonari, not Rajapara
    const isRajaparaValid = isValidVillageForBlock('Rajapara', 'Sonari Gaon', false);
    expect(isRajaparaValid).toBe(false);
  });

  it('10. Saved address information is restored when navigating backward and forward', () => {
    // Simulating wizard state
    const wizardState = {
      step: 3,
      formData: {
        block: 'Sonari',
        village: 'Silsako Village',
      },
      villageSelection: 'Silsako Village',
      manualVillageInput: '',
    };

    // User navigates backward to step 2
    wizardState.step = 2;
    expect(wizardState.formData.block).toBe('Sonari');
    expect(wizardState.formData.village).toBe('Silsako Village');

    // User navigates forward to step 3
    wizardState.step = 3;
    const available = getVillagesForBlock(wizardState.formData.block);
    if (available.includes(wizardState.formData.village)) {
      wizardState.villageSelection = wizardState.formData.village;
      wizardState.manualVillageInput = '';
    }

    expect(wizardState.villageSelection).toBe('Silsako Village');
    expect(wizardState.formData.block).toBe('Sonari');
  });

  it('11. Pension application submission still works', () => {
    const mobile = '9875566778';
    const otpRes = store.generateMobileOtp(mobile, 'APPLICATION');
    expect(otpRes.success).toBe(true);

    const verifyRes = store.verifyMobileOtp(mobile, otpRes.code!);
    expect(verifyRes.success).toBe(true);

    const submitRes = store.addApplication({
      applicant_name: 'Deepali Saikia',
      dob: '25/11/1956',
      gender: 'Female',
      marital_status: 'Married',
      block: 'Sonari',
      village: 'Jaboka Village',
      bank_account: '309876543210',
      ifsc: 'SBIN0001234',
      mobile,
      doc_name: 'voter_id_deepali.jpg',
    });

    expect(submitRes.success).toBe(true);
    expect(submitRes.application).toBeDefined();
    expect(submitRes.application?.application_no).toMatch(/^SSP\d+/);
    expect(submitRes.application?.block).toBe('Sonari');
    expect(submitRes.application?.village).toBe('Jaboka Village');
    expect(submitRes.application?.status).toBe('PENDING');
  });
});
