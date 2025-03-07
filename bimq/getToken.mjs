import { config } from 'dotenv';
config( { path: '../.env' } );

import https from 'https';
import fs from 'fs';
import qs from 'querystring';


let caCert;
try {
    caCert = fs.readFileSync( '../../certs.pem' )
} catch ( err ) {
    caCert = ''
}

var postData = qs.stringify( {
    'refresh_token': process.env.BIMQ_REFRESH_TOKEN,
    'grant_type': 'refresh_token',
    'client_id': process.env.BIMQ_CLIENT_ID
} );

const options = {
    method: 'POST',
    headers: {
        // 'Authorization': `BEARER ${bimQAccessToken}`,
        'content-type': 'application/x-www-form-urlencoded',
        // 'Cookie': `_session_id=${process.env.BIMQ_COOKIE_SID}; user_id=${process.env.BIMQ_COOKIE_UID}`
    },
    ca: caCert
}

const req = https.request( 'https://server.bim-q.de/oauth/token', options, ( res ) => {
    let data = '';

    res.on( 'data', ( chunk ) => {
        data += chunk;
    } );

    res.on( 'end', () => {
        const body = JSON.parse( data )
        console.log( 'Token: ', JSON.parse( data ) );
    } );

    res.on( 'error', ( e ) => {
        // console.log( e )
        console.log( 'Error requesting BimQ Access Token' )
    } )
} )

req.write( postData )
req.end();