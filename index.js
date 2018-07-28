const Gpio = require('pigpio').Gpio;
const CronJob = require('cron').CronJob;

let dispenseScheduledJob;
let flowMeterSensorGpio, solenoidRelayGpio, airGateServoGpio;
let sensorTickCount = 0;
let calibrationFactor = 1;
//servo 11
//gate 14
async function setup() {
    flowMeterSensorGpio = new Gpio(20, {
        mode: Gpio.INPUT,
        pullUpDown: Gpio.PUD_DOWN,
        edge: Gpio.FALLING_EDGE
    });
    solenoidRelayGpio = new Gpio(14, { mode: Gpio.OUTPUT });
    airGateServoGpio = new Gpio(11, { mode: Gpio.OUTPUT });
    closeAirGate();
    closeSolenoid();
    flowMeterSensorGpio.on('interrupt', (level) => {
        console.log('interrupt level: ', level)
        sensorTickCount++;
    });

    dispenseScheduledJob = new CronJob({
        //cronTime: '00 00 01 * * *',
        cronTime: '00 * * * * *',
        onTick: async () => {
            console.log('Start Dispense');
            try {
                await dispense();
                console.log('SUCCESS')
            } catch (e) {
                if (e === 'TICKS_END') {
                    console.log('TICKS ENDED - ABORT DISPENSING');
                } else {
                    console.log('Error dispensing', e);
                }
            }
        },
        start: true,
        timeZone: 'America/Lima'
    });

}
function openSolenoid(){
    solenoidRelayGpio.digitalWrite(1)
}
function closeSolenoid(){
    solenoidRelayGpio.digitalWrite(0)
}

function openAirGate(){
    airGateServoGpio.servoWrite(10000);
}
function closeAirGate(){
    airGateServoGpio.servoWrite(0);
}

async function dispense() {
    return new Promise((res, rej) => {
        let dispensedAmount = 0;
        let dispenseTicks = 0;
        let lastTime = Date.now();
        flowMeterSensorGpio.enableInterrupt(Gpio.FALLING_EDGE)
        openAirGate();
        openSolenoid();
        const dispenseTask = new CronJob({
            cronTime: '* * * * * *',
            onTick: () => {
                const currentTime = Date.now();
                const deltaTime = currentTime - lastTime;
                const mockReadValue = Math.random() + 5;
                dispensedAmount += Math.round(sensorTickCount * (deltaTime / 1000) * calibrationFactor);
                dispenseTicks++;
                console.log('Dispensed: ', dispensedAmount);
                console.log('Delta Time: ', deltaTime);
                console.log('Sensor Ticks: ', sensorTickCount);

                if (dispensedAmount >= 600) {
                    // Successful dispense
                    dispenseTask.stop();
                    flowMeterSensorGpio.disableInterrupt()
                    closeAirGate();
                    closeSolenoid();
                    return res()
                }
                if (dispenseTicks >= 30) {
                    // Unsucessful dispense, check valve
                    dispenseTask.stop();
                    flowMeterSensorGpio.disableInterrupt()
                    closeAirGate();
                    closeSolenoid();
                    return rej('TICKS_END')
                }
                lastTime = currentTime;
                sensorTickCount = 0;
            },
            start: true
        });

    });
}

setup();
