/**
 * @typedef {import('ajv').FormatValidator} FormatValidator
 * @typedef {import('bson-objectid').default} ObjectIDCtor
 */

const $objectId = require('bson-objectid');
const $moment = require('moment-timezone');
const $cron = require('cron-parser');

/**
 * Regular expression for validating email addresses
 * @type {RegExp}
 */
const _emailRegex =
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

/**
 * Custom format validators for schema validation
 * @type {Object.<string, FormatValidator>}
 */
const formatters = {
    /**
     * Validates a MongoDB ObjectId
     * @type {FormatValidator}
     * @param {string} data - The data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    mongoid: function (data) {
        if (!data) {
            return true;
        }
        if (data.toString().length !== 24) {
            return false;
        }
        return $objectId.isValid(data) ? true : false;
    },

    /**
     * Validates a cron expression
     * @type {FormatValidator}
     * @param {string} data - The data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    cron: function (data) {
        if (!data) {
            return true;
        }
        try {
            $cron.parseExpression(data.toString());
        } catch (exp) {
            return false;
        }
        return true;
    },

    /**
     * Validates a timezone identifier
     * @type {FormatValidator}
     * @param {string} data - The data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    timezone: function (data) {
        if (!data) {
            return true;
        }
        return !!$moment.tz.zone(data.toString());
    },

    /**
     * Validates a list of email addresses separated by semicolons
     * @type {FormatValidator}
     * @param {string} data - The data to validate
     * @returns {boolean} True if valid, false otherwise
     */
    'email-list': function (data) {
        if (!data) {
            return true;
        }
        const emails = data.split(';');
        for (const email of emails) {
            if (!_emailRegex.test(email)) {
                return false;
            }
        }
        return true;
    },
};

module.exports = formatters;
