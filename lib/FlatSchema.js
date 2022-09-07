const $json = require('@synatic/json-magic');
const $convert = require('@synatic/type-magic');

const $check = require('check-types');
const _ = require('underscore');

const _types = ['unknown', 'string', 'integer', 'number', 'boolean', 'date', 'date-time', 'timestamp'];

const _dateFormats = [
    {
        pattern: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
        format: 'YYYY-MM-DD',
        type: 'date',
    },
    {
        pattern: /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])$/,
        format: 'YYYYMMDD',
        type: 'date',
    },
    {
        pattern: /^\d\d\d\d-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01]) (00|[0-9]|1[0-9]|2[0-3]):([0-9]|[0-5][0-9]):([0-9]|[0-5][0-9])$/,
        format: 'YYYY-MM-DD HH:mm:ss',
        type: 'date-time',
    },
];

const _schemaPartSchema = {
    type: 'object',
    properties: {
        fieldName: {type: 'string'},
        path: {type: 'string'},
        fullPath: {type: 'string'},
        type: {type: 'string', enum: ['unknown', 'string', 'integer', 'number', 'boolean', 'date', 'date-time', 'timestamp']},
        stringLength: {type: ['integer', 'null']},
        instances: {type: ['integer', 'null']},
        hasNull: {type: 'boolean'},
        format: {type: ['string', 'null']},
    },
    required: ['type', 'fieldName', 'path', 'fullPath'],
};

class FlatSchema {
    /** Returns the available data types
     *
     * @return {string[]}
     */
    static get dataTypes() {
        return _types;
    }

    static get partSchema() {
        return _schemaPartSchema;
    }

    /** Merges n schemas together
     *
     * @param {object[]} schemas - the schemas to merge
     * @return {object[]} - the merged schemas
     */
    static mergeSchemas(...schemas) {
        function merge2Schemas(schema1, schema2) {
            const schema1Lookup = schema1.reduce((a, v) => {
                a[v.fullPath] = v;
                return a;
            }, {});
            const schema2Lookup = schema2.reduce((a, v) => {
                a[v.fullPath] = v;
                return a;
            }, {});

            const commonPaths = _.intersection(
                schema1.map((s) => s.fullPath),
                schema2.map((s) => s.fullPath)
            );
            const differencePaths = _.difference(
                schema1.map((s) => s.fullPath),
                schema2.map((s) => s.fullPath)
            );
            return differencePaths
                .map((d) => schema1Lookup[d] || schema2Lookup[d])
                .concat(commonPaths.map((c) => FlatSchema.mergeSchemaParts(schema1Lookup[c], schema2Lookup[c])));
        }

        let prevSchema = null;
        for (let i = 1; i < schemas.length; i++) {
            prevSchema = prevSchema || schemas[i - 1];
            const curSchema = schemas[i];

            if (!prevSchema || !$check.array(prevSchema)) {
                throw new Error('Initial Schema Not Defined');
            }

            if (!curSchema || !$check.array(curSchema)) {
                break;
            }

            prevSchema = merge2Schemas(prevSchema, curSchema);
        }

        return prevSchema;
    }

    /** Merges a schema part with the same full path
     *
     * @param {object} parts
     * @return {object}
     */
    static mergeSchemaParts(...parts) {
        let prevSchemaPart = null;
        for (let i = 1; i < parts.length; i++) {
            prevSchemaPart = prevSchemaPart || parts[i - 1];
            const curSchemaPart = parts[i];

            if (!prevSchemaPart || !$check.object(prevSchemaPart)) {
                throw new Error('Initial Part Not Defined');
            }

            if (!curSchemaPart || !$check.object(curSchemaPart)) {
                break;
            }

            if (prevSchemaPart.fullPath !== curSchemaPart.fullPath) {
                throw new Error(`Parts must have the same path: ${prevSchemaPart.fullPath} : ${curSchemaPart.fullPath}`);
            }

            const newType = _.uniq(
                ($check.array(prevSchemaPart.type) ? prevSchemaPart.type : [prevSchemaPart.type])
                    .concat($check.array(curSchemaPart.type) ? curSchemaPart.type : [curSchemaPart.type])
                    .filter((f) => f !== 'unknown')
            );

            const newFormat = _.uniq(
                ($check.array(prevSchemaPart.format) ? prevSchemaPart.format : [prevSchemaPart.format])
                    .concat($check.array(curSchemaPart.format) ? curSchemaPart.format : [curSchemaPart.format])
                    .filter((f) => f !== null)
            );

            prevSchemaPart = {
                fieldName: prevSchemaPart.fieldName,
                format: newFormat.length === 0 ? null : newFormat.length === 1 ? newFormat[0] : newFormat,
                fullPath: prevSchemaPart.fullPath,
                hasNull: prevSchemaPart.hasNull || curSchemaPart.hasNull,
                instances: Math.max(prevSchemaPart.instances, curSchemaPart.instances),
                path: prevSchemaPart.path,
                stringLength: Math.max(prevSchemaPart.stringLength, curSchemaPart.stringLength),
                type: newType.length > 1 ? newType : newType[0],
            };
        }

        return prevSchemaPart;
    }

    /** Generates a Flattened Schema from the provided object
     *
     * @param {*} obj - the object to generate a flattened schema from
     * @param {object} [options] - the generation options
     * @param {boolean} [options.ignoreCase] - ignore field name case
     * @return {object[]} - the flattened schema
     */
    static generate(obj, options) {
        const tempLookup = {};

        // workaround for json walk
        if (obj === false || obj === '' || obj === 0) {
            return [
                {
                    type: obj === false ? 'boolean' : obj === '' ? 'string' : obj === 0 ? 'integer' : 'unknown',
                    fieldName: '',
                    path: '',
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    format: null,
                    stringLength: obj === '' ? 0 : null,
                },
            ];
        }

        $json.walk(
            obj,
            (value, path) => {
                const pathParts = path.split('.');
                const newPath = fixPath(pathParts);
                const existingSchema = tempLookup[newPath];

                const curSchemaPart = {
                    type: 'unknown',
                    fieldName: pathParts[pathParts.length - 1],
                    path: newPath.slice(0, newPath.length - 1).join('.'),
                    fullPath: newPath.join('.'),
                    hasNull: false,
                    instances: 1,
                    format: null,
                    stringLength: null,
                };

                if (value === null) {
                    curSchemaPart.hasNull = true;
                } else if ($check.date(value)) {
                    curSchemaPart.type = 'timestamp';
                    curSchemaPart.format = 'YYYY-MM-DDThhmmss.sssZ';
                } else if ($check.string(value)) {
                    curSchemaPart.type = 'string';
                    curSchemaPart.stringLength = Math.max(curSchemaPart.stringLength || 0, value.length);
                    for (const dateFormat of _dateFormats) {
                        if (value.match(dateFormat.pattern)) {
                            curSchemaPart.type = dateFormat.type;
                            curSchemaPart.format = dateFormat.format;
                        }
                    }
                } else if ($check.integer(value)) {
                    curSchemaPart.type = 'integer';
                } else if ($check.number(value)) {
                    curSchemaPart.type = 'number';
                } else if ($check.boolean(value)) {
                    curSchemaPart.type = 'boolean';
                }
                if (existingSchema) {
                    tempLookup[newPath] = FlatSchema.mergeSchemaParts(existingSchema, curSchemaPart);
                } else {
                    tempLookup[newPath] = curSchemaPart;
                }
            },
            '.'
        );

        return Object.keys(tempLookup).map((t) => tempLookup[t]);
    }

    /** Validates a value against a schema part definition
     *
     * @param {*} value - the value to check against the schema part
     * @param {object} schemaPart - the schema part to validate against
     * @param {object} [options] - the validation options
     * @return {string[]} - the validations
     */
    static validateSchemaPart(value, schemaPart, options) {
        const validations = [];

        const valueType = $convert.getTypeName(value);
        const targetTypes = $check.array(schemaPart.type) ? [schemaPart.type] : schemaPart.type;

        if(valueType==='object'||valueType==='array'){
            
        }

        if(!targetTypes.includes('unknown')){

        }
        // check type


        // check format

        // check length

        // check null

        return validations;
    }

    /** Validates an object against a schema
     *
     * @param {*} data - the data to validate
     * @param {object[]} schema - the flat schema
     * @param {object} [options] - the options
     */
    static validate(data, schema, options) {
        const schemaLookup = schema.reduce((a, v) => {
            a[v.fullPath] = v;
            return a;
        }, {});

        $json.walk(data, (value, path) => {
            const newPath = fixPath(path);
            const schemaPart = schemaLookup[newPath];
        });
    }

    static compareSchemas(schema1, schema2, options) {}
}

function fixPath(path) {
    if ($check.array(path)) {
        return path.map((p) => (parseInt(p) >= 0 ? '[]' : p));
    } else {
        return path.split('.').map((p) => (parseInt(p) >= 0 ? '[]' : p));
    }
}

module.exports = FlatSchema;
