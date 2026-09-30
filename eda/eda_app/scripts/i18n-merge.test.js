'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');

const { processLocale, readI18nConfig, seedLocale } = require('./lib/i18n-merge');

/** Builds a minimal XLIFF 1.2 document. */
function xliff({ sourceLanguage, targetLanguage, units }) {
    const body = Object.entries(units)
        .map(
            ([id, { source, target }]) =>
                `      <trans-unit id="${id}" datatype="html">\n` +
                `        <source>${source}</source>\n` +
                (target === undefined ? '' : `        <target>${target}</target>\n`) +
                `      </trans-unit>`
        )
        .join('\n');
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n' +
        `  <file source-language="${sourceLanguage}"${
            targetLanguage ? ` target-language="${targetLanguage}"` : ''
        } datatype="plaintext" original="ng2.template">\n` +
        '    <body>\n' +
        `${body}\n` +
        '    </body>\n' +
        '  </file>\n' +
        '</xliff>\n'
    );
}

/** Placeholder carrier, to build messages that keep or drop their markup. */
const strong = (text) => `${text} <x id="START_TAG_STRONG"/>MARK<ph id="PH"/> end<ph id="PH_END"/>`;

describe('i18n merge', () => {
    let root;

    before(() => {
        console.debug = () => undefined;
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-merge-'));
        fs.mkdirSync(path.join(root, 'src/locale'), { recursive: true });
        fs.writeFileSync(
            path.join(root, 'angular.json'),
            JSON.stringify({ projects: { 'app-eda': { i18n: { sourceLocale: 'es', locales: { ca: {}, en: {} } } } } })
        );
    });

    after(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    function write(prefix, locale, contents) {
        fs.writeFileSync(path.join(root, 'src/locale', `${prefix}${locale}.xlf`), contents);
    }

    function writeSource(contents) {
        fs.writeFileSync(path.join(root, 'src/locale/messages.xlf'), contents);
    }

    function clearLocale(locale) {
        for (const prefix of ['messages.', 'custom_messages.']) {
            fs.rmSync(path.join(root, 'src/locale', `${prefix}${locale}.xlf`), { force: true });
        }
    }

    function merge(locale = 'ca', options = {}) {
        return processLocale({ projectRoot: root, locale, sourceLocale: 'es', ...options });
    }

    it('reads the locales declared in angular.json', () => {
        const config = readI18nConfig(root);
        assert.equal(config.sourceLocale, 'es');
        assert.deepEqual(config.locales, ['ca', 'en']);
    });

    it('falls back to the language of the code when angular.json has no sourceLocale', () => {
        const file = path.join(root, 'angular.json');
        const original = fs.readFileSync(file, 'utf8');
        try {
            fs.writeFileSync(
                file,
                JSON.stringify({
                    projects: { 'app-eda': { i18n: { locales: { es: {}, ca: {} } } } },
                })
            );
            const config = readI18nConfig(root);
            assert.equal(config.sourceLocale, 'es');
            assert.deepEqual(config.locales, ['es', 'ca']);
        } finally {
            fs.writeFileSync(file, original);
        }
    });

    it('produces nothing when the extraction is missing', () => {
        clearLocale('ca');
        fs.rmSync(path.join(root, 'src/locale/messages.xlf'), { force: true });
        const report = merge();
        assert.equal(report.status, 'skipped');
        assert.equal(report.issues[0].code, 'source-missing');
    });

    it('takes the message list and the sources from the extraction', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' }, nuevo: { source: 'Nuevo' } } }));
        write('messages.', 'ca', xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola obsoleto', target: 'Hola' } } }));

        const report = merge();
        assert.equal(report.status, 'merged');
        assert.match(report.content, /<source>Hola<\/source>/);
        assert.doesNotMatch(report.content, /Hola obsoleto/);
        // The catalog has no unit for it, so the message still exists and falls
        // back to the source text.
        assert.match(report.content, /<source>Nuevo<\/source>/);
        assert.equal(report.counts.source, 2);
    });

    it('keeps the custom target and ignores its stale source', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' } } }));
        write('messages.', 'ca', xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'Hola', target: 'Hola base' } } }));
        write(
            'custom_messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { saludo: { source: 'HOLA obsoleto', target: 'Hola custom' } } })
        );

        const report = merge();
        assert.match(report.content, /<target>Hola custom<\/target>/);
        assert.doesNotMatch(report.content, /HOLA obsoleto/);
        assert.equal(report.counts.custom, 1);
    });

    it('reports and drops a message the code no longer contains', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' } } }));
        write(
            'custom_messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { muerto: { source: 'Viejo', target: 'Vell' } } })
        );

        const report = merge();
        assert.doesNotMatch(report.content, /muerto/);
        const issue = report.issues.find((item) => item.code === 'custom-without-source');
        assert.ok(issue, 'expected a custom-without-source issue');
        assert.equal(issue.level, 'warning');
        assert.match(issue.message, /muerto/);
    });

    it('detects a translation whose placeholders the source dropped', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { total: { source: 'Total:' } } }));
        write(
            'messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { total: { source: 'Total:', target: 'Total: <x id="INPUT"/>' } } })
        );

        const report = merge();
        const issue = report.issues.find((item) => item.code === 'placeholder-mismatch');
        assert.ok(issue, 'expected a placeholder-mismatch issue');
        assert.equal(issue.level, 'error');
        assert.match(issue.message, /INPUT/);
    });

    it('keeps a translation that matches the current placeholders', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { total: { source: 'Total: <x id="INPUT"/>' } } }));
        write(
            'messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { total: { source: 'Total: <x id="INPUT"/>', target: 'Total: <x id="INPUT"/>' } } })
        );

        const report = merge();
        assert.equal(report.issues.filter((item) => item.code === 'placeholder-mismatch').length, 0);
        assert.match(report.content, /<target>\s*Total:/);
    });

    it('resets a rejected translation to the source text when asked to', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { total: { source: 'Total:' } } }));
        write(
            'messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { total: { source: 'Total:', target: 'Total: <x id="INPUT"/>' } } })
        );

        const report = merge('ca', { resetBroken: true });
        assert.doesNotMatch(report.content, /INPUT/);
        assert.ok(report.issues.some((item) => item.code === 'placeholder-reset'));
    });

    it('reports a translation that still equals its source', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { columnas: { source: 'Columnas de:' } } }));
        write(
            'messages.',
            'ca',
            xliff({ sourceLanguage: 'es', targetLanguage: 'ca', units: { columnas: { source: 'Columnas de:', target: 'Columnas de:' } } })
        );

        const report = merge();
        assert.ok(report.issues.some((item) => item.code === 'untranslated'));
    });

    it('normalizes the generated header of a legacy catalog', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'en-US', units: { saludo: { source: 'Hola' } } }));
        write('messages.', 'ca', xliff({ sourceLanguage: 'ca-ES', targetLanguage: '', units: { saludo: { source: 'Hola', target: 'Hola base' } } }));

        const report = merge();
        assert.match(
            report.content,
            /<file source-language="es" target-language="ca" datatype="plaintext" original="ng2.template">/
        );
        assert.ok(report.issues.some((item) => item.code === 'catalog-source-language'));
    });

    it('builds the locale from the source alone when there is no catalog', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' } } }));

        const report = merge();
        assert.equal(report.status, 'merged');
        assert.match(report.content, /<source>Hola<\/source>/);
        assert.ok(report.issues.some((item) => item.code === 'catalog-missing'));
        assert.ok(report.issues.some((item) => item.code === 'custom-missing'));
    });

    it('keeps only the first unit of a repeated id and reports it', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' } } }));
        write(
            'messages.',
            'ca',
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n' +
                '  <file source-language="es" datatype="plaintext" original="ng2.template">\n' +
                '    <body>\n' +
                '      <trans-unit id="saludo" datatype="html">\n        <source>Hola</source>\n        <target>Hola base</target>\n      </trans-unit>\n' +
                '      <trans-unit id="saludo" datatype="html">\n        <source>Hola</source>\n        <target>Hola duplicada</target>\n      </trans-unit>\n' +
                '    </body>\n  </file>\n</xliff>\n'
        );

        const report = merge();
        assert.equal((report.content.match(/<trans-unit\b/g) || []).length, 1);
        assert.ok(report.issues.some((item) => item.code === 'catalog-duplicate-id'));
    });

    it('reports a malformed catalog without breaking the run', () => {
        clearLocale('ca');
        writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' } } }));
        write(
            'messages.',
            'ca',
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">\n' +
                '  <file source-language="es" datatype="plaintext" original="ng2.template">\n' +
                '    <body>\n      <trans-unit id="saludo" datatype="html">\n        <source>Hola</source>\n        <target>Hola base</target>\n' +
                '    </body>\n  </file>\n</xliff>\n'
        );

        const report = merge();
        assert.equal(report.status, 'skipped');
        assert.equal(report.content, null);
        assert.ok(report.issues.some((item) => item.code === 'merge-failed'));
    });

    describe('seed', () => {
        it('creates a catalog from the extraction when there is none', () => {
            clearLocale('ca');
            writeSource(xliff({ sourceLanguage: 'es', units: { saludo: { source: 'Hola' }, total: { source: 'Total:' } } }));

            const result = seedLocale({ projectRoot: root, locale: 'ca', sourceLocale: 'es' });
            assert.equal(result.created, true);
            const seeded = fs.readFileSync(path.join(root, 'src/locale/messages.ca.xlf'), 'utf8');
            assert.match(seeded, /<source>Hola<\/source>/);
            assert.match(seeded, /<target>Hola<\/target>/);
            assert.equal(result.counts.added, 2);
        });

        it('keeps a compatible translation, resets a broken one and archives the old catalog', () => {
            clearLocale('ca');
            writeSource(
                xliff({
                    sourceLanguage: 'es',
                    units: { ok: { source: 'Hola' }, roto: { source: 'Total:' }, nuevo: { source: 'Nuevo' } },
                })
            );
            write(
                'messages.',
                'ca',
                xliff({
                    sourceLanguage: 'es',
                    targetLanguage: 'ca',
                    units: {
                        ok: { source: 'Hola', target: 'Hola base' },
                        roto: { source: 'Total:', target: 'Total: <x id="INPUT"/>' },
                        muerto: { source: 'Viejo', target: 'Vell' },
                    },
                })
            );

            const result = seedLocale({ projectRoot: root, locale: 'ca', sourceLocale: 'es' });
            assert.equal(result.created, false);
            const seeded = fs.readFileSync(path.join(root, 'src/locale/messages.ca.xlf'), 'utf8');
            assert.match(seeded, /<target>Hola base<\/target>/);
            assert.doesNotMatch(seeded, /INPUT/);
            assert.match(seeded, /<source>Nuevo<\/source>/);
            assert.doesNotMatch(seeded, /muerto/);
            assert.equal(result.counts.kept, 1);
            assert.equal(result.counts.reset, 1);
            assert.equal(result.counts.added, 1);
            assert.equal(result.counts.removed, 1);
            assert.ok(fs.existsSync(path.join(root, 'src/locale/legacy/messages.ca.xlf')));
        });

        it('produces a catalog the merge accepts without any repair', () => {
            clearLocale('ca');
            writeSource(xliff({ sourceLanguage: 'es', units: { ok: { source: 'Hola' }, roto: { source: 'Total:' } } }));
            write(
                'messages.',
                'ca',
                xliff({
                    sourceLanguage: 'es',
                    targetLanguage: 'ca',
                    units: { ok: { source: 'Hola', target: 'Hola base' }, roto: { source: 'Total:', target: 'Total: <x id="INPUT"/>' } },
                })
            );
            seedLocale({ projectRoot: root, locale: 'ca', sourceLocale: 'es' });

            const report = merge();
            assert.equal(report.issues.filter((item) => item.code === 'placeholder-mismatch').length, 0);
            assert.equal(report.status, 'merged');
        });
    });
});
