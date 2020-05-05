const http = require('http');
const semver = require('semver');

const headerPrefix = 'X-scapi';

const registry = {
    registry: {},
    httpHeaders: {},
    finishedHeaders: {},

    /**
     *
     * @param {VersionEntry} v
     */
    inject(v) {
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


function registerApi(packageName, version, organization) {
    let v = new VersionEntry(packageName, version, organization);
    registry.inject(v);
}

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
 *
 * @param {http.IncomingMessage} request
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

function headers()
{
    return registry.finishedHeaders;
}

function registerApiFromPackageJSON(packageJson) {
    registerApi(packageJson.name, packageJson.version);
}

module.exports = {registerApi, registerApiFromPackageJSON, headers}
