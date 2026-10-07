const assert = require('assert');
const SchemaMagic = require('../index');

describe('Coerce Data', function () {
    const schema = {
        type: 'object',
        properties: {
            name: {type: 'string'},
            created: {type: 'string', format: 'date-time'},
            birthday: {type: 'string', format: 'date'},
            audit: {
                type: 'object',
                properties: {
                    modified: {type: 'string', format: 'date-time'},
                },
            },
            events: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        at: {type: 'string', format: 'date-time'},
                    },
                },
            },
        },
    };

    it('should return null when no data is specified', function () {
        assert.equal(SchemaMagic.coerceData(null, schema), null);
    });

    it('should throw when no schema is specified', function () {
        assert.throws(() => SchemaMagic.coerceData({}), /No Schema specified/);
    });

    it('should coerce date-time fields to dates', function () {
        const data = SchemaMagic.coerceData(
            {
                name: 'test',
                created: '2020-01-01T00:00:00Z',
                birthday: '2000-02-03',
                audit: {modified: '2021-05-05T10:00:00Z'},
                events: [{at: '2022-06-06T00:00:00Z'}, {at: '2023-07-07T12:30:00Z'}],
            },
            schema
        );

        assert.deepStrictEqual(data, {
            name: 'test',
            created: new Date('2020-01-01T00:00:00Z'),
            birthday: '2000-02-03',
            audit: {modified: new Date('2021-05-05T10:00:00Z')},
            events: [{at: new Date('2022-06-06T00:00:00Z')}, {at: new Date('2023-07-07T12:30:00Z')}],
        });
    });

    it('should leave data without date-time fields unchanged', function () {
        assert.deepStrictEqual(SchemaMagic.coerceData({name: 'test', events: []}, schema), {name: 'test', events: []});
    });

    it('should use the coerce fields on the schema when specified', function () {
        const data = SchemaMagic.coerceData(
            {created: '2020-01-01T00:00:00Z', other: '2021-05-05T10:00:00Z'},
            {coerceFields: [{path: '$.other'}]}
        );

        assert.deepStrictEqual(data, {created: '2020-01-01T00:00:00Z', other: new Date('2021-05-05T10:00:00Z')});
    });
});
