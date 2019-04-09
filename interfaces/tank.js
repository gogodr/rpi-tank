const Gpio = require('pigpio').Gpio;
const CronJob = require('cron').CronJob;

class TankInterface {
    constructor(options) {
        //Default Values
        this.calibrationFactor = 4.2;
        this.dispensing = false;
        this.lastDispenseTime = 0;
        this.toDispense = 3000;
        this.schedule = '00 00 01 * * *';
        this.openValue = 1000;
        this.closeValue = 1900;


        this.flowMeterSensorGpio = new Gpio(20, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_DOWN,
            edge: Gpio.FALLING_EDGE
        });
        this.valveServoGpio = new Gpio(10, { mode: Gpio.OUTPUT });
        this._closeValve();

        this._sensorTickCount = 0;

        if (options) {
            if (options.toDispense) {
                this.toDispense = options.toDispense;
            }
            if (options.schedule) {
                this.schedule = options.schedule;
            }
            if (options.openValue){
                this.openValue = options.openValue;
            }
            if (options.closeValue){
                this.closeValue = options.closeValue;
            }
        }

        this.flowMeterSensorGpio.on('interrupt', (level) => {
            this._sensorTickCount++;
        });
    }
    
    _openValve() {
        this.valveServoGpio.servoWrite(this.openValue);
    }
    _closeValve() {
        this.valveServoGpio.servoWrite(this.closeValue);
    }

    updateSettings(options) {
        if (options) {
            if (options.dispense_amount) {
                this.toDispense = options.dispense_amount;
            }
            if (options.schedule) {
                this.schedule = options.schedule;
            }
            if (options.last_dispense){
                this.lastDispenseTime = new Date(options.last_dispense)
            }
        }
    }

    async dispense() {
        return new Promise((res, rej) => {
            if (this.dispensing) {
                console.log('==DISPENSE ABORT: ALREADY DISPENSING==');
                return rej('ALREADY DISPENSING');
            }
            let dispensedAmount = 0;
            let lastTime = Date.now();
            let retries = 0;
            this.flowMeterSensorGpio.enableInterrupt(Gpio.FALLING_EDGE)
            this._openValve();
            this.dispensing = true;
            console.log('==START DISPENSE==');
            this.dispenseTask = new CronJob({
                cronTime: '* * * * * *',
                onTick: () => {
                    const currentTime = Date.now();
                    const deltaTime = currentTime - lastTime;
                    const dispensed = Math.round(this._sensorTickCount * (deltaTime / 1000) * this.calibrationFactor);
                    dispensedAmount += dispensed;
                    console.log('DISPENSED: ', dispensedAmount);

                    if (dispensedAmount >= this.toDispense) {
                        // Successful dispense
                        this.dispenseTask.stop();
                        this.flowMeterSensorGpio.disableInterrupt()
                        this._closeValve();
                        this.lastDispenseTime = Date.now();
                        this.dispensing = false;
                        console.log('==DISPENSE FINISHED==');
                        return res()
                    }

                    if (dispensed < 10) {
                        retries++;
                        console.log(`==DISPENSE ERROR: PROBING ${retries}==`);
                    }
                    if (retries > 8) {
                        this.dispenseTask.stop();
                        this.flowMeterSensorGpio.disableInterrupt()
                        this._closeValve();
                        this.dispensing = false;
                        console.log('==DISPENSE ABORT: FLUID STOPPED==');
                        return rej('DISPENSE_ERROR_STOPPED')
                    }
                    lastTime = currentTime;
                    this._sensorTickCount = 0;
                },
                start: true
            });

        });
    }

}

module.exports = TankInterface