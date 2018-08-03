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
            await dispense();
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
                        console.log('STOP OPERATION');
                        dispenseScheduledJob.stop();
                        await tanktrackApi.acknowledgeWork();
                        break;
                    case 'START':
                        console.log('START OPERATION');
                        dispenseScheduledJob.start();
                        await tanktrackApi.acknowledgeWork();
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
