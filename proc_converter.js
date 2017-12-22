/* eslint-disable max-len */
const ON_OFF_30 = [0x30, 'on', 'off'];
const ON_OFF_41 = [0x41, 'on', 'off'];
const AVAILABILITY = [0x41, 'available', 'none'];
const OPEN_CLOSE_41 = [0x41, 'open', 'close', 'stop'];
const LEVEL3 = [0x41, 'low', 'mid', 'high', 'none'];
const LOCATION_LIST = [0, 'undefined',
    'living', 'dining', 'kitchen', 'bathroom', 'washroom',
    'dressingroom', 'passageway', 'room', 'stairway', 'frontdoor',
    'storeroom', 'garden', 'garage', 'balcony', 'others'];
const POWER_SAVING = [0x41, 'power_saving', 'normal'];

const LOCK_STATE = [0x41, 'locked', 'unlocked'];
const LOCK_ALARM_STATE = [0x40, 'ok', 'break_open', 'door_open', 'manual_unlocked', 'tampered'];
const LOCK_BATTERY_STATE = [0x40, 'ok', 'low'];

const SHUTTER_SELECTIVE_OPEN = [0x41, 'set_position_open', 'time_open', 'time_close', 'local_set_position', 'slit_settings'];
const SHUTTER_OPENNESS = [0x41, 'full_open', 'full_close', 'opening', 'closing', 'stop_halfway'];

const AIRCON_MODE_LIST = [0x40, 'others', 'auto', 'cool', 'heat', 'dry', 'wind'];
const AIRCON_TYPE_OPERATION = [0x41, 'normal', 'high_speed', 'silent'];
const BATTERY_INTERCONNECT = [0,
    'interconnected_reverse', 'independent', 'interconnected_no_reverse'];
const BATTERY_STATE = [0x40,
    'other', 'rapid_charge', 'charge', 'discharge', 'standby', 'test', 'auto',
    'idle', 'restart', 'capacity_recalculating'];
const BATTERY_TYPE = [0,
    'unknown', 'lead', 'nickel_metal_hydride', 'nickel_cadmium', 'lithium_ion',
    'zinc', 'rechargeable_alkaline'];
const POWER_GENERATION_STATUS = [0x41, 'generating', 'stopped', 'starting', 'stopping', 'idling'];
const ECOCUTE_WATER_WARMER = [0x41, 'warming', 'reset'];
const ECOCUTE_BATH_OPERATION_STATUS = [0x41, 'supplying_hot_water', 'stopped', 'keeping_bath_temperature'];

const LIGHT_COLOR = [0x40, 'other', 'incandescent', 'white', 'daylight_white', 'daylight_color'];
const LIGHTING_MODE_SETTING = [0x41, 'auto', 'standard', 'night', 'off', 'color'];
/* eslint-enable max-len */


const enumForward = (value, array) => {
    return array[value[0]-array[0]+1];
};
const enumBackward = (value, array) => {
    return [array.indexOf(value.toLowerCase())-1+array[0]];
};

// Pure enum
const REMOTE_SETTINGS = {
    keys: [0x41, 0x42, 0x61, 0x62],
    values: ['remote_access', 'direct_access', 'connected', 'disconnected'],
};
const EV_BATTERY_STATE = {
    keys: [0xff, 0x30, 0x40, 0x41, 0x42, 0x43],
    values: [
        'undetermined', 'not_connected',
        'connected_not_chargeable_not_dischargeable',
        'connected_chargeable_not_dischargeable',
        'connected_not_chargeable_dischargeable',
        'connected_chargeable_dischargeable'],
};
const EV_CHARGER_DISCHARGER_TYPE = {
    keys: [0x12, 0x13, 0x21, 0x22, 0x23, 0x31, 0x32, 0x33,
        0x41, 0x42, 0x43, 0x51, 0x52, 0x53],
    values: [
        'ac_hlc_charge',
        'ac_hlc_charge_discharge',

        'dc_aa_charge',
        'dc_aa_charge_discharge',
        'dc_aa_discharge',

        'dc_bb_charge',
        'dc_bb_charge_discharge',
        'dc_bb_discharge',

        'dc_ee_charge',
        'dc_ee_charge_discharge',
        'dc_ee_discharge',

        'dc_ff_charge',
        'dc_ff_charge_discharge',
        'dc_ff_discharge',
    ],
};

const pureEnumForward = (x, setting) => {
    setting.values[setting.keys.indexOf(x[0])];
};
const pureEnumBackward = (x, setting) => {
    setting.keys[setting.values.indexOf(x.toLowerCase())];
};


const toHexStr = (x) => x.map((xi)=>('0'+xi.toString(16)).slice(-2)).join('');
const toAsciiStr = (x)=>String.fromCharCode(...x);
const arrayFromAsciiStr = (x, len)=>{
    let re=[];
    for (let i=0; i<x.length; ++i) {
        re.push(x.charCodeAt(i));
    }
    while (re.length<len) {
        re.push(0);
    }
    return re;
};


const toInt = (array) =>{
    let ret = 0;
    Array.prototype.forEach.call(array, (a)=>{
        ret = ret*256+a;
    });
    return ret;
};
const intToArray = (val, arraySize) =>{
    let re=[];
    let i;
    for (i=0; i<arraySize; ++i) {
        re.unshift(val%256);
        val = Math.floor(val/256);
    }
    for (;i<arraySize; ++i) {
        re.unshift(0);
    }
    return re;
};
const yymdForward = (x) => toInt([x[0], x[1]])+'/'+x[2]+'/'+x[3]; // [year1,year2,month,day]
const yymdBackward = (x) => { // year/month/day
    x = x.split('/');
    let re = intToArray(parseInt(x[0]), 2);
    re.push(parseInt(x[1]));
    re.push(parseInt(x[2]));
    return re;
};
const hmForward = (x) => `${x[0]}:${x[1]}`;
const hmBackward = (x) => x.split(':').map(parseInt);

const msForward = hmForward;
const msBackward = hmBackward;

const hmsForward = (x) => `${x[0]}:${x[1]}:${x[2]}`;

const NULLPROP=()=>undefined;

const COMMUNICATION_ID = [
    'undefined', 'plc_ad', null, 'low_power_radio', 'hbs', 'irda', 'lontalk',
    'bluetooth', 'ethernet', '802.11', 'plc_c', 'v6ethernet', 'v6lowpan',
    null, null, null, 'others',
];
let commIdRead = (x)=>
    COMMUNICATION_ID[Math.floor(x[0]/16)] +':'+toHexStr(x.slice(1));

let fs = require('fs');

const MYPATH = __filename.split('/').slice(0, -1).join('/');
let MAKER_CODES;
try {
    MAKER_CODES = JSON.parse(fs.readFileSync(
        MYPATH+'/makercodes.json', 'utf-8'));
} catch (e) {}


// Two function are set for each epc. Both can be omited.
// The first one converts from hex string (possibly more than 2 characters)
// to human-readable string. The second one converts from human-readable
// string to hex string (possibly more than 2 characters).
// It is important for the second function to return the input string
// as is, when expected input strings are not provided.

exports.eojs = {
    '0000': { // device super class
        '80': [(x)=>enumForward(x, ON_OFF_30), (x)=>enumBackward(x, ON_OFF_30)], // Operation Status
        '81': [(x)=>enumForward([Math.min(15, x[0]>>3)], LOCATION_LIST), // Install Location
            (x)=>{
                let i = LOCATION_LIST.indexOf(x.toLowerCase())-1;
                return [i<0 ? 0 : (i<<3)+1];
            }],
        '82': [(x)=>String.fromCharCode(x[2])], // Version (RO:Read only)
        '83': [commIdRead],
        '84': [toInt],
        '85': [(x)=>0.001*toInt(x)],
        '87': [toInt, (x)=>[x]],
        '88': [(x)=>enumForward(x, ON_OFF_41)], // Error state (RO)
        '8a': [(x)=>{
            x = toInt(x);
            if (x==0) return 'unknown';
            if (MAKER_CODES!=null) {
                let nx = MAKER_CODES[('0000000'+x.toString()).slice(-8)];
                if (nx != null) x = nx;
            }
            return x;
        }], // Manufacture code (RO)
        '8b': [NULLPROP],
        '8c': [toAsciiStr],
        '8d': [toAsciiStr],
        '8e': [yymdForward],
        '8f': [(x)=>enumForward(x, POWER_SAVING),
            (x)=>enumBackward(x, POWER_SAVING)],
        '93': [(x)=>pureEnumForward(x, REMOTE_SETTINGS),
            (x)=>pureEnumBackward(x, REMOTE_SETTINGS)],
        '97': [msForward, msBackward],
        '98': [yymdForward, yymdBackward],
        '99': [toInt, (x)=>intToArray(x, 2)],
        '9d': [NULLPROP], '9e': [NULLPROP], '9f': [NULLPROP],
    },

    '0ef0': { // Node profile
        '80': [(x)=>enumForward(x, ON_OFF_30), (x)=>enumBackward(x, ON_OFF_30)], // Operation Status
        '8a': [toHexStr],
        '8d': [toHexStr], // 要確認
        '8e': [yymdForward],
        '9d': [NULLPROP], '9e': [NULLPROP], '9f': [NULLPROP],
        'd3': [NULLPROP], 'd4': [NULLPROP], 'd5': [NULLPROP],
        'd6': [NULLPROP], 'd7': [NULLPROP],
    },

    '0011': { // Temp sensor
        'e0': [(x)=>{
            let n = toInt(x); return 0.1*(n<0x8000?n:n-0x10000);
        }], // Temperature
    },

    '0130': {
        'b0': [(x)=>enumForward(x, AIRCON_MODE_LIST),
            (x)=>enumBackward(x, AIRCON_MODE_LIST)],
        'b1': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'b2': [(x)=>enumForward(x, AIRCON_TYPE_OPERATION),
            (x)=>enumBackward(x, AIRCON_TYPE_OPERATION)],
        'b3': [(x)=>x[0], (x)=>[parseInt(x)]], // Temperature
        'b4': [(x)=>x[0], (x)=>[parseInt(x)]],
        'b5': [(x)=>x[0], (x)=>[parseInt(x)]],
        'b6': [(x)=>x[0], (x)=>[parseInt(x)]],
        'b7': [(x)=>x[0], (x)=>[parseInt(x)]],
        'b8': [toInt],
        'b9': [(x)=>toInt(x)*0.1],
        'ba': [toInt],
        'bb': [(x)=>[(x[0]<125?x[0]:x[0]-256)]], // Room temperature (RO)
        'bc': [toInt],
        'bd': [(x)=>[(x[0]<125?x[0]:x[0]-256)]],
        'be': [(x)=>[(x[0]<125?x[0]:x[0]-256)]],
        'bf': [(x)=>[0.1*(x[0]<125?x[0]:(x[0]-256)), (x)=>{
            x=Math.floor(x*10); return x<0?256+x:x;
        }]],
        'a0': // Wind speed
            [(x) => (x[0]==0x41 ? -1 /* Auto*/ : x[0]-0x30),
                (x) => [x==-1?0x41:x+0x30]],
        'c1': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        '91': [hmForward, hmBackward],
        '92': [hmForward, hmBackward],
        '95': [hmForward, hmBackward],
        '96': [hmForward, hmBackward],
    },

    '0260': { // E blind
        '90': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'c2': [(x)=>enumForward(x, AVAILABILITY)],
        'c3': [(x)=>enumForward(x, AVAILABILITY)],
        'd0': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'd1': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'd2': [(x)=>x[0], (x)=>[parseInt(x)]],
        'd4': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e0': [(x)=>enumForward(x, OPEN_CLOSE_41),
            (x)=>enumBackward(x, OPEN_CLOSE_41)],
        'e1': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e2': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e3': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'e5': [(x)=>enumForward(x, LOCK_STATE),
            (x)=>enumBackward(x, LOCK_STATE)],
        'e8': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e9': [(x)=>enumForward(x, SHUTTER_SELECTIVE_OPEN),
            (x)=>enumBackward(x, SHUTTER_SELECTIVE_OPEN)],
        'ea': [(x)=>enumForward(x, SHUTTER_OPENNESS)],
        'ee': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'ef': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
    },

    '0261': { // E shutter
        '90': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'd0': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'd1': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'd2': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e0': [(x)=>enumForward(x, OPEN_CLOSE_41),
            (x)=>enumBackward(x, OPEN_CLOSE_41)],
        'e1': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e2': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e3': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'e5': [(x)=>enumForward(x, LOCK_STATE),
            (x)=>enumBackward(x, LOCK_STATE)],
        'e8': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e9': [(x)=>enumForward(x, SHUTTER_SELECTIVE_OPEN),
            (x)=>enumBackward(x, SHUTTER_SELECTIVE_OPEN)],
        'ea': [(x)=>enumForward(x, SHUTTER_OPENNESS)],
        'ed': [(x)=>(x[0]-0x30), (x)=>[parseInt(x)+0x30]],
        'ee': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'ef': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
    },

    '0263': { // E shutter
        '90': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'd0': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'd1': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'd2': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e0': [(x)=>enumForward(x, OPEN_CLOSE_41),
            (x)=>enumBackward(x, OPEN_CLOSE_41)],
        'e1': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e2': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e3': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'e5': [(x)=>enumForward(x, LOCK_STATE),
            (x)=>enumBackward(x, LOCK_STATE)],
        'e8': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e9': [(x)=>enumForward(x, SHUTTER_SELECTIVE_OPEN),
            (x)=>enumBackward(x, SHUTTER_SELECTIVE_OPEN)],
        'ea': [(x)=>enumForward(x, SHUTTER_OPENNESS)],
        'ed': [(x)=>(x[0]-0x30), (x)=>[parseInt(x)+0x30]],
        'ee': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
        'ef': [(x)=>enumForward(x, LEVEL3), (x)=>enumBackward(x, LEVEL3)],
    },

    '026f': { // E lock
        'e0': [(x)=>enumForward(x, LOCK_STATE),
            (x)=>enumBackward(x, LOCK_STATE)],
        'e1': [(x)=>enumForward(x, LOCK_STATE),
            (x)=>enumBackward(x, LOCK_STATE)],
        'e2': [(x)=>enumForward(x, LOCK_STATE)],
        'e3': [(x)=>enumForward(x, OPEN_CLOSE_41)],
        'e4': [(x)=>enumForward(x, ON_OFF_41)],
        'e5': [(x)=>enumForward(x, LOCK_ALARM_STATE)],
        'e6': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e7': [(x)=>enumForward(x, LOCK_BATTERY_STATE),
            (x)=>enumBackward(x, LOCK_BATTERY_STATE)],
    },
    '0279': { // Solar panel
        'd0': [(x)=>enumForward(x, BATTERY_INTERCONNECT)],
        'e0': [toInt],
        'e1': [(x)=>0.001*toInt(x)],
    },
    '027c': { // Fuel cell battery
        'c1': [(x)=>x[0]],
        'c2': [toInt],
        'c3': [toInt],
        'c4': [toInt],
        'c5': [(x)=>toInt(x)*0.001],
        'c7': [(x)=>toInt(x)*0.001],
        'c8': [(x)=>toInt(x)*0.001],
        'ca': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'cb': [(x)=>enumForward(x, POWER_GENERATION_STATUS)],
        'cc': [toInt],
        'cd': [(x)=>toInt(x)*0.001],
        'd0': [(x)=>enumForward(x, BATTERY_INTERCONNECT)],
        'e1': [(x)=>x[0]],
        'e2': [toInt],
    },
    '027d': { // Storage battery
        'a0': [toInt],
        'a1': [toInt],
        'a2': [toInt],
        'a3': [toInt],
        'a4': [toInt],
        'a5': [toInt],
        'a6': [(x)=>x[0], (x)=>[parseInt(x)]],
        'a7': [(x)=>x[0], (x)=>[parseInt(x)]],
        'a8': [(x)=>toInt(x)*0.001],
        'a9': [(x)=>toInt(x)*0.001],
        'aa': [toInt, (x)=>intToArray(x, 4)],
        'ab': [toInt, (x)=>intToArray(x, 4)],
        'c8': [(x)=>[toInt(x.slice(0, 4)), toInt(x.slice(4, 8))]],
        'c9': [(x)=>[toInt(x.slice(0, 4)), toInt(x.slice(4, 8))]],
        'cf': [(x)=>enumForward(x, BATTERY_STATE)],
        'da': [(x)=>enumForward(x, BATTERY_STATE),
            (x)=>enumBackward(x, BATTERY_STATE)],
        'db': [(x)=>enumForward(x, BATTERY_INTERCONNECT)],
        'e2': [toInt],
        'e3': [toInt],
        'e4': [toInt],
        'e6': [(x)=>enumForward(x, BATTERY_TYPE)],
    },
    '027e': { // EV battery
        'c0': [toInt],
        'c1': [(x)=>toInt(x)*0.1],
        'c2': [toInt],
        'c3': [(x)=>toInt(x)*0.1],
        'c4': [toInt],
        'c5': [toInt],
        'c6': [toInt],
        'c7': [(x)=>pureEnumForward(x, EV_BATTERY_STATE)],
        'c8': [(x)=>[toInt(x.slice(0, 4)), toInt(x.slice(4, 8))]],
        'c9': [(x)=>[toInt(x.slice(0, 4)), toInt(x.slice(4, 8))]],
        'ca': [(x)=>toInt(x)*0.1],
        'cb': [(x)=>toInt(x)*0.1],
        'cc': [(x)=>pureEnumForward(x, EV_CHARGER_DISCHARGER_TYPE)],
        'cd': [undefined, (x)=>[0x10]], // Set only. accepts anything
        'd0': [toInt],
        'd1': [(x)=>toInt(x)*0.1],
        'd2': [toInt],
        'd3': [(x)=>{
            let v=toInt(x); return v<=0x3b9ac9ff?v:v-0x100000000;
        }],
        'd4': [(x)=>{
            let a=toInt(x); return 0.1*(a<0x7fff?a:a-0x10000);
        }],
        'd5': [(x)=>{
            let v=toInt(x); return v<0x7fff?v:v-0x10000;
        }],
        'da': [(x)=>enumForward(x, BATTERY_STATE),
            (x)=>enumBackward(x, BATTERY_STATE)],
        'db': [(x)=>enumForward(x, BATTERY_INTERCONNECT)],
        'e2': [toInt],
        'e3': [toInt],
        'e4': [toInt],
        'e7': [toInt, (x)=>intToArray(x, 4)],
        'e9': [(x)=>toInt(x)*0.1, (x)=>intToArray(Math.floor(x*10), 2)],
        'eb': [toInt, (x)=>intToArray(x, 4)],
        'ec': [toInt, (x)=>intToArray(x, 4)],
        'ed': [(x)=>toInt(x)*0.1, (x)=>intToArray(Math.floor(x*10), 2)],
        'ee': [(x)=>toInt(x)*0.1, (x)=>intToArray(Math.floor(x*10), 2)],
        'ef': [toInt],
    },


    '0272': { // Instantaneous water heter (Ecocute)
        'd0': [(x)=>enumForward(x, ON_OFF_41)],
        'd1': [(x)=>x[0], (x)=>[parseInt(x)]],
        'd2': [(x)=>enumForward(x, ECOCUTE_WATER_WARMER),
            (x)=>enumBackward(x, ECOCUTE_WATER_WARMER)],
        'da': [hmForward, hmBackward],
        'db': [hmForward],
        'e1': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e2': [(x)=>enumForward(x, ON_OFF_41)],
        'e3': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e4': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e5': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e6': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e7': [(x)=>x[0], (x)=>[parseInt(x)]],
        'e8': [(x)=>x[0]-0x30, (x)=>[parseInt(x)+0x30]],
        'ee': [toInt, (x)=>intToArray(x, 2)],
        'd4': [(x)=>x[0], (x)=>[parseInt(x)]],
        'd5': [(x)=>x[0]],
        'e9': [(x)=>enumForward(x, ON_OFF_41)],
        'ea': [(x)=>enumForward(x, ON_OFF_41)],
        'eb': [(x)=>enumForward(x, ON_OFF_41)],
        'ef': [(x)=>enumForward(x, ECOCUTE_BATH_OPERATION_STATUS)],
        'ec': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'ed': [hmForward, hmBackward],
        '90': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        '91': [hmForward, hmBackward],
        '92': [hmForward, hmBackward],
        'd6': [toInt, (x)=>intToArray(x, 2)],
        'd7': [(x)=>enumForward(x, ON_OFF_30), (x)=>enumBackward(x, ON_OFF_30)],


    },

    '0288': { // Smart meter
        'd7': [toInt],
        'e0': [toInt],
        'e1': [(x)=>{
            let i=toInt(x); return i<5?Math.pow(10, -i):Math.pow(10, i);
        }],
        'e2': [(x)=> {
            let re = {day: toInt(x.slice(0, 2)), value: []};
            for (let i=0; i<48; ++i) {
                re.value.push(toInt(x.slice(2+i*4), 4));
            }
            return re;
        }],
        'e3': [toInt],
        'e4': [(x)=> {
            let re = {day: toInt(x.slice(0, 2)), value: []};
            for (let i=0; i<48; ++i) {
                re.value.push(toInt(x.slice(2+i*4), 4));
            }
            return re;
        }],
        'e5': [toInt, (x)=>[parseInt(x)]],
        'e7': [toInt],
        'e8': [(x)=>[x.slice(0, 2), x.slice(2, 4)].map((ar)=>{
            let i = toInt(ar);
            return i<0x8000 ? i*0.1 : -(0x10000-i)*0.1;
        })],
        'ea': [(x)=>[yymdForward(x), hmsForward(x.slice(4, 7)),
            toInt(x.slice(7))]],
        'eb': [(x)=>[yymdForward(x), hmsForward(x.slice(4, 7)),
            toInt(x.slice(7))]],
    },

    '0290': { // Generic light
        'b1': [(x)=>enumForward(x, LIGHT_COLOR),
            (x)=>enumBackward(x, LIGHT_COLOR)],
        'b2': [toInt, (x)=>[parseInt(x)]],
        'b3': [toInt, (x)=>[parseInt(x)]],
        'b4': [(x)=>x, (x)=>x],
        'b5': [(x)=>x, (x)=>x],
        'b6': [(x)=>enumForward(x, LIGHTING_MODE_SETTING),
            (x)=>enumBackward(x, LIGHTING_MODE_SETTING)],
        'b7': [toInt, (x)=>[parseInt(x)]],
        'b8': [toInt, (x)=>[parseInt(x)]],
        'b9': [toInt, (x)=>[parseInt(x)]],
        'ba': [toInt, (x)=>[parseInt(x)]],
        'bb': [(x)=>enumForward(x, LIGHT_COLOR),
            (x)=>enumBackward(x, LIGHT_COLOR)],
        'bc': [toInt, (x)=>[parseInt(x)]],
        'bd': [(x)=>enumForward(x, LIGHT_COLOR),
            (x)=>enumBackward(x, LIGHT_COLOR)],
        'be': [toInt, (x)=>[parseInt(x)]],
        'bf': [(x)=>enumForward(x, LIGHTING_MODE_SETTING),
            (x)=>enumBackward(x, LIGHTING_MODE_SETTING)],
        'c0': [(x)=>x, (x)=>x],
        '90': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        '91': [hmForward, hmBackward],
        '94': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        '95': [hmForward, hmBackward],
    },

    '02a0': { // Buzzer
        'b1': [(x)=>enumForward(x, ON_OFF_41), (x)=>enumBackward(x, ON_OFF_41)],
        'e0': [(x)=>(x[0]-0x30), (x)=>[x+0x30]],
    },

    '05fd': { // Switch class
        'e0': [toAsciiStr, (x)=>arrayFromAsciiStr(x, 12)],
    },

    '05ff': { // Controller class
        'c8': [toAsciiStr, // ManagementEquipmentProductCode
            (x)=>arrayFromAsciiStr(x, 12)],
    },
};
