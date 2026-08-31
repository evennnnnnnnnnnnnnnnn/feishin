import { describe, expect, it } from 'vitest';

import { GITHUB_RELEASES_URL, GITHUB_REPO, GITHUB_REPO_URL, toTag } from './use-github-releases';

// Releases are cut on the fork, not upstream. Pointing any of this at jeffvli/feishin makes
// every version lookup 404, which surfaces as "An error occurred" in the release-notes modal
// while the update itself installs fine - so the app looks broken only after a successful update.
describe('github release endpoints target the fork', () => {
    it('names the fork, not upstream', () => {
        expect(GITHUB_REPO).toBe('evennnnnnnnnnnnnnnnn/feishin');
        expect(GITHUB_REPO_URL).not.toContain('jeffvli');
        expect(GITHUB_RELEASES_URL).not.toContain('jeffvli');
    });

    it('builds the by-tag lookup the modal uses', () => {
        expect(`${GITHUB_RELEASES_URL}/tags/${toTag('2026.1.3')}`).toBe(
            'https://api.github.com/repos/evennnnnnnnnnnnnnnnn/feishin/releases/tags/v2026.1.3',
        );
    });

    it('builds the browser link the "View release notes" button uses', () => {
        expect(`${GITHUB_REPO_URL}/releases/tag/${toTag('2026.1.3')}`).toBe(
            'https://github.com/evennnnnnnnnnnnnnnnn/feishin/releases/tag/v2026.1.3',
        );
    });
});
