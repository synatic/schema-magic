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
