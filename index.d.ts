import Ajv, {JSONSchemaType, ValidateFunction, ErrorObject, Options} from 'ajv';

export interface ValidationError {
    message: string;
    dataPath: string;
    keyword: string;
    schemaPath: string;
}

export interface ValidationErrorWithStatus {
    message: string;
    Error: string;
    statusCode?: number;
}

/**
 * Will be an Error like object if the schema was invalid, an array of ValidationError objects if the schema was valid but the data had errors, or null if there are no errors.
 */
export type ValidationResult = ValidationError[] | null | ValidationErrorWithStatus;

export interface SchemaCoerceField {
    path: string;
    updatePath: string;
    format: string;
}

export interface FlattenedSchemaField {
    path: string;
    type: string;
    format?: string;
    isArray?: boolean;
    required?: boolean;
    [key: string]: any;
}

export interface SchemaFlattenOptions {
    format?: 'path' | 'dot';
    additionalProperties?: string[];
}

export interface SchemaSQLOptions {
    escape?: string | ((item: string) => string);
    schema?: string;
    separator?: string;
    beautify?: boolean;
    defaultType?: string;
    sqlTypes?: Array<{
        type: string;
        format?: string;
        sqlType: string;
    }>;
}

export interface SchemaConfig {
    copy?: boolean;
    deleteDefinitions?: boolean;
}

export interface ValidateWithParametersOptions {
    coerce?: boolean;
    showAllErrors?: boolean;
    paramIdentifier?: string;
}

export class Validator {
    constructor(formatters?: Record<string, any>, keywords?: Record<string, any>, ajvOptions?: Options);

    validate(document: any, schema: any): ValidationResult;
}

export function validate(document: any, schema: any, coerce?: boolean, showAllErrors?: boolean): ValidationResult;

export function validateWithParameters(document: any, schema: any, options?: ValidateWithParametersOptions): ValidationResult;

export function copy(schema: any): any;

export function coerceData(data: any, schema: any): any;

export function flattenSchema(schema: any, options?: SchemaFlattenOptions): FlattenedSchemaField[];

export function generateSQLTable(schema: any, tableName?: string, options?: SchemaSQLOptions): string | null;

export function generateSchemaFromJSON(obj: any): any;

export function mergeSchemas(schemas: any[]): any | null;

export function normalizeSchema(schema: any, options?: SchemaConfig, depth?: number): any;

export function getCoerceFields(schema: any): SchemaCoerceField[];

export const coreSchemas: {
    jsonSchema: any;
    jsonPatch: any;
};

export const sqlTypeMappings: any;

export const Validator: typeof Validator;

export class SchemaMagic {
    static validate: typeof validate;
    static validateWithParameters: typeof validateWithParameters;
    static copy: typeof copy;
    static coerceData: typeof coerceData;
    static flattenSchema: typeof flattenSchema;
    static generateSQLTable: typeof generateSQLTable;
    static generateSchemaFromJSON: typeof generateSchemaFromJSON;
    static mergeSchemas: typeof mergeSchemas;
    static normalizeSchema: typeof normalizeSchema;
    static getCoerceFields: typeof getCoerceFields;
    static get coreSchemas(): typeof coreSchemas;
    static get sqlTypeMappings(): typeof sqlTypeMappings;
    static get Validator(): typeof Validator;
}

export default SchemaMagic;
