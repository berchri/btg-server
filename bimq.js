require( 'dotenv' ).config()
const fs = require( 'fs' );
const qs = require( 'querystring' );
const https = require( 'https' )
const { certAuthority } = require( './main.js' )

let bimQAccessToken = { access_token: '', expires: 0 };

refreshBimQAcessToken().then( result => bimQAccessToken = result )

async function useBimQAcessToken() {
    if ( bimQAccessToken.expires < Date.now() ) {
        try {
            bimQAccessToken = await refreshBimQAcessToken()
            console.log( 'bimQAccessToken :>> ', bimQAccessToken );
        } catch ( e ) {
            if ( e === 'token_expired' ) {
                // get new token
            }
        }
    }
    return bimQAccessToken.access_token
}


function refreshBimQAcessToken() {
    return new Promise( ( resolve, reject ) => {
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
            ca: certAuthority
        }

        const req = https.request( 'https://server.bim-q.de/oauth/token', options, ( res ) => {
            let data = '';

            res.on( 'data', ( chunk ) => {
                data += chunk;
            } );

            res.on( 'end', () => {
                const body = JSON.parse( data )
                if ( body.error ) {
                    console.log( 'Error requesting BimQ Access Token' )
                    reject( 'token_expired' )
                }
                const expires = Date.now() + ( body.expires_in - 10 ) * 1000
                // console.log( 'Body: ', body );
                console.log( 'bimQAccessToken received:', body.access_token );
                resolve( { ...body, expires } )
            } );

            res.on( 'error', ( e ) => {
                console.log( 'Error requesting BimQ Access Token' )
                reject( 'BIMQ_API_ERROR' )
            } )
        } )

        req.write( postData )
        req.end();
    } )
}

module.exports = { useBimQAcessToken }