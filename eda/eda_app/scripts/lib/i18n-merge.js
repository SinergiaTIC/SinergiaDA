'use strict';

const fs = require('fs');
const path = require('path');
const { Xliff1TranslationParser } = require('@angular/localize/tools');
const { merge: mergeXliff } = require('xliff-simple-merge/dist/src/merge');

/**
 * Localization layer for the Angular build.
 *
 * Three kinds of XLIFF file take part, and each one has a single owner:
 *
 *   src/locale/messages.xlf                 (WRITTEN by `ng extract-i18n`, source of truth)
 * + src/locale/messages.<locale>.xlf        (READ-ONLY translation catalog, targets only)
 * + src/locale/custom_messages.<locale>.xlf (READ-ONLY SinergiaDA deltas, wins on id clash)
 * = src/locale/merged/messages.<locale>.xlf (WRITTEN generated output, git-ignored)
 *
 * The extraction is the skeleton of the build: it decides which messages exist,
 * what their `<source>` is and which placeholders they declare. Angular compiles
 * every locale against that source, so a `<source>` coming from an outdated
 * catalog would either hide a code change or break the build with a placeholder
 * mismatch. Catalogs therefore only contribute `<target>` text, and the custom
 * file only ever overrides that target.
 *
 * A message that the code no longer contains cannot be translated by anybody, so
 * ids that only live in a catalog or in the custom file are reported and dropped
 * instead of being carried into the build forever.
 *
 * The merge is delegated to `xliff-simple-merge` with the extraction as the
 * destination file. That is what makes the skeleton authoritative: destination
 * units win, the inputs only bring translations in, and the last input wins on a
 * clash, hence `merge([catalog, custom], extraction)`.
 *
 * Callers: `scripts/i18n-merge.js` (CLI), `scripts/i18n-merge.test.js` (tests).
 */

const MESSAGES_DIR = 'src/locale';
const MERGED_SUBDIR = 'merged';
const ARCHIVE_SUBDIR = 'legacy';
const BASE_PREFIX = 'messages.';
const CUSTOM_PREFIX = 'custom_messages.';

/**
 * Language of the translatable strings in the code.
 *
 * Angular exposes it as `i18n.sourceLocale`, but that property only exists while
 * the code language is left out of the build targets. Spanish is translated like
 * any other locale here, so `angular.json` cannot declare it and the identity of
 * the source belongs to this module.
 */
const SOURCE_LOCALE = 'es';

/**
 * Deterministic, id based merge: no fuzzy remapping of ids, no `state`
 * attributes added to the generated file, and untranslated units are never
 * silently filled with their source text.
 */
const MERGE_OPTIONS = {
    fuzzyMatch: false,
    collapseWhitespace: true,
    resetTranslationState: false,
    replaceApostrophe: true,
    syncTargetsWithInitialState: false,
    sourceLanguage: false,
    overwriteTargetWithTranslated: false,
    newTranslationTargetsBlank: 'omit',
};

/** Max length of a reported diagnostic, to keep the CLI output readable. */
const MAX_MESSAGE_LENGTH = 140;

/** Max number of ids listed per issue before falling back to a counter. */
const MAX_LISTED_IDS = 10;

/**
 * Reads the i18n declaration of the first project in `angular.json`.
 * The locale list is the single source of truth for what has to be merged.
 * `sourceLocale` is optional, Angular only keeps it while the language of the
 * code is not translated.
 */
function readI18nConfig(projectRoot) {
    const angularJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'angular.json'), 'utf8'));
    const [projectName] = Object.keys(angularJson.projects || {});
    if (!projectName) {
        throw new Error('No projects found in angular.json');
    }
    const i18n = angularJson.projects[projectName].i18n || {};
    return {
        projectName,
        sourceLocale: i18n.sourceLocale || SOURCE_LOCALE,
        locales: Object.keys(i18n.locales || {}),
    };
}

/** Absolute paths of every file that takes part in a locale build. */
function localePaths(projectRoot, locale) {
    const dir = path.join(projectRoot, MESSAGES_DIR);
    return {
        source: path.join(dir, `${BASE_PREFIX}xlf`),
        base: path.join(dir, `${BASE_PREFIX}${locale}.xlf`),
        custom: path.join(dir, `${CUSTOM_PREFIX}${locale}.xlf`),
        output: path.join(dir, MERGED_SUBDIR, `${BASE_PREFIX}${locale}.xlf`),
        archive: path.join(dir, ARCHIVE_SUBDIR, `${BASE_PREFIX}${locale}.xlf`),
    };
}

/** Returns the opening `<file>` tag and its attributes, or null. */
function readFileElement(contents) {
    const match = /<file\b([^>]*)>/.exec(contents);
    if (!match) {
        return null;
    }
    const attrs = {};
    for (const [, name, value] of match[1].matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
        attrs[name] = value;
    }
    return { tag: match[0], attrs };
}

/**
 * Rewrites the `<file>` header so the generated file always declares the real
 * source locale and its own target locale. The header of the merged output is
 * inherited from the destination file, which is the extraction and therefore
 * trustworthy, but `target-language` still has to be declared per locale.
 */
function withNormalizedHeader(contents, sourceLocale, locale) {
    const file = readFileElement(contents);
    if (!file) {
        throw new Error('No <file> element found');
    }
    const attrs = {
        'source-language': sourceLocale,
        'target-language': locale,
        datatype: file.attrs.datatype || 'plaintext',
        original: file.attrs.original || 'ng2.template',
    };
    const tag = Object.entries(attrs)
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ');
    return contents.replace(file.tag, `<file ${tag}>`);
}

/** Maps `<trans-unit id>` to the inner XML of the unit. */
function readUnits(contents) {
    const units = new Map();
    for (const [, , id, inner] of contents.matchAll(UNIT_PATTERN())) {
        units.set(id, inner);
    }
    return units;
}

function UNIT_PATTERN() {
    return /<trans-unit\b[^>]*\bid=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/trans-unit>/g;
}

/**
 * Removes repeated `<trans-unit>` blocks, keeping the first occurrence of each id.
 *
 * Angular reports "Duplicated translations for message X" and silently uses the
 * first one, so duplicates in a generated file are dead weight that breaks the
 * build. Removing them before the merge also keeps every unit consistent with
 * the one Angular would pick.
 */
function dedupeUnits(contents) {
    const seen = new Set();
    const removed = [];
    let result = '';
    let cursor = 0;
    for (const match of contents.matchAll(UNIT_PATTERN())) {
        const id = match[2];
        if (seen.has(id)) {
            const end = match.index + match[0].length;
            result += contents.slice(cursor, match.index).replace(/\n[ \t]*$/, '');
            cursor = end;
            removed.push(id);
            continue;
        }
        seen.add(id);
    }
    if (!removed.length) {
        return { content: contents, removed };
    }
    return { content: result + contents.slice(cursor), removed };
}

function extractElement(inner, name) {
    const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(inner || '');
    return match ? match[1] : null;
}

/** Replaces the `<target>` of a unit, or appends one when the unit has none. */
function replaceUnitTarget(unitXml, targetXml) {
    if (/<target\b/i.test(unitXml)) {
        return unitXml.replace(/(<target[^>]*>)[\s\S]*?(<\/target>)/i, (whole, open, close) => `${open}${targetXml}${close}`);
    }
    return unitXml.replace(/(<source\b[^>]*>[\s\S]*?<\/source>)/i, (whole, source) => `${whole}\n        <target>${targetXml}</target>`);
}

/**
 * Writes the targets of `overrides` over `contents`, keeping every unit of
 * `contents` and ignoring the override ids it does not declare.
 *
 * `xliff-simple-merge` gives the `<target>` of a unit to the destination file and
 * the `<source>` to the last input, but it appends a unit once per input when the
 * destination does not declare it. Building a destination that already holds
 * every message is therefore the only way to combine "source from the extraction,
 * target from the custom file" without duplicates.
 */
function overlayTargets(contents, overrides) {
    if (!overrides || !overrides.size) {
        return contents;
    }
    let result = '';
    let cursor = 0;
    for (const match of contents.matchAll(UNIT_PATTERN())) {
        if (!overrides.has(match[2])) {
            continue;
        }
        const targetXml = extractElement(overrides.get(match[2]), 'target');
        if (targetXml === null) {
            continue;
        }
        result += contents.slice(cursor, match.index);
        result += replaceUnitTarget(match[0], targetXml);
        cursor = match.index + match[0].length;
    }
    return result + contents.slice(cursor);
}

/** Comparable plain text of a `<source>`/`<target>` body, markup and spacing removed. */
function plainText(xml) {
    if (xml === null) {
        return null;
    }
    return xml
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses an XLIFF 1.2 file with the same parser the Angular CLI uses, so the
 * placeholder signatures reported here are the ones the build will compare
 * against. Parse problems are returned, never thrown.
 */
function readTranslations(parser, filePath, contents) {
    const analysis = parser.analyze(filePath, contents);
    if (!analysis.canParse) {
        return {
            translations: new Map(),
            errors: analysis.diagnostics.messages,
            warnings: [],
        };
    }
    const bundle = parser.parse(filePath, contents, analysis.hint);
    return {
        translations: new Map(Object.entries(bundle.translations)),
        errors: bundle.diagnostics.messages.filter((message) => message.type === 'error'),
        warnings: bundle.diagnostics.messages.filter((message) => message.type !== 'error'),
    };
}

/**
 * Placeholder names of a parsed message, order independent. Angular rejects a
 * translation whose placeholders do not match the ones of the current source,
 * so this is the comparison that matters.
 */
function placeholderSignature(translation) {
    if (!translation) {
        return null;
    }
    return (translation.placeholderNames || [])
        .slice()
        .sort()
        .join(' ');
}

function summarize(message) {
    const firstLine = String(message).split('\n')[0].replace(/^(Error|Warning):\s*/, '').trim();
    return firstLine.length > MAX_MESSAGE_LENGTH ? `${firstLine.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : firstLine;
}

function listIds(ids) {
    if (ids.length <= MAX_LISTED_IDS) {
        return ids.join(', ');
    }
    return `${ids.slice(0, MAX_LISTED_IDS).join(', ')} … (+${ids.length - MAX_LISTED_IDS})`;
}

/** Relative path of a file, for reports. */
function rel(projectRoot, filePath) {
    return path.relative(projectRoot, filePath);
}

/**
 * Reads and validates one of the input files, sharing the checks a catalog and a
 * custom file need: parse diagnostics, repeated ids and a sane header.
 */
function readInput({ projectRoot, filePath, kind, sourceLocale, locale, sourceIds, parser, issues }) {
    const add = (level, code, message) => issues.push({ level, code, message });
    const fileRelative = rel(projectRoot, filePath);
    const contents = fs.readFileSync(filePath, 'utf8');
    const file = readFileElement(contents);
    if (!file) {
        add('error', `${kind}-header`, 'No <file> element found');
        return null;
    }
    if (kind === 'catalog' && file.attrs['source-language'] !== sourceLocale) {
        add(
            'warning',
            'catalog-source-language',
            `${fileRelative} source-language="${file.attrs['source-language']}" should be "${sourceLocale}"`
        );
    }
    if (file.attrs['target-language'] !== locale) {
        add(
            'warning',
            `${kind}-target-language`,
            `${fileRelative} target-language="${file.attrs['target-language'] || ''}" should be "${locale}"`
        );
    }

    const parsed = readTranslations(parser, filePath, contents);
    for (const diagnostic of parsed.errors) {
        add('error', `${kind}-message`, `${fileRelative} ${summarize(diagnostic.message)}`);
    }
    for (const diagnostic of parsed.warnings) {
        add('warning', `${kind}-message`, `${fileRelative} ${summarize(diagnostic.message)}`);
    }

    const deduped = dedupeUnits(contents);
    if (deduped.removed.length) {
        add(
            'warning',
            `${kind}-duplicate-id`,
            `${deduped.removed.length} repeated id(s) in ${fileRelative}, first occurrence kept: ${listIds(deduped.removed)}`
        );
    }

    const units = readUnits(deduped.content);
    if (sourceIds) {
        const orphan = [...units.keys()].filter((id) => !sourceIds.has(id));
        if (orphan.length) {
            add(
                'warning',
                `${kind}-without-source`,
                `${orphan.length} ${kind} id(s) the code no longer contains, dropped from the build: ${listIds(
                    orphan
                )}. Remove them, or re-run "npm run i18n:extract" if the extraction is older than the code`
            );
        }
    }
    return { contents: deduped.content, units, parsed };
}

/**
 * Merges one locale and reports every problem found on the way.
 *
 * Content problems (invalid messages, placeholder mismatches, repeated ids, ids
 * the code dropped) are reported, not thrown: the caller decides whether to fail
 * the run, so local development keeps working while `i18n:check` gates the branch.
 *
 * @returns {{locale: string, status: string, content: string|null, outputPath: string,
 *            counts: object, issues: Array<{level: string, code: string, message: string}>}}
 */
function processLocale({
    projectRoot,
    locale,
    sourceLocale = SOURCE_LOCALE,
    resetBroken = false,
    parser = new Xliff1TranslationParser(),
}) {
    const paths = localePaths(projectRoot, locale);
    const issues = [];
    const add = (level, code, message) => issues.push({ level, code, message });
    const report = { locale, status: 'skipped', content: null, outputPath: paths.output, counts: {}, issues };

    if (!fs.existsSync(paths.source)) {
        add('error', 'source-missing', `${rel(projectRoot, paths.source)} not found, run "npm run i18n:extract" first`);
        return report;
    }

    // The extraction is the skeleton: it owns the message list, the sources and
    // the placeholders every other file has to agree with.
    const sourceContents = fs.readFileSync(paths.source, 'utf8');
    if (!readFileElement(sourceContents)) {
        add('error', 'source-header', `No <file> element found in ${rel(projectRoot, paths.source)}`);
        return report;
    }
    const sourceParse = readTranslations(parser, paths.source, sourceContents);
    for (const diagnostic of sourceParse.errors) {
        add('error', 'source-message', `${rel(projectRoot, paths.source)} ${summarize(diagnostic.message)}`);
    }
    const dedupedSource = dedupeUnits(sourceContents);
    if (dedupedSource.removed.length) {
        add(
            'warning',
            'source-duplicate-id',
            `${dedupedSource.removed.length} repeated id(s) in ${rel(projectRoot, paths.source)}, first occurrence kept: ${listIds(
                dedupedSource.removed
            )}`
        );
    }
    const sourceUnits = readUnits(dedupedSource.content);
    const sourceIds = new Set(sourceUnits.keys());

    let catalog = null;
    let custom = null;

    if (fs.existsSync(paths.base)) {
        catalog = readInput({
            projectRoot,
            filePath: paths.base,
            kind: 'catalog',
            sourceLocale,
            locale,
            sourceIds,
            parser,
            issues,
        });
    } else {
        add(
            'warning',
            'catalog-missing',
            `no ${rel(projectRoot, paths.base)}, the locale falls back to the source text of the code`
        );
    }

    if (fs.existsSync(paths.custom)) {
        custom = readInput({
            projectRoot,
            filePath: paths.custom,
            kind: 'custom',
            sourceLocale,
            locale,
            sourceIds,
            parser,
            issues,
        });
    } else {
        add('warning', 'custom-missing', `no ${rel(projectRoot, paths.custom)}, locale left as upstream`);
    }

    try {
        // The destination owns the `<target>` and must declare every message, so
        // the custom targets are written over the catalog first; the extraction is
        // then the only input, which makes every `<source>` current and lets the
        // library prune the messages the code dropped. Without a catalog the
        // extraction itself is the skeleton and only the custom targets are kept.
        let destination = null;
        if (catalog) {
            destination = overlayTargets(catalog.contents, custom && custom.units);
        } else if (custom) {
            destination = overlayTargets(dedupedSource.content, custom.units);
        }
        report.content = destination
            ? mergeXliff([dedupedSource.content], destination, MERGE_OPTIONS)
            : dedupedSource.content;
    } catch (error) {
        // A strict XML parser rejects a malformed file that the Angular HTML
        // parser may still recover from, so this has to be a reported issue
        // rather than a crash of the whole run.
        add('error', 'merge-failed', `${rel(projectRoot, catalog ? paths.base : paths.custom)} is not valid XML, nothing generated: ${summarize(error.message)}`);
        return report;
    }

    // The check the build will actually run: every placeholder of the target that
    // ends up in the generated file has to exist in the current source.
    const mergedParse = readTranslations(parser, paths.output, report.content);
    const broken = [];
    for (const [id, source] of sourceParse.translations) {
        const target = mergedParse.translations.get(id);
        if (!target) {
            continue;
        }
        const sourceSignature = placeholderSignature(source);
        const targetSignature = placeholderSignature(target);
        if (sourceSignature !== null && targetSignature !== null && sourceSignature !== targetSignature) {
            broken.push(`${id} (source {${sourceSignature}} vs translation {${targetSignature}})`);
        }
    }

    if (broken.length && resetBroken) {
        // A translation the compiler rejects is unusable, so it degrades to the
        // source text instead of breaking the build. The report keeps the ids so
        // the string can be translated again.
        const brokenIds = new Set(
            broken.map((entry) => entry.slice(0, entry.indexOf(' (')))
        );
        let patched = '';
        let cursor = 0;
        for (const match of report.content.matchAll(UNIT_PATTERN())) {
            if (!brokenIds.has(match[2])) {
                continue;
            }
            const sourceXml = extractElement(sourceUnits.get(match[2]), 'source');
            if (sourceXml === null) {
                continue;
            }
            patched += report.content.slice(cursor, match.index);
            patched += replaceUnitTarget(match[0], sourceXml);
            cursor = match.index + match[0].length;
        }
        report.content = patched + report.content.slice(cursor);
        add(
            'error',
            'placeholder-reset',
            `${brokenIds.size} translation(s) replaced by their source text, the build rejects the ones that were there: ${listIds(
                [...brokenIds]
            )}`
        );
    } else if (broken.length) {
        add(
            'error',
            'placeholder-mismatch',
            `placeholder mismatch against the current source, the Angular build will reject: ${listIds(broken)}. Re-extract and retranslate, or run with --reset-broken to fall back to the source text`
        );
    }

    const untranslated = [];
    for (const id of sourceIds) {
        const merged = mergedParse.translations.get(id);
        if (!merged) {
            continue;
        }
        const unit = readUnits(report.content).get(id);
        if (unit === undefined) {
            continue;
        }
        const source = plainText(extractElement(unit, 'source'));
        const target = plainText(extractElement(unit, 'target'));
        if (source !== null && target !== null && source === target) {
            untranslated.push(id);
        }
    }
    if (untranslated.length) {
        add(
            'warning',
            'untranslated',
            `${untranslated.length} message(s) fall back to the source text, no translation: ${listIds(untranslated)}`
        );
    }

    try {
        report.content = withNormalizedHeader(report.content, sourceLocale, locale);
    } catch (error) {
        add('error', 'header-invalid', summarize(error.message));
        return report;
    }

    report.counts = {
        source: sourceUnits.size,
        catalog: catalog ? catalog.units.size : 0,
        custom: custom ? custom.units.size : 0,
        dropped: issues
            .filter((issue) => issue.code.endsWith('-without-source'))
            .reduce((total, issue) => total + Number(/^(\d+)/.exec(issue.message)[1]), 0),
    };
    report.status = 'merged';
    return report;
}

/**
 * Rewrites a translation catalog against a fresh extraction.
 *
 * The catalog keeps the translated `<target>` of every message that is still
 * compatible with the code, adopts the `<source>` of the current extraction and
 * falls back to the source text for the ones that are not. The previous catalog
 * is copied next to it under `src/locale/legacy` so no translation is ever lost
 * while the catalogs are still being replaced.
 *
 * @returns {{locale: string, created: boolean, archived: string|null, counts: object}}
 */
function seedLocale({ projectRoot, locale, sourceLocale = SOURCE_LOCALE, parser = new Xliff1TranslationParser() }) {
    const paths = localePaths(projectRoot, locale);
    const issues = [];
    const counts = { kept: 0, reset: 0, added: 0, removed: 0 };

    if (!fs.existsSync(paths.source)) {
        throw new Error(`${rel(projectRoot, paths.source)} not found, run "npm run i18n:extract" first`);
    }

    const sourceContents = fs.readFileSync(paths.source, 'utf8');
    const sourceParse = readTranslations(parser, paths.source, sourceContents);
    const dedupedSource = dedupeUnits(sourceContents);
    const sourceUnits = readUnits(dedupedSource.content);
    const sourceIds = new Set(sourceUnits.keys());

    let targets = new Map();
    let archive = null;
    let catalogParse = null;
    if (fs.existsSync(paths.base)) {
        const existing = readInput({
            projectRoot,
            filePath: paths.base,
            kind: 'catalog',
            sourceLocale,
            locale,
            sourceIds,
            parser,
            issues,
        });
        if (existing) {
            catalogParse = existing.parsed;
            for (const [id, inner] of existing.units) {
                if (sourceIds.has(id)) {
                    targets.set(id, inner);
                } else {
                    counts.removed += 1;
                }
            }
        }
        fs.mkdirSync(path.dirname(paths.archive), { recursive: true });
        fs.copyFileSync(paths.base, paths.archive);
        archive = rel(projectRoot, paths.archive);
    }

    // Both signatures come from the same parser the build uses, on whole files:
    // a target that cannot be compared is reset rather than trusted.
    const compiles = (id) => {
        const fromSource = placeholderSignature(sourceParse.translations.get(id));
        const fromCatalog = catalogParse ? placeholderSignature(catalogParse.translations.get(id)) : null;
        return fromSource !== null && fromCatalog !== null && fromSource === fromCatalog;
    };

    const rebuilt = [];
    for (const match of dedupedSource.content.matchAll(UNIT_PATTERN())) {
        const id = match[2];
        const existingInner = targets.get(id);
        const targetXml = existingInner ? extractElement(existingInner, 'target') : null;
        const sourceXml = extractElement(match[3], 'source');
        const usable = targetXml !== null && compiles(id);
        if (targetXml === null) {
            counts.added += 1;
        } else if (usable) {
            counts.kept += 1;
        } else {
            counts.reset += 1;
        }
        rebuilt.push(replaceUnitTarget(match[0], usable ? targetXml : sourceXml));
    }

    const body = rebuilt.join('\n');
    const contents = withNormalizedHeader(
        dedupedSource.content.replace(/(<body>)[\s\S]*(<\/body>)/, (whole, open, close) => `${open}\n${body}\n    ${close}`),
        sourceLocale,
        locale
    );
    fs.mkdirSync(path.dirname(paths.base), { recursive: true });
    fs.writeFileSync(paths.base, contents, 'utf8');

    return { locale, created: archive === null, archived: archive, counts, issues };
}

module.exports = {
    ARCHIVE_SUBDIR,
    MERGED_SUBDIR,
    MESSAGES_DIR,
    SOURCE_LOCALE,
    dedupeUnits,
    localePaths,
    placeholderSignature,
    processLocale,
    readFileElement,
    readI18nConfig,
    readTranslations,
    readUnits,
    seedLocale,
    withNormalizedHeader,
};
