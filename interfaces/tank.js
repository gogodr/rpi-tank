const Gpio = require('pigpio').Gpio;
const CronJob = require('cron').CronJob;

class TankInterface {
    calibrationFactor = 4;
    dispensing = false;
    lastDispenseTime;
    toDispense = 3000;
    schedule = '00 00 01 * * *';
    constructor(options) {
        this.flowMeterSensorGpio = new Gpio(20, {
            mode: Gpio.INPUT,
            pullUpDown: Gpio.PUD_DOWN,
            edge: Gpio.FALLING_EDGE
        });
        this.solenoidRelayGpio = new Gpio(18, { mode: Gpio.OUTPUT });
        this.airGateServoGpio = new Gpio(11, { mode: Gpio.OUTPUT });

        this._closeAirGate();
        this._closeSolenoid();

        this._sensorTickCount = 0;

        if (options) {
            if (options.toDispense) {
                this.toDispense = options.toDispense;
            }
            if (options.schedule) {
                this.schedule = options.schedule;
            }
        }

        this.flowMeterSensorGpio.on('interrupt', (level) => {
            this._sensorTickCount++;
        });
    }
    _openSolenoid() {
        this.solenoidRelayGpio.digitalWrite(0);
    }
    _closeSolenoid() {
        this.solenoidRelayGpio.digitalWrite(1);
    }
    _openAirGate() {
        this.airGateServoGpio.servoWrite(1000);
    }
    _closeAirGate() {
        this.airGateServoGpio.servoWrite(2000);
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
            this._openAirGate();
            this._openSolenoid();
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
                        this._closeAirGate();
                        this._closeSolenoid();
                        this.lastDispenseTime = Date.now();
                        this.dispensing = false;
                        console.log('==DISPENSE FINISHED==');
                        return res()
                    }

                    if (this.dispensed < 10) {
                        retries++;
                        console.log(`==DISPENSE ERROR: PROBING ${retries}==`);
                    }
                    if (retries > 8) {
                        this.dispenseTask.stop();
                        this.flowMeterSensorGpio.disableInterrupt()
                        this._closeAirGate();
                        this._closeSolenoid();
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