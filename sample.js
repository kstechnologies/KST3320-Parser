/** 
* @file     sample.js
* @brief    Parser example for KST33 series payloads.
* @author   HS
* @version  1.0.0
* @date     2021-05-27  Initial port of conversion code.
*/
/* {{{ ------------------------------------------------------------------ */
/** 
 * @licence
 * Copyright (c) 2019 - 2021, KS Technologies, LLC
 * 
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 
 * 2. Redistributions in binary form, except as embedded into a KS Technologies
 *    product or a software update for such product, must reproduce the above 
 *    copyright notice, this list of conditions and the following disclaimer in 
 *    the documentation and/or other materials provided with the distribution.
 * 
 * 3. Neither the name of KS Technologies nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * 4. This software, with or without modification, must only be used with a
 *    KS Technologies, LLC product.
 * 
 * 5. Any software provided in binary form under this license must not be reverse
 *    engineered, decompiled, modified and/or disassembled.
 * 
 * THIS SOFTWARE IS PROVIDED BY KS TECHNOLOGIES LLC "AS IS" AND ANY EXPRESS
 * OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY, NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL KS TECHNOLOGIES, LLC OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
 * GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
 * OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
/* ------------------------------------------------------------------ }}} */
'use strict';

const VER    = '1.0.0';

/* ------------------------------------------------------------------ */
/** 
 * @brief        Helper function to determine if a 2's complement
 *               number is negative. This is used to determine if 
 *               our lat/lng values are negative...
 * 
 * @param num    Number to check.
 * @param bytes  Byte width of the integer
 * 
 * @return tc    Corrected signed integer
 */
/* ------------------------------------------------------------------ */
function signedInt( num, bytes )
{
    let tc = 0;
    const mask = 0x1 << ((bytes * 8) - 1);
    const max = 0x1 << (bytes * 8);

    if ( (mask & num) == mask ) {
        tc = ((max - num) * -1);
    } else {
        tc = num;
    }

    return tc;
}

/* ------------------------------------------------------------------ */
/** 
* @brief            Parse message from carrier, return a JSON message 
* 
* @param data       Hex payload
*
* @return univ      JSON object
*/
/* ------------------------------------------------------------------ */
function getUniversalFormat( hex )
{
    console.log( 'LPP Data: ' + hex );

    // Parse the payload and assemble the universal packet
    const loraChan = parseInt(hex.substring(0,2));
    const type = parseInt(hex.substring(2,4));

    // GPL lat/lng scale factor to convert integer form into float
    const GPSScaleFactor = 10000;
    const ALTScaleFactor = 100;
    const ACCScaleFactor = 1000;
    
    let payload = {};

    // LPP Parser
    // -----------
    // DISTANCE (mm)
    if( type == 82 ) {
        const distance = parseInt(hex.substring(4,8), 16);
        payload = {
            distance: distance
        };

    // BATTERY (%)
    } else if( type == 78 ) {
        const battery = parseInt(hex.substring(4,8), 16);
        payload = {
            battery: battery
        };

	// ACCELEROMETER (g)
    // NOTE: Only supported in firmware version 0.6.18
	} else if ( type == 71 ) {
		// LPP Data Type 71: Accelerometer
		const accelX = parseInt(hex.substring(4,8), 16);
		const accelY = parseInt(hex.substring(8,12), 16);
		const accelZ = parseInt(hex.substring(12), 16);

        const signedAccelX = (signedInt(accelX,2)/ACCScaleFactor);
        const signedAccelY = (signedInt(accelY,2)/ACCScaleFactor);
        const signedAccelZ = (signedInt(accelZ,2)/ACCScaleFactor);

		payload = {
			accelX  : signedAccelX,
		    accelY  : signedAccelY,
		 	accelZ  : signedAccelZ
		};

	// GPS (STANDARD) 
	} else if( type == 88 && hex.length == 22 ){
		const rawLat  = parseInt(hex.substring(4,10), 16);
		const lat     = signedInt(rawLat,3)/GPSScaleFactor;
		const rawLng  = parseInt(hex.substring(10,16), 16);
		const lng     = signedInt(rawLng,3)/GPSScaleFactor;
		const alt     = parseInt(hex.substring(16,22), 16)/ALTScaleFactor;
        payload = {
            lat  : lat,
            lng  : lng,
            alt  : alt
       };

    // GPS (EXTENDED)
    } else if( type == 88 && hex.length == 40 ){
        const rawLat  = parseInt(hex.substring(4,10), 16);
        const lat     = signedInt(rawLat,3)/GPSScaleFactor;
        const rawLng  = parseInt(hex.substring(10,16), 16);
        const lng     = signedInt(rawLng,3)/GPSScaleFactor;
        const alt     = parseInt(hex.substring(16,22), 16)/ALTScaleFactor;
        const hacc    = parseInt(hex.substring(22,30), 16)/ACCScaleFactor;
        const vacc    = parseInt(hex.substring(30,38), 16)/ACCScaleFactor;
        const sat     = parseInt(hex.substring(38,40), 16);
        payload = {
            lat   : lat,
            lng   : lng,
            alt   : alt,
            hacc  : hacc,
            vacc  : vacc,
            sat   : sat
        };

    // UNKNOWN
    } else {
        payload = {
            error: 'ERROR: Unknown LPP packet' 
        };
    }

    return payload;
}

// LPP Messages
const dist_data = "01820036";                                     /*< 36 = 54mm distance      */
const batt_data = "017863";                                       /*< 63 = 99% battery        */
const accel_data = "01710000FFFD03EB";                            /*< 0, -0.003, 1.003        */
const gps_data = "018805F371F006170372EE";                        /*< 39.0001 lat, -104.7014 lng, 2260.30m    */
const gps_ext_data = "018805F371F006170372EE00018D800000FA3604";  /*< gps + 101.760m hor. acc., 64.054 vert. acc, 4 sat   */

console.log( '' );
console.log( 'KST3320 Parser Example (v' + VER + ')\n');
console.log( 'Parsed LPP messages appear below.  See code' );
console.log( 'for parsing details.\n');
console.log( 'Find firmware spec here: \n' );
console.log( '   https://kstechnologies.com/docs/KST3320_firmware_spec.pdf\n');
console.log( '---------------------------------' );
console.log( '           DISTANCE');
console.log( '---------------------------------' );
console.log( getUniversalFormat(dist_data) );
console.log( '' );
console.log( '---------------------------------' );
console.log( '            BATTERY');
console.log( '---------------------------------' );
console.log( getUniversalFormat(batt_data) );
console.log( '' );
console.log( '---------------------------------' );
console.log( '          ACCELEROMETER');
console.log( '---------------------------------' );
console.log( 'NOTE: Only supported in firmware version 0.6.18');
console.log( getUniversalFormat(accel_data) );
console.log( '' );
console.log( '---------------------------------' );
console.log( '          STANDARD GPS');
console.log( '---------------------------------' );
console.log( getUniversalFormat(gps_data) );
console.log( '' );
console.log( '---------------------------------' );
console.log( '          EXTENDED GPS');
console.log( '---------------------------------' );
console.log( getUniversalFormat(gps_ext_data) );
console.log( '' );


