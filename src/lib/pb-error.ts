/**
 * pb-error.ts
 * Reusable PocketBase error handler.
 * Handles field-level errors like:
 *   { "status": "Invalid value 🟢 Available" }
 *   { "email": { "code": "validation_required", "message": "..." } }
 *   { "items": [{ "code": "...", "message": "..." }] }
 */

// ─── Raw PocketBase shapes ────────────────────────────────────────────────────

/** Single field error from PB: { code, message } */
export interface PbFieldError {
    code: string;
    message: string;
}

/**
 * PB details object — each key is a field name.
 * Value may be:
 *   - a { code, message } object
 *   - a plain string  (e.g. "Invalid value 🟢 Available")
 *   - an array of { code, message }
 */
export type PbErrorDetails = Record<
    string,
    PbFieldError | PbFieldError[] | string
>;

/** Raw PocketBase ClientResponseError shape */
export interface RawPbError {
    url?: string;
    status?: number;
    response?: {
        code?: number;
        message?: string;
        data?: PbErrorDetails;
    };
    // PB also sometimes puts details directly on response root
    data?: PbErrorDetails;
    message?: string;
    isAbort?: boolean;
    originalError?: unknown;
}

// ─── Normalised output ────────────────────────────────────────────────────────

/** One normalised field error */
export interface FieldValidationError {
    field: string;
    message: string;
    code?: string;
}

/** Fully parsed error ready for UI / logging */
export interface ParsedPbError {
    /** Human-readable summary */
    summary: string;
    /** HTTP status code (0 if network/unknown) */
    status: number;
    /** Per-field validation errors, if any */
    fieldErrors: FieldValidationError[];
    /** True when the request was intentionally cancelled (autoCancellation) */
    isAbort: boolean;
    /** True when there is at least one field-level validation error */
    isValidationError: boolean;
    /** Original raw error for debugging */
    raw: unknown;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip emoji and normalise whitespace from PocketBase's
 * human-readable messages like "Invalid value 🟢 Available".
 */
function cleanMessage(msg: string): string {
    return msg
        .replace(/[\u{1F300}-\u{1FFFF}]/gu, '') // remove emoji (supplementary plane)
        .replace(/[\u2000-\u206F\u2190-\u21FF]/gu, '') // misc symbols
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Normalise a single field's error value into a FieldValidationError */
function normaliseFieldValue(
    field: string,
    value: PbFieldError | PbFieldError[] | string,
): FieldValidationError[] {
    if (typeof value === 'string') {
        return [{ field, message: cleanMessage(value) }];
    }

    if (Array.isArray(value)) {
        return value.map((v) => ({
            field,
            code: v.code,
            message: cleanMessage(v.message ?? v.code ?? 'Invalid value'),
        }));
    }

    // Plain { code, message } object
    return [
        {
            field,
            code: value.code,
            message: cleanMessage(value.message ?? value.code ?? 'Invalid value'),
        },
    ];
}

/** Extract PbErrorDetails from wherever PocketBase decided to put them */
function extractDetails(err: RawPbError): PbErrorDetails | null {
    // PB v0.20+ puts field errors in response.data
    if (err.response?.data && Object.keys(err.response.data).length > 0) {
        return err.response.data;
    }
    // Some older/custom shapes put it directly on err.data
    if (err.data && Object.keys(err.data).length > 0) {
        return err.data;
    }
    return null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Parse any thrown value into a structured ParsedPbError.
 *
 * @example
 * try {
 *   await pb.collection('users').update(id, data)
 * } catch (err) {
 *   const parsed = parsePbError(err)
 *   if (parsed.isValidationError) {
 *     parsed.fieldErrors.forEach(e => console.warn(e.field, e.message))
 *   }
 * }
 */
export function parsePbError(err: unknown): ParsedPbError {
    // Abort / cancellation
    if (
        err &&
        typeof err === 'object' &&
        ('isAbort' in err || (err as RawPbError).originalError !== undefined)
    ) {
        const raw = err as RawPbError;
        if (raw.isAbort) {
            return {
                summary: 'Request was cancelled.',
                status: 0,
                fieldErrors: [],
                isAbort: true,
                isValidationError: false,
                raw: err,
            };
        }
    }

    if (!err || typeof err !== 'object') {
        return {
            summary: String(err ?? 'An unknown error occurred.'),
            status: 0,
            fieldErrors: [],
            isAbort: false,
            isValidationError: false,
            raw: err,
        };
    }

    const raw = err as RawPbError;
    const status = raw.status ?? raw.response?.code ?? 0;
    const details = extractDetails(raw);

    // Build field errors
    const fieldErrors: FieldValidationError[] = [];
    if (details) {
        for (const [field, value] of Object.entries(details)) {
            fieldErrors.push(...normaliseFieldValue(field, value));
        }
    }

    // Build summary
    let summary =
        raw.response?.message ??
        raw.message ??
        'An unexpected error occurred.';

    // If we have field errors, prefer the first one as the summary
    // (better UX than "Failed to update record.")
    if (fieldErrors.length > 0) {
        summary = fieldErrors.map((e) => `${e.field}: ${e.message}`).join('; ');
    }

    summary = cleanMessage(summary);

    return {
        summary,
        status,
        fieldErrors,
        isAbort: false,
        isValidationError: fieldErrors.length > 0,
        raw: err,
    };
}

/**
 * Get a flat map of { fieldName → errorMessage } — useful for wiring
 * directly into form error state (React Hook Form, Formik, etc.)
 *
 * @example
 * const errors = getFieldErrorMap(parsePbError(err))
 * // { status: "Invalid value", email: "Required" }
 */
export function getFieldErrorMap(
    parsed: ParsedPbError,
): Record<string, string> {
    return Object.fromEntries(
        parsed.fieldErrors.map((e) => [e.field, e.message]),
    );
}

/**
 * Get the first error message for a specific field, or null.
 *
 * @example
 * const msg = getFieldError(parsePbError(err), 'status')
 */
export function getFieldError(
    parsed: ParsedPbError,
    field: string,
): string | null {
    return parsed.fieldErrors.find((e) => e.field === field)?.message ?? null;
}

/**
 * Throw a normalised error — use in service catch blocks when you
 * want callers to always receive a ParsedPbError.
 */
export function throwParsed(err: unknown): never {
    throw parsePbError(err);
}