const Gpio = require('pigpio').Gpio;
const CronJob = require('cron').CronJob;

let dispenseScheduledJob;
let flotMeterSensor;
let sensorTickCount = 0;
let calibrationFactor = 1;

async function setup(){    
    flotMeterSensor = new Gpio(20, {
        mode: Gpio.INPUT,
        pullUpDown: Gpio.PUD_DOWN,
        edge: Gpio.FALLING_EDGE
      });
    flotMeterSensor.on('interrupt', (level)=>{
        sensorTickCount++;
    })
    dispenseScheduledJob = new CronJob({
        //cronTime: '00 00 01 * * *',
        cronTime: '00 * * * * *',
        onTick: async () => {
            console.log('Start Dispense');
            try {
                await dispense();
                console.log('SUCCESS')
            } catch (e) {
                if(e === 'TICKS_END') {                    
                }else{
                    console.log('Error dispensing', e);
                }
            }
        },
        start: true,
        timeZone: 'America/Lima'
    });

}


async function dispense() {
    return new Promise((res, rej) => {
        let dispensedAmount = 0;
        let dispenseTicks = 0;
        let lastTime = Date.now();
        flotMeterSensor.enableInterrupt(Gpio.FALLING_EDGE)
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

                if (dispensedAmount >= 3000) {
                    // Successful dispense
                    dispenseTask.stop();
                    flotMeterSensor.disableInterrupt()
                    return res()
                }
                if (dispenseTicks >= 30) {
                    // Unsucessful dispense, check valve
                    dispenseTask.stop();
                    flotMeterSensor.disableInterrupt()
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
