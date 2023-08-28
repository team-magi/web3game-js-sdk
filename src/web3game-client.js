const axios = require('axios');

module.exports = class Web3Api {
    static baseURL = 'https://sdk-api.dev2023.site/v1';
    static BodyParamTypes = {
        setBody: 'set body',
        property: 'property',
    };
    static initialize({ apiKey }) {
        if (apiKey) this.apiKey = apiKey;
    }

    static getBody(params, bodyParams) {
        if (!params || !bodyParams || !bodyParams.length) {
            return undefined;
        }
        let body = {};
        bodyParams.forEach(({ key, type, required }) => {
            if (params[key] === undefined) {
                if (required) throw new Error(`param ${key} is required!`);
            } else if (type === this.BodyParamTypes.setBody) {
                body = params[key];
            } else {
                body[key] = params[key];
            }
            delete params[key];
        });
        console.log(body);
        return body;
    }

    static getParameterizedUrl(url, params) {
        if (!Object.keys(params).length) return url;

        // find url params, they start with :
        const requiredParams = url.split('/').filter(s => s && s.includes(':'));
        if (!requiredParams.length) return url;

        let parameterizedUrl = url;
        requiredParams.forEach(p => {
            // strip the : and replace with param value
            const key = p.substr(1);
            const value = params[key];
            if (!value) {
                throw new Error(`required param ${key} not provided`);
            }
            parameterizedUrl = parameterizedUrl.replace(p, value);

            // remove required param from param list
            // so it doesn't become part of the query params
            delete params[key];
        });

        return parameterizedUrl;
    }

    static getNextOptions(result, options) {
        const nextOptions = { ...options };
        if (!result || !result.page_size || !result.total || result.page === undefined) return options
        if (result.cursor) {
            if (result.cursor !== "") nextOptions.cursor = result.cursor;
        } else {
            if (result.total > (result.page_size * (result.page + 1))) {
                nextOptions.offset = (result.page + 1) * (nextOptions.limit || 500);
            }
        }

        return nextOptions;
    }

    static checkObjEqual = (...objects) => objects.every(obj => JSON.stringify(obj) === JSON.stringify(objects[0]));

    static getApiErrorMessage(error, url) {
        return (
            error?.response?.data?.message ||
            error?.message ||
            error?.toString() ||
            `Web3 API error while calling ${url}`
        );
    }

    static async fetch({ endpoint, params: providedParams }) {
        const params = { ...providedParams };
        return this.fetchFromApi(endpoint, params);
    }

    static async fetchFromApi(endpoint, params) {
        const { method = 'GET', url, bodyParams } = endpoint;

        try {
            const parameterizedUrl = this.getParameterizedUrl(url, params);
            const data = this.getBody(params, bodyParams);
            const response = await axios(this.baseURL + parameterizedUrl, {
                params,
                method,
                data,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                },
            });
            const result = response.data;
            const nextOptions = this.getNextOptions(result, params);
            if (!this.checkObjEqual(nextOptions, params)) result.next = () => this.fetchFromApi(endpoint, nextOptions);
            return result
        } catch (error) {
            console.log(error);
            let msg = this.getApiErrorMessage(error, url);
            throw new Error(msg);
        }
    }

    static accounts = {
        createAccount: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "POST",
                "group": "accounts",
                "name": "createAccount",
                "url": "/accounts/create",
                "bodyParams": [{ "key": "data", "type": "set body", "required": false }]
            },
            params: options
        }),
        activateAccount: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "POST",
                "group": "accounts",
                "name": "activateAccount",
                "url": "/accounts/activate",
                "bodyParams": [{ "key": "data", "type": "set body", "required": false }]
            },
            params: options
        }),
        getAccount: async (options = {}) =>
            Web3Api.fetch({
                endpoint: {
                    "method": "GET",
                    "group": "accounts",
                    "name": "getAccount",
                    "url": "/accounts/:uid"
                },
                params: options
            })
        ,
    };

    static nfts = {
        getNfts: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "GET",
                "group": "nfts",
                "name": "getNFTs",
                "url": "/nfts/account/:uid"
            },
            params: options
        }),
        getNftsCount: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "GET",
                "group": "nfts",
                "name": "getNftsCount",
                "url": "/nfts/account/:uid/count"
            },
            params: options
        }),
        claimNft: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "POST",
                "group": "nfts",
                "name": "claimNft",
                "url": "/nfts/claim",
                "bodyParams": [{ "key": "data", "type": "set body", "required": false }]
            },
            params: options
        }),
        withdrawNft: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "POST",
                "group": "nfts",
                "name": "withdrawNft",
                "url": "/nfts/withdraw",
                "bodyParams": [{ "key": "data", "type": "set body", "required": false }]
            },
            params: options
        }),
    };

    static metadata = {
        getMetadata: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "GET",
                "group": "metadata",
                "name": "getMetadata",
                "url": "/metadata/:token_id"
            },
            params: options
        }),
        updateMetadata: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "POST",
                "group": "metadata",
                "name": "updateMetadata",
                "url": "/metadata/data",
                "bodyParams": [{ "key": "data", "type": "set body", "required": false }]
            },
            params: options
        }),
    };

    static transactions = {
        getTransactions: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "GET",
                "group": "transactions",
                "name": "getTransactions",
                "url": "/transactions/by_hash/:txn_hash"
            },
            params: options
        }),
        getTransactionsConfirmations: async (options = {}) => Web3Api.fetch({
            endpoint: {
                "method": "GET",
                "group": "transactions",
                "name": "getTransactionsConfirmations",
                "url": "/transactions/confirmations/:txn_hash"
            },
            params: options
        }),
    };
}
