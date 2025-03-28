/**
 * @typedef {import('../index').ValidationError} ValidationError
 * @typedef {import('../index').ValidationErrorWithStatus} ValidationErrorWithStatus
 * @typedef {import('../index').ValidationResult} ValidationResult
 * @typedef {import('../index').SchemaCoerceField} SchemaCoerceField
 * @typedef {import('../index').FlattenedSchemaField} FlattenedSchemaField
 * @typedef {import('../index').SchemaFlattenOptions} SchemaFlattenOptions
 * @typedef {import('../index').SchemaSQLOptions} SchemaSQLOptions
 * @typedef {import('../index').SchemaConfig} SchemaConfig
 * @typedef {import('../index').ValidateWithParametersOptions} ValidateWithParametersOptions
 * @typedef {import('../index').CoreSchemas} CoreSchemas
 */

const $types = require('@synatic/type-magic');
const $json = require('@synatic/json-magic');
const {JSONPath} = require('jsonpath-plus');
const $copy = require('clone-deep');
const Ajv = require('ajv');
const $check = require('check-types');
const _s = require('underscore.string');
const _ = require('underscore');

const Validator = require('./Validator.js');

const _jsonSchema = require('./jsonSchema.json');
const _jsonPatchSchema = require('./jsonPatch.json');
const _sqlTypeMapping = require('./SQLTypeMappings.json');
const _keywords = require('./keywords.js');
const _formatters = require('./formatters.js');

const _ajv = new Ajv({
    format: 'full',
});

_ajv.addMetaSchema(_jsonSchema);
require('ajv-keywords')(_ajv, ['switch']);

const _ajvCoerce = new Ajv({
    format: 'full',
    coerceTypes: true,
});

_ajvCoerce.addMetaSchema(_jsonSchema);
require('ajv-keywords')(_ajvCoerce, ['switch']);

const _ajvAllErrors = new Ajv({
    format: 'full',
    allErrors: true,
});

_ajvAllErrors.addMetaSchema(_jsonSchema);
require('ajv-keywords')(_ajvAllErrors, ['switch']);

const _ajvCoerceAllErrors = new Ajv({
    format: 'full',
    coerceTypes: true,
    allErrors: true,
});

_ajvCoerceAllErrors.addMetaSchema(_jsonSchema);
require('ajv-keywords')(_ajvCoerceAllErrors, ['switch']);

for (const k in _formatters) {
    if (!_formatters.hasOwnProperty(k)) {
        continue;
    }
    _ajv.addFormat(k, _formatters[k]);
    _ajvCoerce.addFormat(k, _formatters[k]);
    _ajvAllErrors.addFormat(k, _formatters[k]);
    _ajvCoerceAllErrors.addFormat(k, _formatters[k]);
}

for (const k in _keywords) {
    if (!_keywords.hasOwnProperty(k)) {
        continue;
    }
    _ajv.addKeyword(k, _keywords[k]);
    _ajvCoerce.addKeyword(k, _keywords[k]);
    _ajvAllErrors.addKeyword(k, _keywords[k]);
    _ajvCoerceAllErrors.addKeyword(k, _keywords[k]);
}

/**
 * Schema Magic main class - provides utilities for working with JSON Schema
 * @class
 */
class SchemaMagic {
    /**
     * Validate a schema to a document
     * @param {*} document - The document/value to validate
     * @param {object} schema - the schema to validate against
     * @param {boolean} [coerce] - coerce values in the document to the types specified in the schema
     * @param {boolean} [showAllErrors] - show all errors instead of only the first one
     * @returns {ValidationResult} Validation errors or null if valid
     */
    static validate(document, schema, coerce, showAllErrors) {
        // argument checks
        if (!document) {
            throw new Error('No Document specified');
        }
        if (!schema) {
            throw new Error('No Schema specified');
        }

        let localAjv = _ajv;
        if (coerce && showAllErrors) {
            localAjv = _ajvCoerceAllErrors;
        } else if (coerce) {
            localAjv = _ajvCoerce;
        } else if (showAllErrors) {
            localAjv = _ajvAllErrors;
        }

        let valid = true;
        try {
            valid = localAjv.validate(schema, document);
        } catch (exp) {
            return {message: 'Invalid Schema', Error: exp.message};
        }
        if (!valid) {
            return localAjv.errors.map((doc) => {
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

    /**
     * Validate a schema ignoring parameters (values starting with@
     * @param {*} document - The document/value to validate
     * @param {object} schema - the schema to validate against
     * @param {ValidateWithParametersOptions} [options] - The options
     * @returns {ValidationResult} Validation errors or null if valid
     */
    static validateWithParameters(document, schema, options) {
        const paramPaths = [];
        options = options || {};
        if (!options.paramIdentifier) {
            options.paramIdentifier = '@';
        }

        $json.walk(
            document,
            (value, path) => {
                if (value && value.substring && value.substring(0, 1) === options.paramIdentifier) {
                    paramPaths.push(path);
                }
            },
            '.'
        );

        if (paramPaths.length > 0) {
            const workingSchema = $copy(schema);

            for (const paramPath of paramPaths) {
                const splitPaths = paramPath.split('.');
                const schemaPaths = [];
                let suffix = '';
                let isArray = false;
                for (const splitPath of splitPaths) {
                    if (!isNaN(parseInt(splitPath))) {
                        schemaPaths.push('items');
                        suffix = '.type';
                        isArray = true;
                    } else {
                        schemaPaths.push('properties.' + splitPath);
                    }
                }
                const schemaPath = schemaPaths.join('.') + suffix;

                try {
                    const curSchema = $json.get(workingSchema, schemaPath);
                    let replacement = {type: 'string'};
                    if (isArray) {
                        if ($check.array(curSchema)) {
                            replacement = _.uniq(curSchema.concat(['string']));
                        } else {
                            replacement = _.uniq([curSchema, 'string']);
                        }
                    }
                    $json.set(workingSchema, schemaPath, replacement);
                } catch (exp) {
                    // path does not exist, ignore...
                }
            }
            return SchemaMagic.validate(document, workingSchema, options.coerce, options.showAllErrors);
        } else {
            return SchemaMagic.validate(document, schema, options.coerce, options.showAllErrors);
        }
    }

    /**
     * Copy a schema
     * @param {object} schema - The schema to copy
     * @returns {*} The copied schema
     */
    static copy(schema) {
        if (!schema) {
            throw new Error('No Schema specified');
        }
        return $copy(schema);
    }

    /**
     * Coerces a value to the provided schema
     * @param {*} data - the value to coerce
     * @param {object} schema - the schema to coerce against
     * @returns {null|*} The coerced data or null
     */
    static coerceData(data, schema) {
        if (!data) {
            return null;
        }
        if (!schema) {
            throw new Error('No Schema specified');
        }

        /**
         *
         * @param path
         */
        function pathToPointer(path) {
            path = path.replace('$', '');
            const retArr = [];

            path.replace(/\[(.+?)\]/g, function ($0, $1) {
                retArr.push($1.replace("'", '').replace("'", ''));
            });

            return '/' + retArr.join('/');
        }

        let coerceFields = null;
        if (schema.coerceFields) {
            coerceFields = schema.coerceFields;
        } else {
            coerceFields = SchemaMagic.getCoerceFields(schema);
        }

        for (let i = 0; i < coerceFields.length; i++) {
            const values = JSONPath.eval(data, coerceFields[i].path, {resultType: 'PATH'});
            for (let j = 0; j < values.length; j++) {
                const pointer = pathToPointer(values[j]);
                const value = $json.get(data, pointer);
                $json.set(data, pointer, new Date(value));

                //
            }
        }

        return data;
    }

    /**
     * Flattens a schema returning an array of paths to access elements of an object
     * @param {object} schema - the schema to validate against
     * @param {SchemaFlattenOptions} [options] - The options
     * @returns {FlattenedSchemaField[]|[]|*} Flattened schema paths
     */
    static flattenSchema(schema, options) {
        if (!schema) {
            return schema;
        }
        options = options || {};
        const sep = options.format === 'path' ? '/' : '.';
        options.additionalProperties = $check.array(options.additionalProperties) ? options.additionalProperties : [];
        const paths = [];
        const traverseSchema = (curSchema, curPath, isArray, isRequired) => {
            if (!curSchema) {
                return;
            }

            if (curSchema.type === 'array') {
                if (curSchema.items) {
                    traverseSchema(curSchema.items, curPath.concat(['n']), true, isRequired);
                } else {
                    const retSchema = {
                        path: $json.compilePath(curPath.concat(['n']), sep),
                        isArray: true,
                        type: curSchema.type,
                        required: !!isRequired,
                    };

                    paths.push(retSchema);
                }
            } else if (curSchema.type === 'object') {
                if (curSchema.properties) {
                    for (const propName in curSchema.properties) {
                        if (!curSchema.properties.hasOwnProperty(propName)) {
                            continue;
                        }
                        traverseSchema(
                            curSchema.properties[propName],
                            curPath.concat([propName]),
                            isArray,
                            isRequired || (curSchema.required && curSchema.required.indexOf(propName) > -1)
                        );
                    }
                } else {
                    const retSchema = {
                        path: $json.compilePath(curPath, sep),
                        type: curSchema.type,
                        isArray: !!isArray,
                        required: !!isRequired,
                    };
                    paths.push(retSchema);
                }
            } else {
                const retSchema = {
                    path: $json.compilePath(curPath, sep),
                    type: curSchema.type || 'object',
                    format: curSchema.format,
                    isArray: !!isArray,
                    required: !!isRequired,
                };
                options.additionalProperties.forEach((p) => {
                    if ($check.assigned(curSchema[p])) {
                        retSchema[p] = curSchema[p];
                    }
                });
                paths.push(retSchema);
            }
        };

        if (!$check.object(schema)) {
            return [{path: '', type: $types.getTypeName(schema)}];
        }

        traverseSchema(schema, []);

        return paths;
    }

    /**
     * Generates SQL table creation script from schema
     * @param {object} schema - the schema to generate SQL from
     * @param {string} [tableName] - the name of the table to create
     * @param {SchemaSQLOptions} [options] - options for SQL generation
     * @returns {string|null} SQL creation script or null
     */
    static generateSQLTable(schema, tableName, options) {
        if (!schema) {
            return null;
        }
        options = options || {};
        options.escape = options.escape || '[]';
        options.schema = options.schema || 'dbo';
        options.separator = options.separator || '_';
        options.beautify = $check.assigned(options.beautify) ? options.beautify : true;
        options.defaultType = options.defaultType || 'varchar(255)';

        let charFunc = null;
        if ($check.function(options.escape)) {
            charFunc = options.escape;
        } else if (options.escape === '`') {
            charFunc = (item) => {
                return '`' + item + '`';
            };
        } else if (options.escape === '[]') {
            charFunc = (item) => {
                return '[' + item + ']';
            };
        } else if (options.escape) {
            charFunc = (item) => {
                return options.escape + item + options.escape;
            };
        }

        tableName = tableName || schema.name || schema.title || 'Table1';

        const sqlTypes = options.sqlTypes || _sqlTypeMapping;

        const flattenedSchema = SchemaMagic.flattenSchema(schema);
        const cols = [];
        for (const path of flattenedSchema) {
            let colName = path.path.replace(/\./g, options.separator);
            if (options.beautify) {
                colName = _s.titleize(_s.humanize(colName));
            }
            colName = charFunc(colName);
            let colType = sqlTypes.filter((t) => {
                return t.type === path.type && (path.format ? t.format === path.format : true);
            })[0];
            colType = colType ? colType.sqlType : options.defaultType;

            cols.push(colName + ' ' + colType + (path.required ? ' NOT' : '') + ' NULL');
        }

        return 'CREATE TABLE ' + charFunc(options.schema) + '.' + charFunc(tableName) + '(\r\n' + cols.join(',\r\n') + ');';
    }

    // todo: required
    // todo: ranges
    // todo: formats like cron, email etc.
    // todo enums
    /**
     * Generates a JSON schema from a JSON object
     * @param {*} obj - the object to generate a schema from
     * @returns {object} Generated schema
     */
    static generateSchemaFromJSON(obj) {
        const generateSchemaPart = (partObj) => {
            if (partObj === null) {
                return {type: 'null'};
            } else if ($check.array(partObj)) {
                return {
                    type: 'array',
                    items: SchemaMagic.mergeSchemas(
                        partObj.map((i) => {
                            return generateSchemaPart(i);
                        })
                    ),
                };
            } else if (
                $check.object(partObj) &&
                partObj.constructor &&
                partObj.constructor.name &&
                partObj.constructor.name.toLowerCase() === 'objectid' &&
                partObj.id
            ) {
                return {
                    type: 'string',
                    format: 'mongoid',
                };
            } else if ($check.object(partObj) && partObj._bsontype && partObj._bsontype.toLowerCase() === 'objectid' && partObj._id) {
                return {
                    type: 'string',
                    format: 'mongoid',
                };
            } else if (
                $check.object(partObj) &&
                partObj._bsontype &&
                partObj._bsontype.toLowerCase() === 'objectid' &&
                Buffer.isBuffer(partObj.id) &&
                partObj.id.length === 12
            ) {
                return {
                    type: 'string',
                    format: 'mongoid',
                };
            } else if ($check.object(partObj)) {
                const schemaPart = {
                    type: 'object',
                    properties: {},
                };
                for (const k in partObj) {
                    if (!partObj.hasOwnProperty(k)) {
                        continue;
                    }
                    schemaPart.properties[k] = generateSchemaPart(partObj[k]);
                }
                return schemaPart;
            } else if ($check.date(partObj)) {
                return {type: 'string', format: 'date-time'};
            } else if ($check.string(partObj)) {
                return {type: 'string', stringLength: partObj.length};
            } else if ($check.integer(partObj)) {
                return {type: 'integer'};
            } else if ($check.number(partObj)) {
                return {type: 'number'};
            } else if ($check.boolean(partObj)) {
                return {type: 'boolean'};
            } else if (Buffer.isBuffer(partObj)) {
                return {type: 'string'};
            } else {
                return {type: 'unspecified'};
            }
        };

        return generateSchemaPart(obj);
    }

    /**
     * Merges an array of schemas into a single schema
     * @param {object[]} schemas - an array of schemas to merge
     * @returns {null|*} Merged schema or null
     */
    static mergeSchemas(schemas) {
        if (!schemas || schemas.length === 0) {
            return null;
        }

        schemas = schemas.filter((s) => !!s);
        if (schemas.length === 1) {
            return schemas[0];
        }

        const hasType = (schemaType, searchType) => {
            if ($check.array(schemaType)) {
                return schemaType.indexOf(searchType) > -1;
            } else {
                return schemaType === searchType;
            }
        };

        return schemas.reduce((mergedSchema, curSchema) => {
            const mergePart = (schemaPart, curPath) => {
                if (!schemaPart) {
                    return;
                }
                if (!$json.has(mergedSchema, curPath)) {
                    $json.set(mergedSchema, curPath, schemaPart);
                    return;
                }
                const curMergePart = $json.get(mergedSchema, curPath);
                if (schemaPart.type === 'object' && !hasType(curMergePart.type, 'object')) {
                    // if its an object, it gets prefence
                    curMergePart.type = 'object';
                    curMergePart.properties = schemaPart.properties;
                }
                if (schemaPart.type === 'object' && hasType(curMergePart.type, 'object') && schemaPart.properties) {
                    // merge in any strange properties
                    for (const k in schemaPart.properties) {
                        if (!schemaPart.properties.hasOwnProperty(k)) {
                            continue;
                        }
                        mergePart(schemaPart.properties[k], curPath.concat(['properties', k]));
                    }
                } else if (schemaPart.type === 'array' && !hasType(curMergePart.type, 'array')) {
                    mergePart(schemaPart.items, curPath.concat(['items']));
                } else if (schemaPart.type === 'array' && hasType(curMergePart.type, 'array')) {
                    // if its an array, it gets prefence
                    curMergePart.type = 'array';
                    mergePart(schemaPart.items, curPath.concat(['items']));
                } else if (schemaPart.type && curMergePart.type) {
                    let types = _.union(
                        $check.array(curMergePart.type) ? curMergePart.type : [curMergePart.type],
                        $check.array(schemaPart.type) ? schemaPart.type : [schemaPart.type]
                    );
                    if (types.length === 1) {
                        types = types[0];
                    }
                    if (_.difference(types, ['integer', 'number']).length === 0) {
                        types = 'number';
                    }
                    if (schemaPart.stringLength || curMergePart.stringLength) {
                        curMergePart.stringLength = Math.max(schemaPart.stringLength || 0, curMergePart.stringLength || 0);
                    }
                    curMergePart.type = types;
                } else {
                    return;
                }
            };
            mergePart(curSchema, []);
            return mergedSchema;
        });
    }

    /**
     * Normalizes a schema by resolving $refs and other operations
     * @param {object} schema - the schema to normalize
     * @param {SchemaConfig} [options] - normalization options
     * @param {number} [depth] - recursion depth
     * @returns {object} Normalized schema
     */
    static normalizeSchema(schema, options, depth) {
        if (!schema) {
            throw new Error('No Schema specified');
        }
        const propPaths = [];
        let workingSchema = schema;
        if (!options) {
            options = {};
        }
        if (options.copy) {
            workingSchema = $copy(schema);
        }

        $json.walk(schema, function (value, path) {
            const parsedPath = $json.parsePath(path);
            if (parsedPath[parsedPath.length - 1] === '$ref') {
                parsedPath.pop();
                propPaths.push({
                    path: $json.compilePath(parsedPath),
                    ref: value ? value.substring(1) : null,
                });
            }
        });

        for (const propPath of propPaths) {
            const repVal = $json.get(workingSchema, propPath.ref);
            $json.set(workingSchema, propPath.path, repVal);
        }

        if (!depth) {
            depth = 0;
        }
        if (depth < 1) {
            depth++;
            workingSchema = SchemaMagic.normalizeSchema(workingSchema, null, depth);
        }

        if (options.deleteDefinitions) {
            delete workingSchema.definitions;
        }

        // do it again

        return workingSchema;
    }

    /**
     * Gets fields that should be coerced based on schema
     * @param {object} schema - the schema to analyze
     * @returns {SchemaCoerceField[]} Array of coerce field objects
     */
    static getCoerceFields(schema) {
        if (!schema) {
            throw new Error('No Schema specified');
        }
        const coerceFields = [];
        getFieldsRecursive(schema.properties, '$', '');

        /**
         *
         * @param obj
         * @param currentPath
         * @param currentPointer
         */
        function getFieldsRecursive(obj, currentPath, currentPointer) {
            for (const key in obj) {
                if (!obj.hasOwnProperty(key)) {
                    continue;
                }

                if (obj[key].type === 'object') {
                    if (obj[key].properties) {
                        getFieldsRecursive(obj[key].properties, currentPath + '.' + key, currentPointer + '/' + key);
                    }
                } else if (obj[key].type === 'array' && obj[key].items && obj[key].items.type === 'object') {
                    getFieldsRecursive(obj[key].items.properties, currentPath + '.' + key + '[*]', currentPointer + '/' + key + '[*]');
                } else {
                    if (obj[key].format && obj[key].format === 'date-time') {
                        coerceFields.push({
                            path: currentPath + '.' + key,
                            updatePath: currentPointer + '/' + key,
                            format: obj[key].format,
                        });
                    }
                }
            }
        }

        return coerceFields;
    }

    /**
     * Gets the core schemas
     * @returns {CoreSchemas} Core schemas
     */
    static get coreSchemas() {
        return {
            jsonSchema: _jsonSchema,
            jsonPatch: _jsonPatchSchema,
        };
    }

    /**
     * Gets the SQL type mappings
     * @returns {object} SQL type mappings
     */
    static get sqlTypeMappings() {
        return _sqlTypeMapping;
    }

    /**
     * Gets the Validator class
     * @returns {typeof Validator} Validator class
     */
    static get Validator() {
        return Validator;
    }
}

module.exports = SchemaMagic;
