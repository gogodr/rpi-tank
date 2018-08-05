const Gpio = require('pigpio').Gpio;
const CronJob = require('cron').CronJob;

const TankInterface = require('./interfaces/tank');
const TanktrackApi = require('./interfaces/tanktrak_api');

let dispenseScheduledJob;
let tank;
let tanktrackApi;
let schedule;


async function getTankSettings() {
    tankSettings = await tranktrackApi.getTankSettings();
    tank.updateSettings(tankSettings);
    dispenseScheduledJob.setTime(tank.schedule);
}

async function dispense() {
    try {
        await tank.dispense();
        await tranktrackApi.sendReport('SUCCESSFUL_DISPENSE');
    } catch (e) {
        await tranktrackApi.sendReport(e);
    }
}

async function setup() {
    schedule = config.get('tankSettings.schedule');
    tanktrackApi = new TanktrackApi({
        domain: config.get('apiDomain'),
        tankId: config.get('tankSettings.tankId')
    })
    tank = new TankInterface({
        toDispense: config.get('tankSettings.toDispense'),
        schedule: config.get('tankSettings.schedule')
    });
    tankSettings = await tranktrackApi.getTankSettings();

    dispenseScheduledJob = new CronJob({
        cronTime: tank.schedule,
        onTick: async () => {
            const currentTime = Date.now()
            if (currentTime - tank.lastDispenseTime > 84600000) { // 23.5 hours
                await dispense();
            } else {
                console.log(`OPERATION ERROR: Too soon to dispense, last dispense was ${moment().from(tank.lastDispenseTime)}`);
            }
        },
        start: true,
        timeZone: 'America/Lima'
    });

    getWorkJob = new CronJob({
        cronTime: '00 */5 * * * *',
        onTick: async () => {
            try {
                work = await tranktrackApi.getWork();
                switch (work) {
                    case 'OPERATION':
                        console.log('CONTINUE OPERATION');
                        if (!dispenseScheduledJob.running) {
                            console.log('OPERATION NOT RUNING, RESUMING OPERATION');
                            dispenseScheduledJob.start();
                            await tranktrackApi.sendReport('OPERATION_RESUMED');
                        }
                        break;
                    case 'OPERATION_STOPPED':
                        console.log('OPERATION HALTED');
                        if (dispenseScheduledJob.running) {
                            console.log('OPERATION RUNING, STOPPING OPERATION');
                            dispenseScheduledJob.stop();
                            await tranktrackApi.sendReport('OPERATION_STOPPED');
                        }
                        break;
                    case 'OVERRIDE':
                        console.log('OVERRIDE DISPENSE');
                        await dispense();
                        await tanktrackApi.acknowledgeWork();
                        break;
                    case 'NEW_SETTINGS':
                        console.log('GET NEW TANK SETTINGS');
                        await getTankSettings();
                        await tanktrackApi.acknowledgeWork();
                        break;
                    case 'STOP':
                        if (dispenseScheduledJob.running) {
                            console.log('STOP OPERATION');
                            dispenseScheduledJob.stop();
                            await tanktrackApi.acknowledgeWork();
                        }
                        break;
                    case 'START':
                        if (!dispenseScheduledJob.running) {
                            console.log('START OPERATION');
                            dispenseScheduledJob.start();
                            await tanktrackApi.acknowledgeWork();
                        }
                        break;
                    default:
                        console.log('getWorkJob:', work);
                        break;
                }
            } catch (e) {
                console.log('getWorkJob ERROR', e);
            }
        },
        start: true,
        timeZone: 'America/Lima'
    });
}

setup();
