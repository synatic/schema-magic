const assert = require('assert');

const FlatSchema = require('../index').FlatSchema;

describe('Flat Schema', function () {
    it('should merge schema parts the same', function () {
        assert.deepEqual(
            FlatSchema.mergeSchemaParts(
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'string',
                },
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'string',
                }
            ),
            {fieldName: 'a', format: null, fullPath: 'a', hasNull: false, instances: 1, path: '', stringLength: 3, type: 'string'},
            'Invalid result'
        );
    });

    it('should merge schema parts', function () {
        assert.deepEqual(
            FlatSchema.mergeSchemaParts(
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'string',
                },
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: true,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'integer',
                }
            ),
            {
                fieldName: 'a',
                format: null,
                fullPath: 'a',
                hasNull: true,
                instances: 1,
                path: '',
                stringLength: 3,
                type: ['string', 'integer'],
            },
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.mergeSchemaParts(
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 19,
                    type: 'date',
                },
                {
                    fieldName: 'a',
                    format: 'YYYY-MM-DD',
                    fullPath: 'a',
                    hasNull: true,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'date',
                },
                {
                    fieldName: 'a',
                    format: 'YYYYMMDD',
                    fullPath: 'a',
                    hasNull: true,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'date',
                }
            ),
            {
                fieldName: 'a',
                format: ['YYYY-MM-DD', 'YYYYMMDD'],
                fullPath: 'a',
                hasNull: true,
                instances: 1,
                path: '',
                stringLength: 19,
                type: 'date',
            },
            'Invalid result'
        );
    });

    it('should generate flattened schema for basic types', function () {
        assert.deepEqual(FlatSchema.generate(null), [], 'Invalid result');

        assert.deepEqual(
            FlatSchema.generate('a'),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 1,
                    type: 'string',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(''),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 0,
                    type: 'string',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(1),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: null,
                    type: 'integer',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(0),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: null,
                    type: 'integer',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(1.2),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: null,
                    type: 'number',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(true),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: null,
                    type: 'boolean',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(false),
            [
                {
                    fieldName: '',
                    format: null,
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: null,
                    type: 'boolean',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate('20201215'),
            [
                {
                    fieldName: '',
                    format: 'YYYYMMDD',
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 8,
                    type: 'date',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate('2020-12-15'),
            [
                {
                    fieldName: '',
                    format: 'YYYY-MM-DD',
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 10,
                    type: 'date',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate(new Date('2020-12-15')),
            [
                {
                    fieldName: '',
                    format: 'YYYY-MM-DDThhmmss.sssZ',
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: null,
                    type: 'timestamp',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate('2020-12-15 23:45:23'),
            [
                {
                    fieldName: '',
                    format: 'YYYY-MM-DD HH:mm:ss',
                    fullPath: '',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 19,
                    type: 'date-time',
                },
            ],
            'Invalid result'
        );
    });

    it('should generate flattened schema for complex type', function () {
        assert.deepEqual(
            FlatSchema.generate({a: 'abc'}),
            [
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'string',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate([{a: 'abc'}]),
            [
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: '[].a',
                    hasNull: false,
                    instances: 1,
                    path: '[]',
                    stringLength: 3,
                    type: 'string',
                },
            ],
            'Invalid result'
        );

        assert.deepEqual(
            FlatSchema.generate({a: 'abc', arr: [{b: 1}, {c: 2}, {b: 3, c: 'one'}]}),
            [
                {
                    fieldName: 'a',
                    format: null,
                    fullPath: 'a',
                    hasNull: false,
                    instances: 1,
                    path: '',
                    stringLength: 3,
                    type: 'string',
                },
                {
                    fieldName: 'b',
                    format: null,
                    fullPath: 'arr.[].b',
                    hasNull: false,
                    instances: 1,
                    path: 'arr.[]',
                    stringLength: 0,
                    type: 'integer',
                },
                {
                    fieldName: 'c',
                    format: null,
                    fullPath: 'arr.[].c',
                    hasNull: false,
                    instances: 1,
                    path: 'arr.[]',
                    stringLength: 3,
                    type: ['integer', 'string'],
                },
            ],
            'Invalid result'
        );
    });


    it('should validate schema part', function () {
        assert.deepEqual(FlatSchema.validateSchemaPart('abc',{
            type:'string'
        }),[],'Invalid Validation');
    });

});
