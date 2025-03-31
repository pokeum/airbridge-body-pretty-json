const vscode = require('vscode');

/**
 * Remove Android Log Prefix:
 * https://developer.android.com/studio/debug/logcat
 * 
 * @param {string} logEntry     A single log entry string.
 * @returns {string}            A log entry string with the android log prefix removed.
 */
function removeAndroidLogPrefix(logEntry) {
    const dateRegex = "\\d{4}-\\d{2}-\\d{2}"                    // e.g. 2022-12-29
    const timestampRegex = "\\d{2}:\\d{2}:\\d{2}\\.\\d{3}"      // e.g. 04:00:18.823
    const processAndThreadIdRegex = "\\d+-\\d+"                 // e.g. 30249-30321
    const tagRegex = "\\S+"                                     // e.g. ProfileInstaller
    const packageNameRegex = "\\S+"                             // e.g. com.google.samples.apps.sunflower
    const priorityRegex = "[VDIWE]"                             // e.g. D

    const androidLogPrefixRegex =
        new RegExp(`^${dateRegex}\\s+${timestampRegex}\\s+${processAndThreadIdRegex}\\s+${tagRegex}\\s+${packageNameRegex}\\s+${priorityRegex}\\s+`);

    return logEntry.replace(androidLogPrefixRegex, '');
}

/**
 * Combines multi-page logs into complete logs and merges them with single-line logs.
 * Only complete multi-page logs are included; incomplete ones are ignored.
 *
 * @param {string} input    The input string containing mixed logs.
 * @returns {string[]}      An array of complete log entries.
 */
function flattenLogs(input) {
    const lines = input.split(/\r?\n/);
    const logRegex = /log\{page=(\d+)\/(\d+), id=(\d+)\}/;

    const logsById = {};
    const logEntries = [];

    for (const line of lines) {
        const match = line.match(logRegex);
        if (match) {
            const page = parseInt(match[1], 10);
            const total = parseInt(match[2], 10);
            const id = parseInt(match[3], 10);
            const body = line.replace(logRegex, '').trim();

            if (!logsById[id]) {
                logsById[id] = { total, pages: [] };
            }

            logsById[id].pages[page - 1] = body;
        } else {
            logEntries.push(line);
        }
    }

    for (const id in logsById) {
        const { pages, total } = logsById[id];
        if (pages.filter(() => true).length === total) {
            logEntries.push(
                pages
                    .map((page, index) => index === 0 ? page : removeAndroidLogPrefix(page))
                    .join('')
            );
        } else {
            vscode.window.showErrorMessage(`Incomplete paginated log ignored (log ID: ${id}).`);
        }
    }

    return logEntries
        // Filter out log entries that are empty or contain only whitespace
        .filter(log => log.trim() !== '');
}

/**
 * Sorts an array of log entries based on the timestamp at the beginning of each entry.
 * Assumes each log entry starts with a timestamp in the format: YYYY-MM-DD HH:mm:ss.SSS
 *
 * @param {string[]} logEntries     An array of log entry strings.
 * @returns {string[]}              A new array of log entries sorted chronologically.
 */
function sortLogs(logEntries) {
    // Regular expression to match the date and timestamp at the start of a log entry
    const dateAndTimestampRegex = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}/;

    return logEntries
        .sort((a, b) => {
            // Extract timestamp strings from each log entry
            const dateAndTimestampA = a.match(dateAndTimestampRegex)?.[0];
            const dateAndTimestampB = b.match(dateAndTimestampRegex)?.[0];

            // Convert to Date objects (or default to epoch if not found)
            const dateA = dateAndTimestampA ? new Date(dateAndTimestampA.replace(/\s+/, 'T')) : new Date(0);
            const dateB = dateAndTimestampB ? new Date(dateAndTimestampB.replace(/\s+/, 'T')) : new Date(0);

            // Sort by chronological order
            return dateA.getTime() - dateB.getTime();
        });
}

/**
 * Extracts the value inside `body={...}` from each log entry,
 * stopping before the `bodySize=` part.
 * 
 * @param {string[]} logEntries     An array of log entry strings.
 * @returns {string[]}              An array of extracted body contents.
 */
function extractBodies(logEntries) {
    return logEntries
        .map(log => {
            const match = log.match(/body=\{([\s\S]*?)\}(?=\sbodySize=)/);
            return match ? match[1] : null
        })
        .filter(body => body !== null);
}

module.exports = {
    flattenLogs,
    sortLogs,
    extractBodies
};