const request = require('request');
class TanktrackApi {
    constructor(options) {
        this.domain = options.domain;
        this.tankId = options.tankId;
    }
    async getTankSettings() {
        return new Promise((res, rej) => {
            request({
                method: 'GET',
                uri: `${this.domain}/tank/${this.tankId}/settings`
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(response);
            })
        });
    }
    async getWork() {
        return new Promise((res, rej) => {
            request({
                method: 'GET',
                uri: `${this.domain}/tank/${this.tankId}/work`
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(response);
            })
        });
    }
    async acknowledgeWork() {
        return new Promise((res, rej) => {
            request({
                method: 'POST',
                uri: `${this.domain}/tank/${this.tankId}/work`
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(response);
            })
        });
    }
    async sendReport(report) {
        return new Promise((res, rej) => {
            request({
                method: 'POST',
                uri: `${this.domain}/tank/${this.tankId}/report`,
                body: { report }
            }, (err, response, body) => {
                if (err) {
                    return rej(err);
                }
                return res(response);
            })
        });
    }
}

module.exports = TanktrackApi;