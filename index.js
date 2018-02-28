// TODO:remove this eslint rule later
/* eslint-disable require-jsdoc */

const GET_TIMEOUT = 60 * 1000;
const MY_EOJ = [0x05, 0xff, 0x01];
const LOCALE = 'EN';
const RESPONSE_PREFIX = '/v1/echonet';

// first DEVICE_MULTICAST_INTITIAL_NUMBER accesses are done in every
// DEVICE_MULTICAST_INITIAL_INTERVAL ms. Then the frequency becomes
// DEVICE_MULTICAST_INTERVAL ms.
let DEVICE_MULTICAST_INTITIAL_NUMBER = 4;
const DEVICE_MULTICAST_INITIAL_INTERVAL = 15*1000;
const DEVICE_MULTICAST_INTERVAL = 60*1000;
// const NMCLI_CONNECTION_NAME_PREFIX = 'picogw_conn'; // Should be the same as this in admin plugin

/* // If you add 'makercode' entry to localstorage.json (as a number), the number is
// loaded to this MAKER_CODE variable.
var MAKER_CODE = 0 ;*/

const EL = require('echonet-lite');
const ProcConverter = require('./proc_converter.js');


let pi;
let log = console.log;
let localStorage;

let macs = {};
let macsObj = {};
function savemac() {
    localStorage.setItem('macs', macs);
}

/* macs entry format:
key:macaddress
value: {
    // ip : LAST_AVAILABLE_IP_ADDRESS, ('ip' and 'active' is now only in macsObj)
    // active:true (at least one message is received since last boot.)|false (otherwise),
    nodeprofile : {
         version: VERSION(0x82) , id: ID(0x83) ,date: PRODUCTION_DATE(0x8e / optional))
    },
    devices :{
        DEVICE_ID (etc. DomesticHomeAirConditioner_1) : {
              eoj : object identifier (eg. 0x013001)
            , active :  true (the device is registered to the controller)
                        | false (the user deleted this device)
                        | null (the device is not registered yet)
            , location : 0x81
            , error : 0x88
            , date : PRODUCTION_DATE (0x8e / optional)
            , worktime : cumulated working time (0x9a / optional)
            , propertymap : [] array of available properties
            , options : {} device specific information extracted from devices DB
        },
    },
    eoj_id_map : {    // EOJ (eg.013001) to DEVICE_ID (eg. DomesticHomeAirConditioner_1) mapping
        EOJ: DEVICE_ID,
    }
}
*/

function expandDeviceIdFromPossiblyRegExpDeviceId(deviceIdWithRegexp) {
    let re = [];
    let regexp = new RegExp(deviceIdWithRegexp);
    for (const macinfo of Object.values(macs)) {
        for (const devid of Object.keys(macinfo.devices)) {
            if (devid.match(regexp)) {
                re.push(devid);
            }
        }
    }

    return re;
}

function getMacFromDeviceId(deviceId) {
    for (const mac of Object.keys(macs)) {
        for (const devid of Object.keys(macs[mac].devices)) {
            if (devid == deviceId) {
                return mac;
            }
        }
    }
    return undefined;
}

function assert(bAssertion, msg) {
    if (bAssertion === true) return;
    if (typeof msg == 'string') {
        log('Assertion failed:'+msg);
    } else {
        log('Assertion failed');
    }
}

let ELDB = {};

// const IP_UNDEFINED = '-';

module.exports = {
    init: init,
    onCall: onProcCall,
    onUIGetSettings: onUIGetSettings,
    onUIGetSettingsSchema: onUIGetSettingsSchema,
    onUISetSettings: onUISetSettings,
};
async function init(pluginInterface) {
    pi = pluginInterface;
    log = pi.log;

    localStorage = pi.localStorage;
    macs = localStorage.getItem('macs', {});
    // MAKER_CODE = localStorage.getItem('makercode',MAKER_CODE) ;

    // Reset states
    for (const macinfo of Object.values(macs)) {
        macinfo.active = false;
        for (const dev of Object.values(macinfo.devices)) {
            dev.active = false;
        }
    }


    /*
    function setIPAddressAsUnknown(ip) {
        if (ip == IP_UNDEFINED) return;
        for (const macinfo of Object.values(macs)) {
            if (macinfo.ip !== ip) continue;
            macinfo.ip = IP_UNDEFINED;
            // macinfo.active = false;
        }
    }
*/

    pi.net.setCallbacks({
        onMacFoundCallback: function(net, newmac, newip) {
            log(`onMacFoundCallback("${net}","${newmac}","${newip}")`);
            /*

            setIPAddressAsUnknown(newip);
            // Really new MAC (if it is an ECHONET device, it will be discovered later.)
            if (macs[newmac] == null) return;
            macs[newmac].active = true;
            macs[newmac].ip = newip;
            */
        },
        onMacLostCallback: function(net, lostmac, lostip) {
            log(`onMacLostCallback("${net}","${lostmac}","${lostip}")`);
            /* setIPAddressAsUnknown(lostip);
            if (macs[lostmac] != null) {
                macs[lostmac].active = false;
                }*/
            if (!macs[lostmac]) return;
            for (const devName in macs[lostmac].devices) {
                if (!macs[lostmac].devices.hasOwnProperty(devName)) continue;
                macs[lostmac].devices[devName].active = false;
            }
        },
        onIPChangedCallback: function(net, mac, oldip, newip) {
            log(`onIPChangedCallback("${net}","${mac}","${oldip}","${newip}")`);
            /* setIPAddressAsUnknown(newip);
            assert(
                macs[mac].ip == oldip,
                'onIPChangedCallback : old ip ' + oldip + 'does not exist');
            macs[mac].ip = newip;
            EL.sendOPC1(
                EL.EL_Multi,
                [0x0e, 0xf0, 0x01], [0x0e, 0xf0, 0x01],
                0x73, 0xd5, EL.Node_details['d5']);
            */
        },
    });

    // ////////////////////////////////////////
    // ////////////////////////////////////////
    // ECHONET Lite setup
    const readJSON = (basename) => {
        const json = pi.pluginfs.readFileSync(basename, 'utf-8');
        return JSON.parse(json.toString());
    };

    // Initialize echonet lite
    const MY_PROPS = readJSON('controller_properties.json');
    // Copy maker code to node profile
    if (MY_PROPS['8a'] != undefined) {
        EL.Node_details['8a'] = MY_PROPS['8a'];
    }

    // Construct ELDB
    // Load database with minimization / resource embedding
    {
        let data = readJSON('all_Body.json');
        let names = readJSON('all_'+LOCALE+'.json').names;
        for (const [objname, eoj] of Object.entries(data.elObjects)) {
            let objnamelc = objname.substring(2).toLowerCase();
            let minimizeObj = {
                objectType: eoj.objectType,
                objectName: names[eoj.objectName],
                epcs: {},
            };

            for (const [epcname, epc] of Object.entries(eoj.epcs)) {
                let edtconvs = undefined;
                try {
                    const epcid = epcname.substring(2).toLowerCase();
                    edtconvs = ProcConverter.eojs[objnamelc][epcid];
                } catch (e) {}
                minimizeObj.epcs[epcname.substring(2).toLowerCase()] = {
                    epcType: epc.epcType,
                    epcName: names[epc.epcName],
                    epcDoc: epc.doc,
                    edtConvFuncs: edtconvs,
                    test: epc.test,
                };
            }
            ELDB[objnamelc] = minimizeObj;
        }
        delete data;
        delete names;

        // add superclass epcs to subclasses
        let sepcs = ELDB['0000'].epcs;
        for (const sepc of Object.keys(sepcs)) sepcs[sepc].super = true;

        for (const [oeoj, elObj] of Object.entries(ELDB)) {
            if (oeoj == '0000') continue;
            for (const sepc of Object.keys(sepcs)) {
                if (elObj.epcs[sepc] == undefined) {
                    elObj.epcs[sepc] = sepcs[sepc];
                } else if (elObj.epcs[sepc].edtConvFuncs == undefined) {
                    elObj.epcs[sepc].edtConvFuncs = sepcs[sepc].edtConvFuncs;
                }
            }
        }
    }

    // Replace the original function
    // ネットワーク内のEL機器全体情報を更新する，受信したら勝手に実行される
    EL.renewFacilities = function(ip, els) {
        // log(`ECHONET packet recv from ${ip}`);
        //        pi.getMACFromIPv4Address(mynet, ip, true).then((mac)=>{
        pi.net.registerIP(ip).then((regObj)=>{
            const mac = regObj.mac;
            assert(ip == regObj.ip);

            try {
                const seoj = els.SEOJ.substring(0, 4);
                let epcList = EL.parseDetail(els.OPC, els.DETAIL);
                if (ELDB[seoj] == undefined) {
                    log(`A message from unknown EOJ ${seoj} on ${ip} is ignored.`); // eslint-disable-line max-len
                    return;
                }
                if (macs[mac] == undefined) {
                    macs[mac] = {
                        /* ip: ip,
                        active: true,*/
                        nodeprofile: {},
                        devices: {},
                        eoj_id_map: {},
                    };
                } else {
                    /* macs[mac].active = true;
                    setIPAddressAsUnknown(macs[mac].ip);
                    macs[mac].ip = ip; // ip may be changed*/
                }

                let mm = macs[mac];

                // 機器が発見された
                function onDevFound(eoj) {
                    if (mm.eoj_id_map[eoj] != undefined) {
                        // Already defined device
                        if (macsObj[mac] == null) { // First time since last boot
                            registerExistingDevice(mm.eoj_id_map[eoj]);
                            EL.getPropertyMaps(ip, EL.toHexArray(eoj));
                            // log('Predefined device '+mm.eoj_id_map[els.SEOJ]+' replied') ;
                        } else {
                            // Activate device
                            const dev = mm.devices[mm.eoj_id_map[eoj]];
                            if (!dev.active) {
                                dev.active = true;
                                savemac();
                            }
                        }
                    } else if (ELDB[eoj.slice(0, 4)] == undefined) {
                        log(`EOJ ${eoj} on ${ip} is not found in ECHONET Lite DB.`); // eslint-disable-line max-len
                        return;
                    } else {
                        let devid = ELDB[eoj.slice(0, 4)].objectType;
                        if (devid == undefined) return;
                        let c = localStorage.getItem(devid+'_Count', 0) + 1;
                        localStorage.setItem(devid+'_Count', c);

                        devid = devid+'_'+c;
                        mm.eoj_id_map[eoj] = devid;
                        mm.devices[devid] = {eoj: eoj};
                        log('New device '+devid+' found');

                        registerExistingDevice(devid);
                        EL.getPropertyMaps(ip, EL.toHexArray(eoj));
                    }
                    macsObj[mac] = regObj;
                }

                function instanceListProc(ilist) {
                    // let instNum = parseInt(ilist.slice(0, 2));
                    let insts = ilist.slice(2);
                    while (insts.length>5) {
                        onDevFound(insts.slice(0, 6));
                        insts = insts.slice(6);
                    }
                    savemac();
                }

                if (seoj != '0ef0') {
                    onDevFound(els.SEOJ);
                    savemac();
                } else if (els.DEOJ == '0ef001' && els.ESV == '73'
                           && els.DETAILs != undefined
                           && els.DETAILs.d5 != undefined) {
                    // Device added to network announcement
                    instanceListProc(els.DETAILs.d5);
                } else if (els.SEOJ == '0ef001' && els.ESV == '72'
                           && els.DETAILs != undefined
                           && els.DETAILs.d6 != undefined) {
                    // Respose for searching node instance list
                    instanceListProc(els.DETAILs.d6);
                }


                const tgt = (seoj=='0ef0' ?
                    mm.nodeprofile : mm.devices[mm.eoj_id_map[els.SEOJ]]);
                for (const epc of Object.keys(epcList)) {
                    let epco = undefined;
                    let epcType = undefined;
                    let edtConvFunc = undefined;
                    /* if( seoj != '0ef0'){
                        epco = ELDB['0000'].epcs[epc] ;
                        if( epco != undefined ){
                            epcType = epco.epcType ;
                            if( epco.edtConvFuncs != undefined )    edtConvFunc = epco.edtConvFuncs[0] ;
                        }
                    }*/
                    if (ELDB[seoj] != undefined) epco = ELDB[seoj].epcs[epc];
                    else epco = ELDB['0000'].epcs[epc];
                    if (epco != undefined) {
                        if (epco.epcType != undefined) epcType = epco.epcType;
                        if (epco.edtConvFuncs != undefined) {
                            edtConvFunc = epco.edtConvFuncs[0];
                        }
                    }
                    // }

                    if (epcType == undefined) epcType = epc;
                    if (epcList[epc]=='') continue;

                    const edt = epcList[epc] = EL.toHexArray(epcList[epc]);
                    const cache = tgt[epcType];
                    const bEdtUpdated =
                        (cache==undefined ||
                         JSON.stringify(cache.cache) !== JSON.stringify(edt));
                    if (bEdtUpdated) {
                        tgt[epcType] = {cache: edt, timestamp: Date.now()};
                    } else {
                        cache.timestamp = Date.now();
                    }

                    // reply of get request? (works only for first OPC)
                    // Ideally, this process should be outside of epc loop, but
                    // just to easily get epc & edt, ESV=72 is exceptionally
                    // placed here.
                    if (procCallWaitList[els.TID] != undefined) {
                        if (els.ESV == '72' /* && els.OPC == '01'*/) {
                            const value = edtConvFunc && edtConvFunc(edt);
                            procCallWaitList[els.TID](
                                {epc: parseInt('0x'+epc), edt: edt,
                                    value: value});
                            delete procCallWaitList[els.TID];
                        } // ESV == '52' is processed outside of epc loop.
                    }

                    if (bEdtUpdated && seoj != '0ef0') {// nodeprofile does not publish
                        const data = {
                            epc: parseInt('0x'+epc),
                            edt: edt,
                            value: (edtConvFunc && edtConvFunc(edt)),
                        };
                        pi.server.publish(
                            mm.eoj_id_map[els.SEOJ] + '/' + epcType,
                            data);
                    }
                }


                // Reply of SetC request
                if (procCallWaitList[els.TID] != undefined) {
                    if (els.ESV == '71') { // accepted
                        let epcHex = els.DETAIL.slice(0, 2);
                        let epco;
                        if (ELDB[seoj] == undefined) {
                            epco = ELDB['0000'].epcs[epcHex];
                        } else epco = ELDB[seoj].epcs[epcHex];
                        let ret = {
                            epc: parseInt('0x'+epcHex),
                            epcName: epco.epcName,
                            success: 'SetC request accepted.',
                        };
                        let cache = tgt[epco.epcType];
                        if (cache != null && cache.cache) {
                            ret.cache_edt = cache.cache;
                            ret.cache_timestamp = cache.timestamp;
                            let convfuncs = epco.edtConvFuncs;// || ELDB['0000'].epcs[epcHex].edtConvFuncs ;
                            if (convfuncs != undefined) {
                                ret.cache_value = convfuncs[0](cache.cache);
                            }
                        }
                        procCallWaitList[els.TID](ret);
                        delete procCallWaitList[els.TID];
                    } else if (els.ESV == '51' || els.ESV == '52') { // cannot reply
                        procCallWaitList[els.TID]({
                            error: 'Cannot complete the request.',
                            els: els,
                        });
                        delete procCallWaitList[els.TID];
                    }
                }

                savemac();
            } catch (e) {
                console.error('EL.renewFacilities error.');
                console.dir(e);
            }
        }).catch(()=>{
            // Do nothing
            // log('ECHONET Lite packet from other network (No MAC is found for '+ip);
        });
    };

    function onReceiveGetRequest(ip, els) {
        try {
            let esv = EL.GET_RES;
            const props = parseEDTs(els);
            for (let prop of props) {
                if (MY_PROPS[prop.epc]) {
                    prop.edt = MY_PROPS[prop.epc];
                } else {
                    esv = EL.GET_SNA;
                }
                if (prop.edt == null || prop.edt.length == 0) {
                    esv = EL.GET_SNA;
                }
            }
            sendFrame(ip, els.TID, els.DEOJ, els.SEOJ, esv, props);
        } catch (e) {
            console.error('onReceiveGetRequest error.');
            console.dir(e);
        }
    }

    const eojList = [MY_EOJ.map((e)=>('0'+e.toString(16)).slice(-2)).join('')];
    EL.initialize(eojList, (rinfo, els, err) => {
        if (err) {
            log('EL Error:\n'+JSON.stringify(err, null, '\t')); return;
        }
        if (els.DEOJ != '0ef000' && els.DEOJ != '0ef001') { // 0effxx has already been processed in echonet-lite npm
            if (els.ESV == EL.GET) {
                onReceiveGetRequest(rinfo.address, els);
            }
        }
    });

    function searcher() {
        EL.search();
        if (--DEVICE_MULTICAST_INTITIAL_NUMBER > 0) {
            setTimeout(searcher, DEVICE_MULTICAST_INITIAL_INTERVAL);
        } else {
            setInterval(()=>{
                EL.search();
            }, DEVICE_MULTICAST_INTERVAL);
        }
    }
    searcher();
} ;

const procCallWaitList = {};

function getPropVal(devid, epcHex) {
    // log('GetPropVal:'+JSON.stringify(arguments)) ;
    return new Promise((ac, rj)=>{
        let tid = localStorage.getItem('TransactionID', 1)+1;
        if (tid > 0xFFFF) tid = 1;
        localStorage.setItem('TransactionID', tid);

        const mac = getMacFromDeviceId(devid);
        const ip = macsObj[mac].ip;
        let deoj = macs[mac].devices[devid].eoj;
        deoj = [deoj.slice(0, 2), deoj.slice(2, 4), deoj.slice(-2)]
            .map((e) => parseInt('0x'+e));

        if (ip === pi.net.INACTIVE
        /* || macs[mac].active !== true*/) {
            rj({error: `The IP address of ${devid} is currently unknown.`});
            return;
        }

        const buffer = new Buffer([
            0x10, 0x81,
            (tid>>8)&0xff, tid&0xff,
            MY_EOJ[0], MY_EOJ[1], MY_EOJ[2],
            deoj[0], deoj[1], deoj[2],
            0x62,
            0x01,
            parseInt('0x'+epcHex),
            0x00]);

        const tidKey = ('000'+tid.toString(16)).slice(-4);
        procCallWaitList[tidKey] = ac;
        EL.sendBase(ip, buffer); // Send main

        setTimeout(()=>{
            if (procCallWaitList[tidKey] == ac) {
                delete procCallWaitList[tidKey];
                rj({error: `GET request timeout:${devid}/${epcHex}`});
            }
        }, GET_TIMEOUT);
    });
}

function setPropVal(devid, epcHex, edtArray) {
    // log('SetPropVal:'+JSON.stringify(arguments)) ;
    return new Promise((ac, rj)=>{
        let tid = localStorage.getItem('TransactionID', 1)+1;
        if (tid > 0xFFFF) tid = 1;
        localStorage.setItem('TransactionID', tid);

        const mac = getMacFromDeviceId(devid);
        const ip = macsObj[mac].ip;
        let deoj = macs[mac].devices[devid].eoj;
        deoj = [deoj.slice(0, 2), deoj.slice(2, 4), deoj.slice(-2)]
            .map((e) => parseInt('0x'+e));

        if (ip === pi.net.INACTIVE
        /* || macs[mac].active !== true*/) {
            rj({error: `The IP address of ${devid} is currently unknown.`});
            return;
        }

        const buffer = new Buffer([
            0x10, 0x81,
            (tid>>8)&0xff, tid&0xff,
            MY_EOJ[0], MY_EOJ[1], MY_EOJ[2],
            deoj[0], deoj[1], deoj[2],
            0x61, // SetC, instead of SetI
            0x01,
            parseInt('0x'+epcHex),
            edtArray.length,
        ].concat(edtArray));

        const tidKey = ('000'+tid.toString(16)).slice(-4);
        procCallWaitList[tidKey] = ac;
        EL.sendBase(ip, buffer); // Send main

        setTimeout(()=>{
            if (procCallWaitList[tidKey] == ac) {
                delete procCallWaitList[tidKey];
                rj({error: `PUT request timeout:${devid}/${epcHex}=>${JSON.stringify(edtArray)}`}); // eslint-disable-line max-len
            }
        }, GET_TIMEOUT);
    });
}

function registerExistingDevice(devid) {
    let mac = getMacFromDeviceId(devid);
    // let ip = macsObj[mac].ip;
    let dev = macs[mac].devices[devid];

    if (dev.active === true) {
        log('Cannot register '+devid+' twice.');
        return;
    }
    dev.active = true;
    savemac();

    log(`Device ${devid}/${mac} registered.`);
}

function parseEDTs(els) {
    const props = [];
    const array = EL.toHexArray(els.DETAIL); // EDTs
    let now = 0;
    for (let i = 0; i< els.OPC; i++) {
        const epc = array[now];
        now++;
        const pdc = array[now];
        now++;
        const edt = [];
        for (let j = 0; j < pdc; j++) {
            edt.push(array[now]);
            now++;
        }
        props.push({'epc': EL.toHexString(epc), 'edt': EL.bytesToString(edt)});
    }
    return props;
}

// send echonet-lite frame with multiple properties
function sendFrame(ip, tid, seoj, deoj, esv, properties) {
    if (typeof(tid) == 'string') {
        tid = EL.toHexArray(tid);
    }

    if (typeof(seoj) == 'string') {
        seoj = EL.toHexArray(seoj);
    }

    if (typeof(deoj) == 'string') {
        deoj = EL.toHexArray(deoj);
    }

    if (typeof(esv) == 'string') {
        esv = (EL.toHexArray(esv))[0];
    }

    let propBuff = [];
    for (const prop of properties) {
        let epc = prop.epc;
        if (typeof(epc) == 'string') {
            epc = (EL.toHexArray(epc))[0];
        }

        let edt = prop.edt;
        if (typeof(edt) == 'number') {
            edt = [edt];
        } else if (typeof(edt) == 'string') {
            edt = EL.toHexArray(edt);
        }
        propBuff = propBuff.concat([epc, edt.length]); // EPC, PDC
        propBuff = propBuff.concat(edt); // EDT
    }

    let buffer;
    buffer = new Buffer([
        0x10, 0x81,
        tid[0], tid[1],
        seoj[0], seoj[1], seoj[2],
        deoj[0], deoj[1], deoj[2],
        esv,
        properties.length].concat(propBuff));
    EL.sendBase(ip, buffer);
}

// /////////////////////////////////////////////////////
// /////////////////////////////////////////////////////
// /
// /           Procedure call request
// /


function onProcCall(method, path /* _devid , propname*/, args) {
    const pathSplit = path.split('/');
    const _devid = pathSplit.shift();

    if (pathSplit.length>=2) { // Dirty code, just for compatibility
        method = pathSplit.pop().toUpperCase();
        if (args.edt == null) {
            args.edt = args.value;
        }
    }
    const propname = pathSplit.join('/');

    if (_devid == '' || propname == '') {
        switch (method) {
        case 'GET':
            return onProcCallGet(method, _devid, propname, args);
        case 'PUT':
        case 'SET':
            return onProcCallPut(method, _devid, propname, args);
        }
        return {error: `The specified method ${method} is not implemented in echonet lite plugin.`}; // eslint-disable-line max-len
    }
    let devids = expandDeviceIdFromPossiblyRegExpDeviceId(
        decodeURIComponent(_devid));
    switch (method) {
    case 'GET':
        return new Promise((acpt, rjct)=>{
            Promise.all(devids.map((devid)=>new Promise((ac, rj)=>{
                Promise.all([onProcCallGet(method, devid, propname, args)])
                    .then((re)=>{
                        ac([devid, re[0]]);
                    }).catch((err)=>{
                        ac([devid, err]);
                    });
            }))).then((re)=>{
                let res = {leaf: true};
                re.forEach((_re)=>{
                    let key = `${RESPONSE_PREFIX}/${_re[0]}/${propname}`;
                    res[key]=_re[1];
                });
                acpt(res);
            }).catch(rjct);
        });
    case 'PUT':
    case 'SET':
        return new Promise((acpt, rjct)=>{
            Promise.all(devids.map((devid)=>new Promise((ac, rj)=>{
                Promise.all([onProcCallPut(method, devid, propname, args)])
                    .then((re)=>{
                        ac([devid, re[0]]);
                    }).catch((err)=>{
                        ac([devid, err]);
                    });
            }))).then((re)=>{
                let res = {leaf: true};
                re.forEach((_re)=>{
                    let key = `${RESPONSE_PREFIX}/${_re[0]}/${propname}`;
                    res[key]=_re[1];
                });
                acpt(res);
            }).catch(rjct);
        });
        // return onProcCallPut( method , devid , propname , args ) ;
    }
    return {error: `The specified method ${method} is not implemented in echonet lite plugin.`}; // eslint-disable-line max-len
}

function onProcCallGet(method, devid, propname, args) {
    if (devid == '') { // access 'echonet/' => device list
        let devices = {};

        for (const [mac, macinfo] of Object.entries(macs)) {
            for (const [devid, dev] of Object.entries(macinfo.devices)) {
                const mo = macsObj[mac];
                const ip = (mo==null?null:mo.ip);
                devices[devid]={
                    mac: mac,
                    /* ip: macinfo.ip,*/
                    active: dev.active,
                    eoj: dev.eoj,
                };

                if (args.option === 'true') {
                    devices[devid].option = {
                        doc: {
                            short: `EOJ:${dev.eoj} IP:${ip} MAC:${mac}`,
                        },
                        leaf: false,
                    };
                }
            }
        }
        return devices;
    }

    const mac = getMacFromDeviceId(devid);
    if (mac == undefined) return {error: 'No such device:'+devid};
    const dev = macs[mac].devices[devid];
    const eoj = dev.eoj.substring(0, 4);
    if (propname == '') { // access 'echonet/devid/' => property list
        // Ideally, property map should be checked.
        let names;
        if (args.option === 'true') {
            const fname = 'all_' + LOCALE + '.json';
            names = JSON.parse(pi.pluginfs.readFileSync(fname, 'utf-8')).names;
        }

        let re = {};
        let cacheEdt;
        let cacheValue;
        let cacheStr;
        let cacheTimestamp;
        /* // Super class
        if( eoj != '0ef0'){
            for (var epc of Object.keys(ELDB['0000'].epcs)) {
                var epco = ELDB['0000'].epcs[epc] ;
                var epcType = epco.epcType ;
                cacheEdt = cacheValue = cacheStr = cacheTimestamp = undefined ;
                if( dev[epcType] != undefined ){
                    cacheEdt = dev[epcType].cache ;
                    cacheTimestamp = dev[epcType].timestamp ;
                }
                // cacheValue = undefined ;

                if( cacheEdt != undefined && epco.edtConvFuncs != undefined && typeof epco.edtConvFuncs[0] == 'function' )
                    cacheValue = epco.edtConvFuncs[0](cacheEdt) ;
                re[epcType] = {
                    super : true
                    , epc : parseInt('0x'+epc)
                    , cacheEdt : cacheEdt , cacheValue : cacheValue , cacheTimestamp : cacheTimestamp
                    , epcName : epco.epcName
                } ;

                if( names != undefined ){
                    cacheStr = '' ;
                    if( cacheValue != undefined ) cacheStr = ' Cache:'+cacheValue ;
                    else if( cacheEdt != undefined ) cacheStr = ' Cache:0x'+cacheEdt.map(i=>('0'+i.toString(16)).slice(-2)).join('') ;
                    re[epcType].option = {
                        leaf : true
                        ,doc : {
                            short : `${epco.epcName} EPC:${epc}`+cacheStr
                            ,long : (epco.epcDoc==undefined?undefined:names[epco.epcDoc])
                        }
                    }
                }
            }
        }*/

        let propMap = {};
        const mnames = [
            'StateChangeAnnouncementPropertyMap',
            'SetPropertyMap',
            'GetPropertyMap',
        ];
        mnames.forEach((mname)=>{
            if (dev[mname] && dev[mname].cache) {
                let c = dev[mname].cache;
                if (c[0] >= 16) {
                    c = EL.parseMapForm2(EL.bytesToString(c));
                }
                c.slice(1, 1+c[0]).forEach((epcd)=>{
                    propMap[epcd.toString(16)] = null;
                });
            }
        });

        for (const epc of Object.keys(propMap)) {
            let epco = ELDB[eoj].epcs[epc];
            if (epco == null) continue;
            let epcType = epco.epcType;
            cacheEdt = cacheValue = cacheStr = cacheTimestamp = undefined;
            if (dev[epcType] != undefined) {
                cacheEdt = dev[epcType].cache;
                cacheTimestamp = dev[epcType].timestamp;
            }
            // cacheValue = undefined ;
            if (cacheEdt != undefined
                && epco.edtConvFuncs != undefined
                && typeof epco.edtConvFuncs[0] == 'function') {
                cacheValue = epco.edtConvFuncs[0](cacheEdt);
            } else if (re[epcType]!=undefined) {
                cacheValue = re[epcType].cacheValue;
            }
            re[epcType] = {
                super: (epco.super === true),
                epc: parseInt('0x'+epc),
                cacheEdt: cacheEdt, cacheValue: cacheValue,
                cacheTimestamp: cacheTimestamp,
                epcName: epco.epcName,
                // , epcDoc : (names==undefined||epco.epcDoc==undefined?undefined:names[epco.epcDoc])
            };

            if (names != undefined) {
                cacheStr = '';
                if (cacheValue != undefined) {
                    cacheStr = ' Cache:' + cacheValue;
                } else if (cacheEdt != undefined) {
                    const s = cacheEdt.map(
                        (i) => ('0'+i.toString(16)).slice(-2))
                        .join('');
                    cacheStr = ' Cache:0x' + s;
                }
                re[epcType].option = {
                    leaf: true,
                    doc: {
                        short: `${epco.epcName} EPC:${epc}`+cacheStr,
                        long: names[epco.epcDoc],
                    },
                };
                if (epco.test instanceof Array) {
                    re[epcType].option.test = epco.test;
                }
            }
        }

        delete names;

        return re;
    }

    const epcs = ELDB[eoj].epcs;
    let epcHex;
    for (const epc of Object.keys(epcs)) {
        if (propname === epcs[epc].epcType) {
            epcHex = epc;
            break;
        }
    }
    if (epcHex == undefined) {
        if (propname.length == 2 && !isNaN(parseInt('0x'+propname))) {
            epcHex = propname.toLowerCase();
        } else if (!isNaN(parseInt(propname))) {
            epcHex = ('0'+(parseInt(propname)&0xff).toString(16)).slice(-2);
        } else return {error: 'Unknown property name:'+propname};
    }

    return getPropVal(devid, epcHex);
}

function onProcCallPut(method, devid, propname, args) {
    if (devid == '' || propname == '' || args==undefined ||
        (args.value==undefined && args.edt == undefined)) {
        return {error: `Device id, property name, and the argument "value" or "edt" must be provided for ${method} method.`}; // eslint-disable-line max-len
    }

    let mac = getMacFromDeviceId(devid);
    if (mac == undefined) return {error: 'No such device:'+devid};

    let epcHex = undefined;
    let edtConvFunc = undefined;
    let eoj = macs[mac].devices[devid].eoj.slice(0, 4);
    let epcs = ELDB[eoj].epcs;
    for (const epc of Object.keys(epcs)) {
        if (propname === epcs[epc].epcType) {
            epcHex = epc;
            break;
        }
    }
    if (epcHex == undefined) {
        if (propname.length == 2 && !isNaN(parseInt('0x'+propname))) {
            epcHex = propname.toLowerCase();
        } else if (!isNaN(parseInt(propname))) {
            epcHex = ('0'+(parseInt(propname)&0xff).toString(16)).slice(-2);
        } else return {error: 'Unknown property name:'+propname};
    }

    if (epcs[epcHex] != undefined && epcs[epcHex].edtConvFuncs != undefined) {
        edtConvFunc = epcs[epcHex].edtConvFuncs[1];
    } else if (eoj != '0ef0') {
        let epco = ELDB['0000'].epcs[epcHex];
        if (epco != undefined && epco.edtConvFuncs != undefined) {
            edtConvFunc = epco.edtConvFuncs[1];
        }
    }
    if (args.edt != null) {
        if (! (args.edt instanceof Array)) {
            if (isNaN(args.edt) || !isFinite(args.edt)) {
                return {error: 'edt is not a number nor number array'};
            }
            args.edt = [args.edt];
        }
    } else if (edtConvFunc != undefined) {
        args.edt = edtConvFunc(args.value);
    } else {
        return {error: 'No converter to generate edt from value.'};
    }

    return setPropVal(devid, epcHex, args.edt);
}


// /////////////////////////////////////////////////////
// /////////////////////////////////////////////////////
// /
// /           Settings
// /

function onUIGetSettings(settings) {
    settings = settings || {};
    settings.net = settings.net || '(none)';
    const netsHash = pi.net.getNetworkInterfaces();
    for (let n of Object.keys(netsHash)) {
        if (netsHash[n].active === true) {
            settings.net = n;
            break;
        }
    }
    return settings;
};

async function onUIGetSettingsSchema(schema, settings) {
    if (!pi.net.supportedNetworkManager()) {
        delete schema.properties.net;
        delete schema.properties.root_passwd;

        schema.properties.network_settings = {
            type: 'object',
            description:
`nmcli should be installed to setup network configuration. Execute
"$ sudo apt-get install network-manager"
or
"$ sudo yum install NetworkManager"`,
        };
        return schema;
    }
    try {
        const nets = ['(none)'];
        const netsHash = pi.net.getNetworkInterfaces();
        for (let n of Object.keys(netsHash)) {
            nets.push(n);
        }
        schema.properties.net.enum = nets;
        /*
        schema.properties['81'] = {
            'title': 'Installation Location',
            'type': 'string',
            'enum': [
                'unknown', 'living', 'dining', 'kitchen',
                'bathroom', 'washroom', 'lavatory', 'passage',
                'room', 'stairway', 'entrance', 'closet',
                'garden', 'parking', 'balcony', 'others',
            ],
        };
        */
        return schema;
    } catch (e) {
        return {error: e.toString()};
    }
};

async function onUISetSettings(newSettings) {
    await setNetwork(newSettings.net, newSettings.root_passwd);
    return null; // save nothing
};


// //////////////////////////////////////////////
// //////////////////////////////////////////////
// //  Utility functions

async function setNetwork(newnet, password) {
    const nets = pi.net.getNetworkInterfaces();
    if (newnet && nets[newnet]) {
        await pi.net.routeSet('224.0.23.0/32', newnet, password);
    } else {
        newnet = null;
        await pi.net.routeDelete('224.0.23.0/32', password);
    }

    pi.net.setNetworkInterface(newnet);
    EL.search();
}
