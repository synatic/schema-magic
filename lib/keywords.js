const Ajv = require('ajv');

const _jsonSchema = require('./jsonSchema.json');
const _jsonPatchSchema = require('./jsonPatch.json');

const ajv = new Ajv({
    format: 'full',
    useDefault: true,
    coerceTypes: true,
});

const keywords = {
    jsonSchema: {
        type: 'object',
        validate: function (schema, data) {
            if (!data) return true;
            try {
                const valid = ajv.validate(_jsonSchema, data);
                return valid;
            } catch (exp) {
                return false;
            }
        },
        metaSchema: {type: 'boolean'},
    },
    jsonPatch: {
        type: 'object',
        validate: function (schema, data) {
            if (!data) return true;
            try {
                const valid = ajv.validate(_jsonPatchSchema, data);
                return valid;
            } catch (exp) {
                return false;
            }
        },
        metaSchema: {type: 'boolean'},
    },
};

module.exports = keywords;
