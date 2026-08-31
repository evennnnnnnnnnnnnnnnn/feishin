/**
 * Digs the server's own explanation out of a non-2xx ts-rest response body.
 *
 * ts-rest widens the body of a non-2xx branch and the client is built without
 * `validateResponse`, so whatever the server sent arrives verbatim under `data` and has to
 * be narrowed by hand. Navidrome answers errors in two shapes:
 *
 * - Most nativeapi routes use `http.Error`, which writes the message as plain text.
 * - The deletion routes answer `{"message": "..."}` as JSON, because Navidrome's own
 *   bundled web UI reads `message` off the parsed body.
 *
 * Both are handled here so a refusal reaches the toast either way. Returns undefined when
 * the body carries nothing usable, leaving the caller to fall back to its own wording.
 */
export const serverErrorMessage = (body: unknown): string | undefined => {
    const data = (body as undefined | { data?: unknown })?.data;

    if (typeof data === 'string') {
        return data.trim() || undefined;
    }

    const message = (data as null | undefined | { message?: unknown })?.message;

    if (typeof message === 'string') {
        return message.trim() || undefined;
    }

    return undefined;
};
