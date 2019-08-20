const assert = require('assert');
const SchemaMagic=require('../index');
const $mongoId=require('bson-objectid');

describe('Schema Magic', function() {

    describe('Flatten Schema', function() {
        it('should not flatten an empty schema', function () {
           assert(!SchemaMagic.flattenSchema(),"Invalid result")
        });


        it('should not flatten an empty schema', function () {
            assert.deepEqual(SchemaMagic.flattenSchema("a"),[{path:"",type:"string"}],"Invalid flatten")
        });

        it('should flatten a schema without any type specifier', function () {
            assert.deepEqual(SchemaMagic.flattenSchema({}),[{path:"",type:"object",format:undefined,isArray:false,required:false}],"Invalid flatten")
        });

        it('should flatten a schema with only object', function () {
            assert.deepEqual(SchemaMagic.flattenSchema({type:"object"}),[{path:"",type:"object",isArray:false,required:false}],"Invalid flatten")
        });

        it('should flatten a schema', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{type:"string"}
                }
            };

            let output=[
                {
                    path:"val1",
                    type:"integer",
                    format:undefined,
                    isArray:false,
                    required:false
                },
                {
                    path:"val2",
                    type:"string",
                    format:undefined,
                    isArray:false,
                    required:false
                }
            ];
            assert.deepEqual(SchemaMagic.flattenSchema(schema),output,"Invalid flatten")
        });

        it('should flatten a schema with required', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{type:"string"}
                },
                required:["val1"]
            };

            let output=[
                {
                    path:"val1",
                    type:"integer",
                    format:undefined,
                    isArray:false,
                    required:true
                },
                {
                    path:"val2",
                    type:"string",
                    format:undefined,
                    isArray:false,
                    required:false
                }
            ];
            assert.deepEqual(SchemaMagic.flattenSchema(schema),output,"Invalid flatten")
        });


        it('should flatten a nested schema', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{
                        type:"object",
                        properties:{
                            "a":{type:"number"},
                            b:{type:"string"}
                        }
                    }
                }
            };

            let output=[
                {
                    path:"val1",
                    type:"integer",
                    format:undefined,
                    isArray:false,
                    required:false
                },
                {
                    path:"val2.a",
                    type:"number",
                    format:undefined,
                    isArray:false,
                    required:false
                },
                {
                    path:"val2.b",
                    type:"string",
                    format:undefined,
                    isArray:false,
                    required:false
                }
            ];
            assert.deepEqual(SchemaMagic.flattenSchema(schema),output,"Invalid flatten")
        });

        it('should flatten a nested schema with required', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{
                        type:"object",
                        properties:{
                            "a":{type:"number"},
                            b:{type:"string"}
                        }
                    }
                },
                required:["val2"]
            };

            let output=[
                {
                    path:"val1",
                    type:"integer",
                    format:undefined,
                    isArray:false,
                    required:false
                },
                {
                    path:"val2.a",
                    type:"number",
                    format:undefined,
                    isArray:false,
                    required:true
                },
                {
                    path:"val2.b",
                    type:"string",
                    format:undefined,
                    isArray:false,
                    required:true
                }
            ];
            assert.deepEqual(SchemaMagic.flattenSchema(schema),output,"Invalid flatten")
        });

        it('should flatten an array', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{
                        type:"array",
                        items:{
                            type:"string"
                        }
                    }
                }
            };

            let output=[
                {
                    path:"val1",
                    type:"integer",
                    format:undefined,
                    isArray:false,
                    required:false
                },
                {
                    path:"val2.n",
                    type:"string",
                    format:undefined,
                    isArray:true,
                    required:false
                }
            ];
            assert.deepEqual(SchemaMagic.flattenSchema(schema),output,"Invalid flatten")
        });

        it('should flatten an array with objects', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{
                        type:"array",
                        items:{
                            type:"object",
                            properties:{
                                "a":{type:"number"},
                                b:{type:"string",format:"date-time"}
                            }
                        }
                    }
                }
            };

            let output=[
                {
                    path:"val1",
                    type:"integer",
                    format:undefined,
                    isArray:false,
                    required:false
                },
                {
                    path:"val2.n.a",
                    type:"number",
                    format:undefined,
                    isArray:true,
                    required:false
                },
                {
                    path:"val2.n.b",
                    type:"string",
                    format:"date-time",
                    isArray:true,
                    required:false
                }
            ];
            assert.deepEqual(SchemaMagic.flattenSchema(schema),output,"Invalid flatten")
        });

    });

    describe('Generate SQL Table', function() {
        it('should not generate an empty schema', function () {
            assert(!SchemaMagic.generateSQLTable(),"Invalid result")
        });

        it('should generate a sql table', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"string"},
                    val2:{type:"integer"},
                    val3:{type:"string",format:"date-time"},
                    val4:{type:"number"},
                    val5:{type:"boolean"}
                },
                required:["val1","val2"]
            };

            let output="CREATE TABLE [dbo].[Table1](\r\n" +
                "[Val1] varchar(255) NOT NULL,\r\n" +
                "[Val2] int NOT NULL,\r\n" +
                "[Val3] datetime NULL,\r\n" +
                "[Val4] varchar(255) NULL,\r\n" +
                "[Val5] bit NULL);";

            assert.deepEqual(SchemaMagic.generateSQLTable(schema),output,"Invalid result")
        });

        it('should generate a sql table options', function () {
            let schema={
                type:"object",
                properties:{
                    val1:{type:"string"},
                    val2:{
                        type:"object",
                        properties:{
                            val3:{type:"string",format:"date-time"},
                            val4:{type:"number"},
                            val5:{type:"boolean"}
                        },
                        required:["val3"]
                    }

                },
                required:["val1"]
            };

            let output="CREATE TABLE [dbo].[Test Table](\r\n" +
                "[val1] varchar(255) NOT NULL,\r\n" +
                "[val2_val3] datetime NOT NULL,\r\n" +
                "[val2_val4] varchar(255) NULL,\r\n" +
                "[val2_val5] bit NULL);";

            assert.deepEqual(SchemaMagic.generateSQLTable(schema,"Test Table",{beautify:false}),output,"Invalid result")
        });
    });

    describe('JSON Generate', function() {
        

        it('generate a simple schema', function () {
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON(null),{type:"null"},"Invalid schema generate");
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON("abc"),{type:"string"},"Invalid schema generate");
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON(1),{type:"integer"},"Invalid schema generate");
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON(new Date()),{type:"string",format:"date-time"},"Invalid schema generate");
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON(1.2),{type:"number"},"Invalid schema generate");
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON(false),{type:"boolean"},"Invalid schema generate");
        });

        it('generate a schema from mongo', function () {
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON($mongoId()),{type:"string",format:"mongoid"},"Invalid schema generate");
        });

        it('generate a schema with buffer', function () {
            assert.deepEqual(SchemaMagic.generateSchemaFromJSON(Buffer.from("abc")),{type:"string"},"Invalid schema generate");
        });

        it('generate a complex schema', function () {
            let obj={
                "id": 2,
                "name": "An ice sculpture",
                "price": 12.50,
                "tags": ["cold", "ice"],
                "dimensions": {
                    "length": 7.0,
                    "width": 12.0,
                    "height": 9.5
                },
                "warehouseLocation": {
                    "latitude": -78.75,
                    "longitude": 20.4
                }
            };

            let obj2= {
                "id": 3,
                "name": "A blue mouse",
                "price": 25.50,
                "dimensions": {
                    "length": 3.1,
                    "width": 1.0,
                    "height": 1.0
                },
                "warehouseLocation": {
                    "latitude": 54.4,
                    "longitude": -32.7
                }
            };

            let result={
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer"
                    },
                    "name": {
                        "type": "string"
                    },
                    "price": {
                        "type": "number"
                    },
                    "tags": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "dimensions": {
                        "type": "object",
                        "properties": {
                            "length": {
                                "type": "number"
                            },
                            "width": {
                                "type": "integer"
                            },
                            "height": {
                                "type": "number"
                            }
                        }
                    },
                    "warehouseLocation": {
                        "type": "object",
                        "properties": {
                            "latitude": {
                                "type": "number"
                            },
                            "longitude": {
                                "type": "number"
                            }
                        }
                    }
                }

            };

            let x=SchemaMagic.generateSchemaFromJSON(obj);
            let y=SchemaMagic.generateSchemaFromJSON(obj2);
            assert.deepEqual(SchemaMagic.mergeSchemas([x,y]), result, "Invalid schema generate");
        });
    });

    describe('Merge Schemas', function() {

        it('should merge a singel schema', function () {
            let schemas=[
                {type:"string"}
            ];

            let result={
                type:"string"
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge a null schema', function () {
            let schemas=[
                {type:"string"},
                null
            ];

            let result={
                type:"string"
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge a no schema', function () {
            let schemas=[ ];

            let result=null;
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge a simple schema 1', function () {
            let schemas=[
                {type:"string"},
                {type:"string"}
            ];

            let result={
                type:"string"
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge a simple schema 2', function () {
            let schemas=[
                {type:"string"},
                {type:"integer"}
            ];

            let result={
                type:["string","integer"]
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge an object schema 1', function () {
            let schemas=[
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"}
                    }
                },
                {
                    type:"object",
                    properties:{
                        val2:{type:"integer"}
                    }
                }
            ];

            let result={
                type:"object",
                properties:{
                    val1:{type:"string"},
                    val2:{type:"integer"}
                }
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge an object schema 2', function () {
            let schemas=[
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"}
                    }
                },
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"},
                        val2:{type:"integer"}
                    }
                }
            ];

            let result={
                type:"object",
                properties:{
                    val1:{type:"string"},
                    val2:{type:"integer"}
                }
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge an object schema 3', function () {
            let schemas=[
                {
                    type:"object",
                    properties:{
                        val1:{type:["string"]}
                    }
                },
                {
                    type:"object",
                    properties:{
                        val1:{type:"integer"},
                        val2:{type:"integer"}
                    }
                }
            ];

            let result={
                type:"object",
                properties:{
                    val1:{type:["string","integer"]},
                    val2:{type:"integer"}
                }
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge a simple schema with numbers', function () {
            let schemas=[
                {type:"integer"},
                {type:"number"}
            ];

            let result={
                type:"number"
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge equal', function () {
            let schemas=[
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"},
                        val2:{
                            type:"array",
                            items:{
                                type:"string"}
                        },
                        val3:{
                            type:"object",
                            properties:{
                                val4:{type:"string",format:"date-time"}  ,
                                val5:{type:"number"}
                            }
                        }
                    }
                },
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"},
                        val2:{
                            type:"array",
                            items:{
                                type:"string"}
                        },
                        val3:{
                            type:"object",
                            properties:{
                                val4:{type:"string",format:"date-time"}  ,
                                val5:{type:"number"}
                            }
                        }
                    }
                }
            ];

            let result={
                type:"object",
                properties:{
                    val1:{type:"string"},
                    val2:{
                        type:"array",
                        items:{
                            type:"string"}
                    },
                    val3:{
                        type:"object",
                        properties:{
                            val4:{type:"string",format:"date-time"}  ,
                            val5:{type:"number"}
                        }
                    }
                }
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });

        it('should merge array', function () {
            let schemas=[
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"},
                        val2:{
                            type:"array",
                            items:{
                                type:"string"
                            }
                        },
                        val3:{
                            type:"array",
                            items:{
                                type:"array",
                                items:{
                                    type:"object",
                                    properties:{
                                        valArr1:{type:"string"}
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    type:"object",
                    properties:{
                        val1:{type:"string"},
                        val2:{
                            type:"array",
                            items:{
                                type:"object",
                                properties:{
                                    arrVal1:{type:"number"},
                                    arrVal2:{type:"boolean"}
                                }
                            }
                        },
                        val3:{
                            type:"array",
                            items:{
                                type:"array",
                                items:{
                                    type:"object",
                                    properties:{
                                        valArr2:{type:"integer"}
                                    }
                                }
                            }
                        }
                    }
                }
            ];

            let result={
                type:"object",
                properties:{
                    val1:{type:"string"},
                    val2:{
                        type:"array",
                        items:{
                            type:"object",
                            properties:{
                                arrVal1:{type:"number"},
                                arrVal2:{type:"boolean"}
                            }
                        }
                    },
                    val3:{
                        type:"array",
                        items:{
                            type:"array",
                            items:{
                                type:"object",
                                properties:{
                                    valArr1:{type:"string"},
                                    valArr2:{type:"integer"}
                                }
                            }
                        }
                    }
                }
            };
            assert.deepEqual(SchemaMagic.mergeSchemas(schemas),result,"Invalid schema merge");

        });
        
    });

    describe('validate', function() {
        it('should throw argument missing when document not specified', function() {
            assert.throws(function(){SchemaMagic.validate(null,null);},Error,"Document Argument Missing Error Not Thrown");
        });
        it('should throw argument missing when schema not specified', function() {
            assert.throws(function(){SchemaMagic.validate({},null);},Error.ArgumentMissingError,"Schema Argument Missing Error Not Thrown");
        });

        it('should correctly validate a core json schema', function() {
            assert.notEqual(SchemaMagic.validate({
                type:"object",
                properties:{
                    val:{type:"xxxx"}
                }
            },SchemaMagic.coreSchemas.jsonSchema),null,"Core Schema valid when it should not be");

            let invalid=SchemaMagic.validate({
                type:"object",
                properties:{
                    val:{type:"string"}
                }
            },SchemaMagic.coreSchemas.jsonSchema);

            assert.equal(invalid,null,"Core Schema invalid when it should not be");
        });

        it('should correctly validate a patch', function() {
            assert.notEqual(SchemaMagic.validate({

            },SchemaMagic.coreSchemas.jsonPatch),null,"Schema valid when it should not be");

            assert.notEqual(SchemaMagic.validate([
                { "op": "xxxx", "path": "/biscuits/1", "value": { "name": "Ginger Nut" } }
            ],SchemaMagic.coreSchemas.jsonPatch),null,"Schema valid when it should not be");

            assert.equal(SchemaMagic.validate([
                { "op": "add", "path": "/biscuits/1", "value": { "name": "Ginger Nut" } }
            ],SchemaMagic.coreSchemas.jsonPatch),null,"Schema invalid when it should not be");
        });

        it('should correctly validate a schema', function() {
            assert.notEqual(SchemaMagic.validate({
                val1:"abc"
            },{
                type:"object",
                properties:{
                    val1:{type:"integer"}
                }
            }),null,"Schema valid when it should not be");

            assert.equal(SchemaMagic.validate({
                val1:1
            },{
                type:"object",
                properties:{
                    val1:{type:"integer"}
                }
            }),null,"Schema invalid when it should not be");
        });

        it('should correctly validate a mongo id', function() {
            assert.notEqual(SchemaMagic.validate({
                id:"xxxx"
            },{
                type:"object",
                properties:{
                    id:{type:"string",format:"mongoid"}
                }
            }),null,"Mongo ID valid when it should not be");

            assert.equal(SchemaMagic.validate({
                id:"57f7658ec4af7e225428bd47"
            },{
                type:"object",
                properties:{
                    id:{type:"string",format:"mongoid"}
                }
            }),null,"Mongo ID invalid when it should not be");
        });

        it('should correctly validate a email list', function() {
            let emailSchema={
                type:"object",
                properties:{
                    email:{type:"string",format:"email-list"}
                }
            };

            assert.notEqual(SchemaMagic.validate({
                email:"x.com"
            },emailSchema),null,"EMail single List valid when it should not be");

            assert.notEqual(SchemaMagic.validate({
                email:"x@x.com,x@x.com"
            },emailSchema),null,"EMail List with commas valid when it should not be");

            assert.equal(SchemaMagic.validate({
                email:"x@x.com"
            },emailSchema),null,"EMail List not valid when it should  be");

            assert.equal(SchemaMagic.validate({
                email:"x@x.com;x@x.com"
            },emailSchema),null,"EMail List not valid when it should  be");
        });

        it('should correctly validate an inline schema', function() {
            assert.notEqual(SchemaMagic.validate({
                schema:{
                    "type":"xxxx"
                }
            },{
                type:"object",
                properties:{
                    schema:{type:"object",jsonSchema:true}
                }
            }),null,"Inline Schema valid when it should not be");

            assert.equal(SchemaMagic.validate({
                schema:{
                    "type":"object",
                    properties:{
                        val1:{type:"string"}
                    },
                    required:["val1"]
                }
            },{
                type:"object",
                properties:{
                    schema:{type:"object",jsonSchema:true}
                }
            }),null,"Inline Schema invalid when it should not be");

            assert.equal(SchemaMagic.validate({
                schema:{
                    "type":"object",
                    properties:{

                    }
                }
            },{
                type:"object",
                properties:{
                    schema:{type:"object",jsonSchema:true}
                }
            }),null,"Inline Schema invalid when it should not be");
        });

        it('should correctly validate a datetime', function() {
            assert.notEqual(SchemaMagic.validate({
                date:"xxxx"
            },{
                type:"object",
                properties:{
                    date:{type:"string",format:"date-time"}
                }
            }),null,"Date valid when it should not be");

            assert.equal(SchemaMagic.validate({
                date:"2016-01-01T00:00:00Z"

            },{
                type:"object",
                properties:{
                    date:{type:"string",format:"date-time"}
                }
            }),null,"Date invalid when it should not be");
        });

        it('should correctly validate a null value', function() {
            assert.notEqual(SchemaMagic.validate({
                val:null
            },{
                type:"object",
                properties:{
                    val:{type:"string"}
                },
                required:["val"]
            }),null,"Invalid null value check");


        });

        it('should correctly validate a switch', function() {
            let invalid=SchemaMagic.validate({
                val:"test2",
            },{
                type:"object",
                properties:{
                    val:{type:"string"},
                    test:{type:"string"},
                    test2:{type:"string"}
                },
                required:["val"],
                switch:[
                    {
                        "if": {
                            "properties": {
                                "val":  {enum:["test"]}
                            }
                        },
                        "then": {
                            "required": ["test"]
                        }
                    },
                    {
                        "if": {
                            "properties": {
                                "val": {enum:["test2"]}
                            }
                        },
                        "then": {
                            "required": ["test2"]
                        }
                    }
                ]
            });
            assert.notEqual(invalid,null,"Invalid switch check");
            assert.equal(invalid.length,1,"Invalid switch check")

        });

        it('should correctly validate a switch with no val', function() {
            let invalid=SchemaMagic.validate({
                val:"xxxx",

            },{
                type:"object",
                properties:{
                    val:{type:"string"},
                    test:{type:"string"},
                    test2:{type:"string"}
                },
                required:["val"],
                switch:[
                    {
                        "if": {
                            "properties": {
                                "val": {enum:["test"]}
                            }
                        },
                        "then": {
                            "required": ["test"]
                        },
                        "continue": true
                    },
                    {
                        "if": {
                            "properties": {
                                "val":{enum:["test2"]}
                            }
                        },
                        "then": {
                            "required": ["test2"]
                        },
                        "continue": true
                    }
                ]
            });
            assert.equal(invalid,null,"Invalid switch check");
        });

        it('should correctly validate a switch with invalid val', function() {
            let invalid=SchemaMagic.validate({
                val:"test2",
                test1:"xxxx"
            },{
                type:"object",
                properties:{
                    val:{type:"string"},
                    test:{type:"string"},
                    test2:{type:"integer"}
                },
                required:["val"],
                switch:[
                    {
                        "if": {
                            "properties": {
                                "val": {enum:["test"]}
                            }
                        },
                        "then": {
                            "required": ["test"]
                        },
                        "continue": true
                    },
                    {
                        "if": {
                            "properties": {
                                "val":{enum:["test2"]}
                            }
                        },
                        "then": {
                            "required": ["test2"]
                        },
                        "continue": true
                    }
                ]
            });
            assert.notEqual(invalid,null,"Invalid switch check");
            assert.equal(invalid.length,1,"Invalid switch check")
        });

        it('should not coerce types', function() {
            let invalid=SchemaMagic.validate({
                val:"false",
            },{
                type:"object",
                properties:{
                    val:{type:"boolean"},
                    test:{type:"string"},
                    test2:{type:"integer"}
                },
                required:["val"]
            });
            assert.notEqual(invalid,null,"Invalid");
        });

        it('should coerce types', function() {
            let invalid=SchemaMagic.validate({
                val:"false",
                test:null
            },{
                type:"object",
                properties:{
                    val:{type:"boolean"},
                    test:{type:"string"},
                    test2:{type:"integer"}
                },
                required:["val"]
            },true);
            assert.equal(invalid,null,"valid");
        });

        it('should not validate a schema with parameters', function() {
            let invalid=SchemaMagic.validate({
                val1:"@test",
                val2:{val21:"@test2"},
                val3:"@test3",
                val4:"xxx",
                val5:[{val51:"@test5"}],
                val6:"@test5"
            },{ type:"object",
                properties:{
                    val1:{type:"string",maxLength:1},
                    val2:{
                        type:"object",
                        properties:{
                            val21:{type:"integer"}
                        }

                    },
                    val3:{
                        type:"object",
                        properties: {
                            val31: {type: "boolean"}

                        }
                    },
                    val4:{
                        type:"boolean"
                    },
                    val5:{
                        type:"array",
                        items:{type:"object",properties:{
                                val51:{type:"integer"}
                            }}
                    }
                },
                required:['val1']
            });
            assert.notEqual(invalid,null,"invalid");
        });

        it('should not validate a schema with parameters and invalid data', function() {
            let invalid=SchemaMagic.validateWithParameters({
                val1:"@test",
                val2:{val21:"@test2"},
                val3:"@test3",
                val4:"xxx",
                val5:[{val51:"@test5"}],
                val6:"@test5"
            },{ type:"object",
                properties:{
                    val1:{type:"string",maxLength:1},
                    val2:{
                        type:"object",
                        properties:{
                            val21:{type:"integer"}
                        }

                    },
                    val3:{
                        type:"object",
                        properties: {
                            val31: {type: "boolean"}

                        }
                    },
                    val4:{
                        type:"boolean"
                    },
                    val5:{
                        type:"array",
                        items:{type:"object",properties:{
                                val51:{type:"integer"}
                            }}
                    }
                },
                required:['val1']
            });
            assert.notEqual(invalid,null,"invalid");
        });

        it('should validate a schema with parameters', function() {
            let invalid=SchemaMagic.validateWithParameters({
                val1:"@test",
                val2:{val21:"@test2"},
                val3:"@test3",
                val4:true,
                val5:[{val51:"@test5"}],
                val6:"@test5"
            },{ type:"object",
                properties:{
                    val1:{type:"string",maxLength:1},
                    val2:{
                        type:"object",
                        properties:{
                            val21:{type:"integer"}
                        }

                    },
                    val3:{
                        type:"object",
                        properties: {
                            val31: {type: "boolean"}

                        }
                    },
                    val4:{
                        type:"boolean"
                    },
                    val5:{
                        type:"array",
                        items:{type:"object",properties:{
                                val51:{type:"integer"}
                            }}
                    }
                },
                required:['val1']
            });
            assert.equal(invalid,null,"invalid");
        });

    });

    describe('Validator', function() {
        it('should throw argument missing when document not specified', function() {
            assert.throws(function(){
                let validator=new SchemaMagic.Validator();
                validator.validate(null,null);
            },Error,"Document Argument Missing Error Not Thrown");
        });
        it('should throw argument missing when schema not specified', function() {
            assert.throws(function(){
                let validator=new SchemaMagic.Validator();
                validator.validate({},null);
            },Error.ArgumentMissingError,"Schema Argument Missing Error Not Thrown");
        });

        it('should correctly validate a schema', function() {
            let validator=new SchemaMagic.Validator();
            assert.notEqual(validator.validate({
                val1:"abc"
            },{
                type:"object",
                properties:{
                    val1:{type:"integer"}
                }
            }),null,"Schema valid when it should not be");

            assert.equal(validator.validate({
                val1:1
            },{
                type:"object",
                properties:{
                    val1:{type:"integer"}
                }
            }),null,"Schema invalid when it should not be");
        });

        it('should correctly set a default', function() {
            let validator=new SchemaMagic.Validator(null,null,{useDefaults:true});
            let obj={
                val1:1
            }
            assert.equal(validator.validate(obj,{
                type:"object",
                properties:{
                    val1:{type:"integer"},
                    val2:{type:"string",default:"a"}
                }
            }),null,"Schema valid when it should not be");

            assert.equal(obj.val2,"a","Defualt not set");
        });


        it('should correctly validate a mongo id', function() {
            let validator=new SchemaMagic.Validator();
            assert.notEqual(validator.validate({
                id:"xxxx"
            },{
                type:"object",
                properties:{
                    id:{type:"string",format:"mongoid"}
                }
            }),null,"Mongo ID valid when it should not be");

            assert.equal(validator.validate({
                id:"57f7658ec4af7e225428bd47"
            },{
                type:"object",
                properties:{
                    id:{type:"string",format:"mongoid"}
                }
            }),null,"Mongo ID invalid when it should not be");
        });

        it('should correctly validate an inline schema', function() {
            let validator=new SchemaMagic.Validator();
            assert.notEqual(validator.validate({
                schema:{
                    "type":"xxxx"
                }
            },{
                type:"object",
                properties:{
                    schema:{type:"object",jsonSchema:true}
                }
            }),null,"Inline Schema valid when it should not be");

            assert.equal(validator.validate({
                schema:{
                    "type":"object",
                    properties:{
                        val1:{type:"string"}
                    },
                    required:["val1"]
                }
            },{
                type:"object",
                properties:{
                    schema:{type:"object",jsonSchema:true}
                }
            }),null,"Inline Schema invalid when it should not be");

            assert.equal(validator.validate({
                schema:{
                    "type":"object",
                    properties:{

                    }
                }
            },{
                type:"object",
                properties:{
                    schema:{type:"object",jsonSchema:true}
                }
            }),null,"Inline Schema invalid when it should not be");
        });

        it('should correctly validate a datetime', function() {
            let validator=new SchemaMagic.Validator();
            assert.notEqual(validator.validate({
                date:"xxxx"
            },{
                type:"object",
                properties:{
                    date:{type:"string",format:"date-time"}
                }
            }),null,"Date valid when it should not be");

            assert.equal(validator.validate({
                date:"2016-01-01T00:00:00Z"

            },{
                type:"object",
                properties:{
                    date:{type:"string",format:"date-time"}
                }
            }),null,"Date invalid when it should not be");
        });

        it('should correctly validate an added format', function() {
            let validator=new SchemaMagic.Validator({
                upper:function(data){
                    if (!data)return true;
                    if (data.toString().toUpperCase()!==data.toString())return false;
                    return true;
                }
            });
            assert.notEqual(validator.validate({
                id:"xxx"
            },{
                type:"object",
                properties:{
                    id:{type:"string",format:"upper"}
                }
            }),null,"Uppercase valid when it should not be");

            assert.equal(validator.validate({
                id:"XXX"
            },{
                type:"object",
                properties:{
                    id:{type:"string",format:"upper"}
                }
            }),null,"Upper invalid when it should not be");
        });

        it('should correctly validate an added keyword', function() {
            let validator=new SchemaMagic.Validator(null,{
                test:{
                    validate: function (schema,data) {
                        if (!data)return true;
                        return (data==="xxx");
                    },
                    metaSchema: { type: 'boolean' }
                }
            });
            assert.notEqual(validator.validate({
                val:"yyy"
            },{
                type:"object",
                properties:{
                    val:{type:"string",test:true}
                }
            }),null,"Keyword valid when it should not be");

            assert.equal(validator.validate({
                val:"xxx"
            },{
                type:"object",
                properties:{
                    val:{type:"string",test:true}
                }
            }),null,"Keyword invalid when it should not be");


        });

        it('should correctly validate a switch', function() {
            let validator=new SchemaMagic.Validator();
            let invalid=validator.validate({
                val:"test2",
            },{
                type:"object",
                properties:{
                    val:{type:"string"},
                    test:{type:"string"},
                    test2:{type:"string"}
                },
                required:["val"],
                switch:[
                    {
                        "if": {
                            "properties": {
                                "val":  {enum:["test"]}
                            }
                        },
                        "then": {
                            "required": ["test"]
                        }
                    },
                    {
                        "if": {
                            "properties": {
                                "val": {enum:["test2"]}
                            }
                        },
                        "then": {
                            "required": ["test2"]
                        }
                    }
                ]
            });
            assert.notEqual(invalid,null,"Invalid switch check");
            assert.equal(invalid.length,1,"Invalid switch check")

        });

        it('should correctly validate a switch with no val', function() {
            let validator=new SchemaMagic.Validator();
            let invalid=validator.validate({
                val:"xxxx",

            },{
                type:"object",
                properties:{
                    val:{type:"string"},
                    test:{type:"string"},
                    test2:{type:"string"}
                },
                required:["val"],
                switch:[
                    {
                        "if": {
                            "properties": {
                                "val": {enum:["test"]}
                            }
                        },
                        "then": {
                            "required": ["test"]
                        },
                        "continue": true
                    },
                    {
                        "if": {
                            "properties": {
                                "val":{enum:["test2"]}
                            }
                        },
                        "then": {
                            "required": ["test2"]
                        },
                        "continue": true
                    }
                ]
            });
            assert.equal(invalid,null,"Invalid switch check");
        });

        it('should correctly validate a switch with invalid val', function() {
            let validator=new SchemaMagic.Validator();
            let invalid=validator.validate({
                val:"test2",
                test1:"xxxx"
            },{
                type:"object",
                properties:{
                    val:{type:"string"},
                    test:{type:"string"},
                    test2:{type:"integer"}
                },
                required:["val"],
                switch:[
                    {
                        "if": {
                            "properties": {
                                "val": {enum:["test"]}
                            }
                        },
                        "then": {
                            "required": ["test"]
                        },
                        "continue": true
                    },
                    {
                        "if": {
                            "properties": {
                                "val":{enum:["test2"]}
                            }
                        },
                        "then": {
                            "required": ["test2"]
                        },
                        "continue": true
                    }
                ]
            });
            assert.notEqual(invalid,null,"Invalid switch check");
            assert.equal(invalid.length,1,"Invalid switch check")
        });

    });

    describe('normalize schema', function() {
        it('should throw argument missing when schema not specified', function() {
            assert.throws(function(){SchemaMagic.normalizeSchema(null);},Error,"Schema Argument Missing Error Not Thrown");
        });

        it('should not change a schema that has no $ref', function() {

            let schema={
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"string"}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "string"}
                        }
                    }
                }
            }

            schema=SchemaMagic.normalizeSchema(schema);

            assert.deepEqual(schema,{
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"string"}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "string"}
                        }
                    }
                }
            },"Schema mutated")


        });

        it('should change $ref', function() {

            let schema={
                type:"object",
                properties:{
                    val:{$ref:"#/definitions/field1"},
                    val2:{type:"array",items:{$ref:"#/definitions/field2"}},
                    val3: {
                        type: "object", properties: {
                            a: {$ref:"#/definitions/field2"}
                        }
                    }
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            }

            schema=SchemaMagic.normalizeSchema(schema);

            assert.deepEqual(schema,{
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"integer"}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "integer"}
                        }
                    }
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            },"Schema not replaced correctly")


        });

        it('should change $ref in array of array', function() {

            let schema={
                type:"object",
                properties:{
                    val:{$ref:"#/definitions/field1"},
                    val2:{type:"array",items:{type:"array",items:{$ref:"#/definitions/field2"}}},

                    val3: {
                        type: "object", properties: {
                            a: {$ref:"#/definitions/field2"}
                        }
                    },
                    val4:{type:"array",items:{type:"array",items:{type:"object",properties:{x:{$ref:"#/definitions/field2"}}}}},
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            }

            schema=SchemaMagic.normalizeSchema(schema);

            assert.deepEqual(schema,{
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"array",items:{type:"integer"}}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "integer"}
                        }
                    },
                    val4:{type:"array",items:{type:"array",items:{type:"object",properties:{x:{type:"integer"}}}}}
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            },"Schema not replaced correctly")


        });

        it('should change $ref in defs', function() {

            let schema={
                type:"object",
                properties:{
                    val:{$ref:"#/definitions/field1"},
                    val2:{type:"array",items:{type:"array",items:{$ref:"#/definitions/field2"}}},

                    val3: {
                        type: "object", properties: {
                            a: {$ref:"#/definitions/field2"}
                        }
                    },
                    val4:{type:"array",items:{type:"array",items:{type:"object",properties:{x:{$ref:"#/definitions/field2"}}}}},
                    val5:{$ref:"#/definitions/field3"}
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    },
                    field3:{
                        $ref:"#/definitions/field2"
                    }
                }
            }

            schema=SchemaMagic.normalizeSchema(schema,{deleteDefinitions:true});

            assert.deepEqual(schema,{
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"array",items:{type:"integer"}}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "integer"}
                        }
                    },
                    val4:{type:"array",items:{type:"array",items:{type:"object",properties:{x:{type:"integer"}}}}},
                    val5:{"type":"integer"}
                }
            },"Schema not replaced correctly")


        });

        it('should change $ref with copy', function() {

            let originalSchema={
                type:"object",
                properties:{
                    val:{$ref:"#/definitions/field1"},
                    val2:{type:"array",items:{$ref:"#/definitions/field2"}},
                    val3: {
                        type: "object", properties: {
                            a: {$ref:"#/definitions/field2"}
                        }
                    }
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            }

            let schema=SchemaMagic.normalizeSchema(originalSchema,{copy:true});

            assert.deepEqual(schema,{
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"integer"}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "integer"}
                        }
                    }
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            },"Schema not replaced correctly")

            assert.deepEqual(originalSchema,{
                type:"object",
                properties:{
                    val:{$ref:"#/definitions/field1"},
                    val2:{type:"array",items:{$ref:"#/definitions/field2"}},
                    val3: {
                        type: "object", properties: {
                            a: {$ref:"#/definitions/field2"}
                        }
                    }
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            },"Schema not replaced correctly")

        });

        it('should change $ref and remove defs', function() {

            let schema={
                type:"object",
                properties:{
                    val:{$ref:"#/definitions/field1"},
                    val2:{type:"array",items:{$ref:"#/definitions/field2"}},
                    val3: {
                        type: "object", properties: {
                            a: {$ref:"#/definitions/field2"}
                        }
                    }
                },
                definitions:{
                    field1:{
                        type:"string"
                    },
                    field2:{
                        type:"integer"
                    }
                }
            }

            schema=SchemaMagic.normalizeSchema(schema,{deleteDefinitions:true});

            assert.deepEqual(schema,{
                type:"object",
                properties:{
                    val:{type:"string"},
                    val2:{type:"array",items:{type:"integer"}},
                    val3: {
                        type: "object", properties: {
                            a: {type: "integer"}
                        }
                    }
                }
            },"Schema not replaced correctly")


        });

    });

    describe('custom formatters', function() {

        it('check a valid objectid', function() {

            let invalid=SchemaMagic.validate({
                val:"58c246244d18c88838c6744f"
            },{

                "type":"object",
                properties:{
                    val:{type:"string",format:"mongoid"}
                },
                required:["val"]

            });

            assert.deepEqual(invalid,null,"Invalid objectid validate");

        });

        it('check an ivalid objectid', function() {

            let invalid=SchemaMagic.validate({
                val:"58c246244d18c88838c67f"
            },{

                "type":"object",
                properties:{
                    val:{type:"string",format:"mongoid"}
                },
                required:["val"]

            });

            assert(invalid,"Invalid objectid validate");

        });

        it('check an ivalid objectid when null', function() {

            let invalid=SchemaMagic.validate({
                val:null
            },{

                "type":"object",
                properties:{
                    val:{type:["string","null"],format:"mongoid"}
                }

            });

            assert(!invalid,"Invalid objectid validate");

        });

        it('check a valid cron', function() {

            let invalid=SchemaMagic.validate({
                val:"0 0 * * *"
            },{

                "type":"object",
                properties:{
                    val:{type:"string",format:"cron"}
                },
                required:["val"]

            });

            assert(!invalid,"Invalid cron validate");

        });

        it('check an ivalid cron', function() {

            let invalid=SchemaMagic.validate({
                val:"0 0 * * x x x"
            },{

                "type":"object",
                properties:{
                    val:{type:"string",format:"cron"}
                },
                required:["val"]

            });

            assert(invalid,"Invalid cron validate");

        });

        it('check a valid timezone', function() {

            let invalid=SchemaMagic.validate({
                val:"America/Los_Angeles"
            },{

                "type":"object",
                properties:{
                    val:{type:"string",format:"timezone"}
                },
                required:["val"]

            });

            assert(!invalid,"Invalid timezone validate");

        });

        it('check an ivalid timezone', function() {

            let invalid=SchemaMagic.validate({
                val:"America/xxxx"
            },{

                "type":"object",
                properties:{
                    val:{type:"string",format:"timezone"}
                },
                required:["val"]

            });

            assert(invalid,"Invalid timezone validate");

        });



    });

});