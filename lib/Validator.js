const Ajv = require('ajv');

const _jsonSchema = require('./jsonSchema.json');
const defaultFormatters = require('./formatters.js');
const defaultKeywords = require('./keywords.js');

class Validator {
    constructor(formatters, keywords, ajvOptions) {
        let options = {
            format: 'full',
        };
        if (ajvOptions) {
            options = ajvOptions;
        }

        const ajv = new Ajv(options);
        ajv.addMetaSchema(_jsonSchema);
        require('ajv-keywords')(ajv, ['switch']);

        for (const k in defaultFormatters) {
            if (!defaultFormatters.hasOwnProperty(k)) {
                continue;
            }
            ajv.addFormat(k, defaultFormatters[k]);
        }

        for (const k in defaultKeywords) {
            if (!defaultKeywords.hasOwnProperty(k)) {
                continue;
            }
            ajv.addKeyword(k, defaultKeywords[k]);
        }

        if (formatters) {
            for (const k in formatters) {
                if (!formatters.hasOwnProperty(k)) {
                    continue;
                }
                ajv.addFormat(k, formatters[k]);
            }
        }

        if (keywords) {
            for (const k in keywords) {
                if (!keywords.hasOwnProperty(k)) {
                    continue;
                }
                ajv.addKeyword(k, keywords[k]);
            }
        }

        this._ajv = ajv;
    }

    validate(document, schema) {
        // argument checks
        if (!document) {
            throw new Error('Missing document');
        }
        if (!schema) {
            throw new Error('Missing schema');
        }

        let valid = true;
        try {
            valid = this._ajv.validate(schema, document);
        } catch (exp) {
            return {message: 'Invalid Schema', Error: exp.message, statusCode: 400};
        }
        if (!valid) {
            return this._ajv.errors.map((doc) => {
                return {
                    message: doc.message,
                    dataPath: doc.dataPath,
                    keyword: doc.keyword,
                    schemaPath: doc.schemaPath,
                };
            });
        } else {
            return null;
        }
    }
}

module.exports = Validator;
