const $objectId = require("bson-objectid");
const $cron=require('cron-parser');
const $moment=require('moment-timezone');
const _emailRegex= /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&''*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

const formatters={
    "mongoid": function(data){
        if (!data)return true;

        if (data.toString().length!==24)return false;
        if ($objectId.isValid(data))return true;
        else return false;
    },
    "cron":function(data){
        if (!data)return true;
        try{
            let parser=$cron.parseExpression(data.toString());
        }catch(exp){
            return false;
        }
        return true;
    },
    "timezone":function(data){
        if (!data)return true;
        return !!$moment.tz.zone(data.toString());
    },
    "email-list":function(data){
        if (!data)return true;
        let emails=data.split(';');
        for (let email of emails){
            if (!_emailRegex.test(email))return false;
        }
        return true;
    }
};


module.exports=formatters;

//*********************************************************************************************************************************************************************
//private functions
//*********************************************************************************************************************************************************************
