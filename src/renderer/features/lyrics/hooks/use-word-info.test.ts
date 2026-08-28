import { describe, expect, it } from 'vitest';

import dictionary from '../assets/jmdict-compact.json';
import { buildLookupCandidates, lookupWordEntries, WordLookupInput } from './use-word-info';

type Dictionary = Parameters<typeof lookupWordEntries>[0];

const dict = dictionary as unknown as Dictionary;

const lookup = (input: WordLookupInput) =>
    lookupWordEntries(dict, buildLookupCandidates(input), input.pos);

describe('buildLookupCandidates', () => {
    it('puts the dictionary form before the surface form', () => {
        const candidates = buildLookupCandidates({
            basicForm: '食べる',
            pos: '動詞',
            reading: 'たべ',
            surface: '食べ',
        });

        expect(candidates.indexOf('食べる')).toBe(0);
        expect(candidates.indexOf('食べる')).toBeLessThan(candidates.indexOf('食べ'));
    });

    it('adds kana-normalized variants and drops duplicates and nulls', () => {
        const candidates = buildLookupCandidates({
            basicForm: null,
            pos: null,
            reading: 'こーひー',
            surface: 'コーヒー',
        });

        expect(candidates).toContain('コーヒー');
        expect(candidates).toContain('こーひー');
        expect(new Set(candidates).size).toBe(candidates.length);
        expect(candidates).not.toContain('');
    });
});

// Hook-level verification of the four word classes from the task's definition
// of done, against the real generated asset.
describe('lookupWordEntries (bundled asset)', () => {
    it('resolves a conjugated verb through its base form', () => {
        // 食べて as tokenized by kuromoji: surface 食べ, basicForm 食べる
        const entries = lookup({
            basicForm: '食べる',
            pos: '動詞',
            reading: 'たべ',
            surface: '食べ',
        });

        expect(entries.length).toBeGreaterThan(0);
        expect(entries[0].kanji).toBe('食べる');
        expect(entries[0].reading).toBe('たべる');
        expect(entries[0].senses[0].glosses.join(' ')).toContain('eat');
    });

    it('resolves a particle and ranks it above noun homographs', () => {
        const entries = lookup({ basicForm: 'は', pos: '助詞', reading: 'は', surface: 'は' });

        expect(entries.length).toBeGreaterThan(0);
        expect(entries[0].senses.some((sense) => sense.pos.includes('prt'))).toBe(true);
    });

    it('resolves a noun', () => {
        const entries = lookup({ basicForm: '猫', pos: '名詞', reading: 'ねこ', surface: '猫' });

        expect(entries.length).toBeGreaterThan(0);
        expect(entries[0].reading).toBe('ねこ');
        expect(entries[0].senses[0].glosses.join(' ')).toContain('cat');
    });

    it('resolves a katakana loanword via the reading index', () => {
        const entries = lookup({
            basicForm: 'コーヒー',
            pos: '名詞',
            reading: 'こーひー',
            surface: 'コーヒー',
        });

        expect(entries.length).toBeGreaterThan(0);
        expect(entries[0].reading).toBe('コーヒー');
        expect(entries[0].senses[0].glosses.join(' ')).toContain('coffee');
    });

    it('returns an empty list when nothing matches', () => {
        expect(lookup({ basicForm: null, pos: null, reading: null, surface: 'zzzz' })).toEqual([]);
    });
});
