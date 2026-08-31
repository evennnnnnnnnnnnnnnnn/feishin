import { initClient, initContract } from '@ts-rest/core';
import { AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';

import { serverErrorMessage } from './navidrome-error-message';

import { ndType } from '/@/shared/api/navidrome/navidrome-types';
import { resultWithHeaders } from '/@/shared/api/utils';

// The body shape ts-rest hands back: whatever the server sent, under `data`.
const body = (data: unknown) => ({ data, headers: {} });

describe('serverErrorMessage', () => {
    it('reads the plain-text body most nativeapi routes send', () => {
        expect(serverErrorMessage(body('Access denied'))).toBe('Access denied');
    });

    it('reads the JSON `message` the deletion routes send', () => {
        expect(
            serverErrorMessage(
                body({ message: 'deleting media files is disabled on this server' }),
            ),
        ).toBe('deleting media files is disabled on this server');
    });

    it('trims both shapes', () => {
        expect(serverErrorMessage(body('  not found\n'))).toBe('not found');
        expect(serverErrorMessage(body({ message: '  not found\n' }))).toBe('not found');
    });

    it('falls back for bodies carrying nothing usable', () => {
        expect(serverErrorMessage(undefined)).toBeUndefined();
        expect(serverErrorMessage(body(undefined))).toBeUndefined();
        expect(serverErrorMessage(body(null))).toBeUndefined();
        expect(serverErrorMessage(body('   '))).toBeUndefined();
        expect(serverErrorMessage(body({}))).toBeUndefined();
        expect(serverErrorMessage(body({ message: '  ' }))).toBeUndefined();
        expect(serverErrorMessage(body({ message: 42 }))).toBeUndefined();
    });
});

/**
 * The deletion routes are the reason `serverErrorMessage` has to handle a JSON body at all,
 * so drive the real contract schemas through a real ts-rest client and reproduce what the
 * controller does with a refusal.
 */
describe('the deletion routes refusing through ts-rest', () => {
    const c = initContract();
    const contract = c.router({
        deleteSongsFromLibrary: {
            body: null,
            method: 'DELETE',
            path: 'deletion/song',
            query: ndType._parameters.deleteFromLibrary,
            responses: {
                200: resultWithHeaders(ndType._response.deleteFromLibrary),
                403: resultWithHeaders(ndType._response.error),
            },
        },
    });

    // Mirrors navidrome-api.ts: a custom `api` fn handing back the raw axios body, and
    // initClient without `validateResponse`.
    const clientAnswering = (status: number, data: unknown) =>
        initClient(contract, {
            api: async () => ({
                body: { data, headers: new AxiosHeaders() },
                headers: new AxiosHeaders() as never,
                status,
            }),
            baseUrl: '',
            jsonQuery: false,
        });

    const deleteSongs = async (status: number, data: unknown) => {
        const res = await clientAnswering(status, data).deleteSongsFromLibrary({
            query: { id: ['song-1'] },
        });

        // The controller's error path, verbatim.
        if (res.status !== 200) {
            throw new Error(
                serverErrorMessage(res.body) ?? 'Failed to delete songs from the library',
            );
        }

        return res.body.data;
    };

    it('throws the server-sent JSON message, not the hardcoded fallback', async () => {
        await expect(
            deleteSongs(403, { message: 'deleting media files is disabled on this server' }),
        ).rejects.toThrow('deleting media files is disabled on this server');
    });

    it('reports the partial-batch 500 the server sends verbatim', async () => {
        await expect(
            deleteSongs(500, { message: 'deleted 2 of 5 files, then stopped' }),
        ).rejects.toThrow('deleted 2 of 5 files, then stopped');
    });

    it('falls back when the body carries no explanation', async () => {
        await expect(deleteSongs(403, {})).rejects.toThrow(
            'Failed to delete songs from the library',
        );
    });
});
