const Gpio = require('onoff').Gpio;
const CronJob = require('cron').CronJob;

let dispenseScheduledJob;
let flotMeterSensor;
let sensorTickCount = 0;
let calibrationFactor = 5;

async function setup(){    
    flotMeterSensor = new Gpio(25, 'in', 'falling');
    dispenseScheduledJob = new CronJob({
        //cronTime: '00 00 01 * * *',
        cronTime: '*/3 * * * * *',
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
        flotMeterSensor.watch(watchSensor);
        const dispenseTask = new CronJob({
            cronTime: '* * * * * *',
            onTick: () => {
                const currentTime = Date.now();
                const deltaTime = currentTime - lastTime;
                const mockReadValue = Math.random() + 5;
                dispensedAmount += Math.round(mockReadValue * (deltaTime / 1000) * calibrationFactor);
                dispenseTicks++;
                console.log('Dispensed: ', dispensedAmount);
                console.log('Delta Time: ', deltaTime);
                consoe.log('Sensor Ticks: ', sensorTickCount);

                if (dispensedAmount >= 600) {
                    // Successful dispense
                    dispenseTask.stop();
                    flotMeterSensor.unwatch(watchSensor);
                    return res()
                }
                if (dispenseTicks >= 30) {
                    // Unsucessful dispense, check valve
                    dispenseTask.stop();
                    flotMeterSensor.unwatch(watchSensor);
                    return rej('TICKS_END')
                }
                lastTime = currentTime;
                sensorTickCount = 0;
            },
            start: true
        });

    });
}
function watchSensor(err, val){
    if(err){
        console.log('ERROR WITH READING')
        console.log(err);
    }
    if(val == 0){
        sensorTickCount++
    }
}

setup();