const $json=require('json-magic');
const $deepcopy=require('deepcopy');
const $ajv=require('ajv');
const $check=require('check-types');
const $types=require('type-magic');
const _s=require('underscore.string');
const _=require('underscore');

const Validator=require('./Validator.js');

const _jsonSchema=require("./jsonSchema.json");
const _jsonPatchSchema=require("./jsonPatch.json");
const _sqlTypeMapping=require('./SQLTypeMappings.json');
const _keywords=require("./keywords.js");
const _formatters=require("./formatters.js");

const _ajv = $ajv({
    format:"full"
});

_ajv.addMetaSchema(_jsonSchema);

const _ajvCoerce = $ajv({
    format:"full",
    coerceTypes:true
});

_ajvCoerce.addMetaSchema(_jsonSchema);

require('ajv-keywords')(_ajv, ['switch']);
require('ajv-keywords')(_ajvCoerce, ['switch']);


for (let k in _formatters){
    if(!_formatters.hasOwnProperty(k)){
        continue;
    }
    _ajv.addFormat(k,_formatters[k]);
    _ajvCoerce.addFormat(k,_formatters[k]);
}


for (let k in _keywords){
    if(!_keywords.hasOwnProperty(k)){
        continue;
    }
    _ajv.addKeyword(k,_keywords[k]);
    _ajvCoerce.addKeyword(k,_keywords[k]);
}


class SchemaMagic{
    static validate(document,schema,coerce){
        //argument checks
        if (!document){throw new Error("No Document specified");}
        if (!schema){throw new Error("No Schema specified");}

        let localAjv=_ajv;
        if (coerce)localAjv=_ajvCoerce;

        let valid=true;
        try{
            valid=localAjv.validate(schema, document)
        }
        catch(exp){
            return {message:"Invalid Schema","Error":exp.message};
        }
        if (!valid){
            let retErr=localAjv.errors.map(function(doc){
                return {
                    message:doc.message,
                    dataPath:doc.dataPath,
                    keyword:doc.keyword,
                    schemaPath:doc.schemaPath
                }
            });
            return retErr;
        }
        else
        {
            return null;
        }
    }

    static validateWithParameters(document,schema,options){
        let paramPaths=[];
        options=options||{};
        if (!options.paramIdentifier)options.paramIdentifier='@';

        $json.walk(document, (value,path) =>{
            if (value&&value.substring){
                if (value.substring(0,1)===options.paramIdentifier){
                    paramPaths.push(path);
            }
            }
        },'.');

        if (paramPaths.length>0){
            let workingSchema=$deepcopy(schema);

            for (let paramPath of paramPaths){
                let splitPaths=paramPath.split('.');
                let schemaPaths=[];
                let suffix="";
                let isArray=false;
                for (let splitPath of splitPaths){
                    if (!isNaN(parseInt(splitPath))){
                        schemaPaths.push("items");
                        suffix=".type";
                        isArray=true;
                    }else{
                        schemaPaths.push("properties." + splitPath);
                    }

                }
                let schemaPath=schemaPaths.join('.') + suffix;

                try{
                    let curSchema=$json.get(workingSchema,schemaPath);
                    let replacement={type:"string"};
                    if (isArray)replacement=[curSchema,"string"];
                    $json.set(workingSchema,schemaPath,replacement);
                }catch (exp){
                    //path does not exist, ignore...
                }

            }
            return SchemaMagic.validate(document,workingSchema,options.coerce);
        }else{
            return SchemaMagic.validate(document,schema,options.coerce);
        }


    }

    static copy(schema){
        if (!schema){throw new Error("No Schema specified")}
        return $deepcopy(schema);
    }

    static coerceData(data,schema){
        if (!data)return null;
        if (!schema){throw new Error("No Schema specified")}

        function pathToPointer(path){
            path=path.replace("$","");
            var retArr=[];

            path.replace(/\[(.+?)\]/g, function($0, $1) { retArr.push($1.replace("'","").replace("'","")) })

            return "/" + retArr.join("/");
        }

        var coerceFields=null;
        if(schema.coerceFields){
            coerceFields=schema.coerceFields;
        }else{
            coerceFields=SchemaMagic.getCoerceFields(schema);
        }

        for (var i=0;i<coerceFields.length;i++){

            var values=jsonPath.eval(data,coerceFields[i].path,{resultType:"PATH"}) ;
            for (var j=0;j<values.length;j++){
                var pointer=pathToPointer(values[j]);
                var value=$json.get(data,pointer);
                $json.set(data,pointer,new Date(value));

                //
            }
        }

        return data;
    }

    //flattens a schema returning an array of paths to access elements of an object
    static flattenSchema(schema,options){
        if (!schema)return schema;
        options=options||{};
        let sep=options.format==="path"?"/":".";

        let paths=[];
        const traverseSchema=(curSchema,curPath,isArray,isRequired)=>{
            if (!curSchema){
                return;
            }else if (curSchema.type==="array"){
                if (curSchema.items){
                    traverseSchema(curSchema.items,curPath.concat(["n"]),true,isRequired);
                }else{
                    paths.push({
                        path:$json.compilePath(curPath.concat(["n"]),sep),
                        isArray:true,
                        type:curSchema.type,
                        required:!!isRequired
                    });
                }
            }else if (curSchema.type==="object"){
                if (curSchema.properties){
                    for (let propName in curSchema.properties){
                        if (!curSchema.properties.hasOwnProperty(propName))continue;
                        traverseSchema(curSchema.properties[propName],curPath.concat([propName]),isArray,isRequired||curSchema.required&&curSchema.required.indexOf(propName)>-1);
                    }
                }else{
                    paths.push({
                        path:$json.compilePath(curPath,sep),
                        type:curSchema.type,
                        isArray:!!isArray,
                        required:!!isRequired
                    });
                }
            }else {
                paths.push({
                    path:$json.compilePath(curPath,sep),
                    type:curSchema.type||"object",
                    format:curSchema.format,
                    isArray:!!isArray,
                    required:!!isRequired
                });
            }
        };

        if (!$check.object(schema)){
            return [{path:"",type:$types.getTypeName(schema)}];
        }


        traverseSchema(schema,[]);

        return paths;

    }

    static generateSQLTable(schema,tableName,options){
        if (!schema)return null;
        options=options||{};
        options.escape=options.escape||'[]';
        options.schema=options.schema||'dbo';
        options.separator=options.separator||'_';
        options.beautify=$check.assigned(options.beautify)?options.beautify:true;
        options.defaultType=options.defaultType||"varchar(255)";

        let charFunc=null;
        if ($check.function(options.escape)){
            charFunc=options.escape;
        }else if (options.escape==="`"){
            charFunc=(item)=>{return "`" + item + "`";};
        }else if (options.escape==="[]"){
            charFunc=(item)=>{return "[" + item + "]";};
        }else if (options.escape){
            charFunc=(item)=>{return options.escape + item + options.escape;};
        }

        tableName=tableName||schema.name||schema.title||"Table1";

        let sqlTypes=options.sqlTypes||_sqlTypeMapping;

        let flattenedSchema=SchemaMagic.flattenSchema(schema);
        let cols=[];
        for (let path of flattenedSchema){
            let colName=path.path.replace(/\./g,options.separator);
            if (options.beautify)colName=_s.titleize(_s.humanize(colName));
            colName=charFunc(colName);
            let colType=sqlTypes.filter((t)=>{return t.type===path.type&&(path.format?t.format===path.format:true);})[0];
            colType=colType?colType.sqlType:options.defaultType;

            cols.push(colName + " " + colType + (path.required?" NOT":"") + " NULL");
        }

        return "CREATE TABLE " + charFunc(options.schema) + "." + charFunc(tableName) + "(\r\n" +
            cols.join(",\r\n") + ");"
    }
    //todo: required
    //todo: ranges
    //todo: formats like cron, email etc.
    //todo enums
    static generateSchemaFromJSON(obj){

        const generateSchemaPart=(partObj)=>{
            if (partObj===null){
                return {type:"null"};
            }else if ($check.array(partObj)){
                let schemaPart={
                    type:"array",
                    items:SchemaMagic.mergeSchemas(partObj.map((i)=>{
                        return generateSchemaPart(i);
                    }))
                };
                return schemaPart;
            }else if ($check.object(partObj)&&partObj.constructor&&partObj.constructor.name==="ObjectID"&&partObj.id){
                let schemaPart={
                    type:"string",
                    format:"mongoid"
                };
                return schemaPart;
            }else if ($check.object(partObj)&&partObj._bsontype==="ObjectID"&&partObj._id){
                let schemaPart={
                    type:"string",
                    format:"mongoid"
                };
                return schemaPart;
            }else if($check.object(partObj)&&partObj._bsontype==="ObjectID"&&Buffer.isBuffer(partObj.id)&&partObj.id.length===12){
                let schemaPart={
                    type:"string",
                    format:"mongoid"
                };
                return schemaPart;
            }else if ($check.object(partObj)){
                let schemaPart={
                    type:"object",
                    properties:{}
                };
                for (let k in partObj){
                    if (!partObj.hasOwnProperty(k))continue;
                    schemaPart.properties[k]=generateSchemaPart(partObj[k]);
                }
                return schemaPart;
            }else if ($check.date(partObj)){
                return {type:"string",format:"date-time"};
            }else if ($check.string(partObj)){
                return {type:"string"};
            }else if ($check.integer(partObj)){
                return {type:"integer"};
            }else if ($check.number(partObj)){
                return {type:"number"};
            }else if ($check.boolean(partObj)){
                return {type:"boolean"};
            }else if ($check.boolean(partObj)){
                return {type:"boolean"};
            }else if (Buffer.isBuffer(partObj)){
                return {type:"string"};
            }else{
                return {type:"unspecified"};
            }
        };

        return generateSchemaPart(obj);

    }

    static mergeSchemas(schemas){
        if (!schemas||schemas.length===0)return null;

        schemas=schemas.filter(s=>!!s);
        if (schemas.length===1)return schemas[0];

        const hasType=(schemaType,searchType)=>{
            if ($check.array(schemaType)){
                return schemaType.indexOf(searchType)>-1;
            }else{
                return schemaType===searchType;
            }
        };

        return schemas.reduce((mergedSchema,curSchema)=>{
            const mergePart=(schemaPart,curPath)=>{
                if (!schemaPart)return;
                if (!$json.has(mergedSchema,curPath)){
                    $json.set(mergedSchema,curPath,schemaPart);
                    return;
                }
                let curMergePart=$json.get(mergedSchema,curPath);
                if (schemaPart.type==="object"&&!hasType(curMergePart.type,"object")){
                    //if its an object, it gets prefence
                    curMergePart.type="object";
                    curMergePart.properties=schemaPart.properties;
                }if (schemaPart.type==="object"&&hasType(curMergePart.type,"object")&&schemaPart.properties){
                    //merge in any strange properties
                    for (let k in schemaPart.properties){
                        if (!schemaPart.properties.hasOwnProperty(k))continue;
                        mergePart(schemaPart.properties[k],curPath.concat(["properties",k]));
                    }
                }else if (schemaPart.type==="array"&&!hasType(curMergePart.type,"array")){
                    mergePart(schemaPart.items,curPath.concat(["items"]));
                }else if (schemaPart.type==="array"&&hasType(curMergePart.type,"array")){
                    //if its an array, it gets prefence
                    curMergePart.type="array";
                    mergePart(schemaPart.items,curPath.concat(["items"]));
                }else if (schemaPart.type&&curMergePart.type){

                    let types=_.union($check.array(curMergePart.type)?curMergePart.type:[curMergePart.type],$check.array(schemaPart.type)?schemaPart.type:[schemaPart.type]);
                    if (types.length===1)types=types[0];
                    if (_.difference(types,["integer","number"]).length===0)types="number";
                    curMergePart.type=types;
                }else{
                    return;
                }


            };
            mergePart(curSchema,[]);
            return mergedSchema;
        });
    }

    static normalizeSchema(schema,options,depth){
        if (!schema){throw new Error("No Schema specified")}
        let propPaths=[];
        let workingSchema=schema;
        if (!options)options={};
        if (options.copy)
            workingSchema=$deepcopy(schema);


        $json.walk(schema,function(value,path){
            let parsedPath=$json.parsePath(path);
            if (parsedPath[parsedPath.length-1]==='$ref'){
                parsedPath.pop();
                propPaths.push({
                    path:$json.compilePath(parsedPath),
                    ref:value?value.substring(1):null
                });
            }
        });

        for (let propPath of propPaths){

            let repVal=$json.get(workingSchema,propPath.ref);
            $json.set(workingSchema,propPath.path,repVal);
        }

        if (!depth)depth=0;
        if (depth<1){
            depth++;
            workingSchema=SchemaMagic.normalizeSchema(workingSchema,null,depth);
        }


        if (options.deleteDefinitions)
            delete workingSchema.definitions;

        //do it again

        return workingSchema;
    }

    static getCoerceFields(schema){
        if (!schema){throw new Error("No Schema specified");}
        let coerceFields=[];
        getFieldsRecursive(schema.properties,"$","");

        function getFieldsRecursive(obj,currentPath,currentPointer) {
            for(let key in obj) {
                if(!obj.hasOwnProperty(key)){
                    continue;
                }

                if (obj[key].type === "object" ) {
                    if (obj[key].properties){
                        getFieldsRecursive(obj[key].properties, currentPath + "." + key,currentPointer + "/" + key);
                    }
                }else if (obj[key].type === "array" && obj[key].items && obj[key].items.type==="object" ) {
                    getFieldsRecursive(obj[key].items.properties, currentPath + "." + key + "[*]", currentPointer + "/" + key + "[*]");
                }else{
                    if (obj[key].format && obj[key].format==="date-time"){
                        coerceFields.push({
                            path:currentPath + "." + key,
                            updatePath:currentPointer + "/" + key,
                            format:obj[key].format
                        });
                    }
                }
            }
        }
        return coerceFields;
    }

    static get coreSchemas(){
        return{
            jsonSchema:_jsonSchema,
            jsonPatch:_jsonPatchSchema
        }
    }

    static get sqlTypeMappings(){
        return _sqlTypeMapping;
    }
    
    static get Validator(){
        return Validator;   
    }
}

module.exports=SchemaMagic;