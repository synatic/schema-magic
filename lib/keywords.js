/**
 * @typedef {import('ajv').KeywordDefinition} KeywordDefinition
 * @typedef {import('ajv').Ajv} Ajv
 */

const Ajv = require('ajv');

const _jsonSchema = require('./jsonSchema.json');
const _jsonPatchSchema = require('./jsonPatch.json');

/**
 * Ajv instance for keyword validation
 * @type {Ajv}
 */
const ajv = new Ajv({
    format: 'full',
    useDefault: true,
    coerceTypes: true,
});

/**
 * Custom keywords for schema validation
 * @type {Object.<string, KeywordDefinition>}
 */
const keywords = {
    /**
     * Validates that a value is a valid JSON Schema
     * @type {KeywordDefinition}
     */
    jsonSchema: {
        type: 'object',
        validate: function (schema, data) {
            if (!data) {
                return true;
            }
            try {
                return ajv.validate(_jsonSchema, data);
            } catch (exp) {
                return false;
            }
        },
        metaSchema: {type: 'boolean'},
    },

    /**
     * Validates that a value is a valid JSON Patch
     * @type {KeywordDefinition}
     */
    jsonPatch: {
        type: 'object',
        validate: function (schema, data) {
            if (!data) {
                return true;
            }
            try {
                return ajv.validate(_jsonPatchSchema, data);
            } catch (exp) {
                return false;
            }
        },
        metaSchema: {type: 'boolean'},
    },
};

module.exports = keywords;
