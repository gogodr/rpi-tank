const request = require('request');
class TanktrackApi {
    constructor(options) {
        this.domain = options.domain;
        this.tankId = options.tankId;
    }
    async getTankSettings() {
        return Promise((res, rej) => {
            request({
                method: 'GET',
                uri: `${domain}/tank/${tankId}/settings`
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(body);
            })
        });
    }
    async getWork() {
        return Promise((res, rej) => {
            request({
                method: 'GET',
                uri: `${domain}/tank/${tankId}/work`
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(body);
            })
        });
    }
    async acknowledgeWork() {
        return Promise((res, rej) => {
            request({
                method: 'POST',
                uri: `${domain}/tank/${tankId}/work`
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(body);
            })
        });
    }
    async sendReport(report) {
        return Promise((res, rej) => {
            request({
                method: 'POST',
                uri: `${domain}/tank/${tankId}/report`,
                body: { report }
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(body);
            })
        });
    }
}

module.exports = TanktrackApi;