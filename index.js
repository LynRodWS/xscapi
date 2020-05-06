const http = require('http');
const semver = require('semver');

const headerPrefix = 'X-SCapi';

/*
 * core registry singleton.
 *
 */
const registry = {
    registry: {},
    httpHeaders: {},
    finishedHeaders: {},

    /**
     *
     * @param {VersionEntry} v
     */
    add(v) {
        let httpHeader = headerPrefix + (v.organization ? "-" + v.organization : '');

        let org = this.registry[v.organization];
        if (!org) {
            org = {};
            this.registry[v.organization] = org;
            this.httpHeaders[httpHeader] = [];
        }
        let existingVersion = org[v.api];
        if (existingVersion && existingVersion != v.version) {
            throw Error(`Mismatched API registration on ${org}/${api}: ${existingVersion} vs ${v.version}`);
        }

        org[v.api] = v.version;
        if (!existingVersion) {
            let declaration = v.api + "=" + v.version;
            this.httpHeaders[httpHeader].push(declaration);
        }

        // rebuild 
        this.finishedHeaders = {}
        for (let header in this.httpHeaders) {
            this.finishedHeaders[header] = registry.httpHeaders[header].join(",");
        }
    }
};

/**
 * Registers your API version within XSCapi
 *
 * @param {string} packageName - the npm-style package name you're registering, e.g. @sharecare/xscapi
 * @param {string} version - semver-legal version, e.g. 0.0.1
 * @param {string?} organization - overrides the organization segment of the package (the 'sharecare' part of the above packageName example)
 *
 * @returns {VersionEntry} the VersionEntry for the added package
 */
function registerApi(packageName, version, organization) {
    let v = new VersionEntry(packageName, version, organization);
    registry.add(v);
    return v;
}

/**
 * Pulls apart the package/version/organization into an object
 */
class VersionEntry {
    constructor(packageName, version, organization) {
        let cleanVersion = semver.clean(version);
        if (!semver.valid(cleanVersion)) {
            throw Error("Invalid registry semver '" + version + "' for api '" + packageName + "'")
        }

        let match = packageName.match(/^\@([\w]+)\//);
        let org = match ? match[1] : '';
        let api = org ? packageName.substring(match[0].length) : packageName;

        if (organization) // declared organization overwrites package organization
            org = organization;

        this.organization = org;
        this.api = api;
        this.version = cleanVersion;
    }
}


/**
 * extracts Xscapi info from HTTP header objects.
 * returns a nested object"
 * { organization: { api: version }}
 */
function decodeHeaders(headers) {
    let result = {};
    for (let header in headers) {
        if (!header.startsWith(headerPrefix)) continue;

        let org = header.substring(headerPrefix.length);
        if (org) org = org.substring(1); // remove "-"

        let rawValues = headers[header].split(",");
        let apis = {};
        result[org] = apis;
        rawValues.forEach(declaration => {
            let [api, version] = declaration.split("=");
            apis[api] = version;
        })
    }
    return result;
}

/**
 * Generates an object with the HTTP X-SCapi headers for requests or responses
 *
 * @return {object{string:string}}
 */
function headers() {
    return registry.finishedHeaders;
}

/**
 * Convenience method to auto-register a package using its package.json
 * @param packageJson
 */
function registerApiFromPackageJSON(packageJson) {
    return registerApi(packageJson.name, packageJson.version);
}

module.exports = {registerApi, registerApiFromPackageJSON, headers, decodeHeaders, VersionEntry}
