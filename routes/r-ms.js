// const os = require( 'os' )
const fs = require( 'fs' )
const querystring = require( 'querystring' )
const express = require( 'express' )
const r = express.Router()
const passport = require( 'passport' )
// const userController = require( '../controller/c-user.js' )

let redirect = 'https://atsrvbtk001:3333'

if ( process.env.NODE_ENV === 'development' ) {
    redirect = 'http://localhost:3000'
}
if ( process.env.NODE_ENV === 'atsrvbtk001_dev' ) {
    redirect = 'http://localhost:3001'
}


function loginLocalHost( req, res, next ) {
    const devUser = {
        displayName: 'local development user',
        role: 'admin'
    }
    const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1' || req.ip === '::1';
    if ( isLocalhost ) {
        req.login( devUser, function ( err ) {
            if ( err ) { return next( err ); }
            if ( Object.keys( req.query ).length !== 0 ) {
                return res.redirect( `/?${querystring.stringify( req.query )}` );
            } else {
                return res.redirect( '/' )
            }
        } );
    }
    return next()
}

function skipForLocalStrategy( req, res, next ) {
    if ( req.path === '/pp' ) {
        return next();
    }
}

function mainAuthetication( req, res, next ) {
    // Capture query parameters
    const queryParams = querystring.stringify( req.query );

    passport.authenticate( 'microsoft', {
        prompt: 'select_account',
        state: queryParams
    } )( req, res, next );
}

function secondaryAuthentication( req, res, next ) {
    passport.authenticate( 'local', function ( err, user, info, status ) {
        if ( err ) { return next( err ); }
        if ( !user ) { return res.send( 'Access Denied!' ); }

        req.login( user, function ( err ) {
            if ( err ) { return next( err ); }
            return res.send( 'Logged in!' );
        } );
    } )( req, res, next );
}

function catchAuthServiceResponse( req, res ) {
    console.log( 'User Connected: ', req.user.displayName )
    req.user.role = getUserRole( req.user._json.userPrincipalName )
    console.log( 'User Role: ', req.user.role )
    const queryParams = req.query.state ? `?${req.query.state}` : '';
    res.redirect( `${redirect}${queryParams}` );
}

function getUserRole( user ) {
    try {
        const adminFile = fs.readFileSync( './data/admins.json' )
        const admins = JSON.parse( adminFile )
        if ( admins.includes( user ) ) return 'admin'
        return 'user'
    } catch ( error ) {
        // console.log( 'error :>> ', error );
        console.log( 'Error getting User Role' );
        return 'user';
    }
}

// r.use( loginLocalHost )
// r.use( skipForLocalStrategy ) // todo here is an error
r.use( mainAuthetication )
r.use( '/pp', secondaryAuthentication );
r.get( '/response', catchAuthServiceResponse )

module.exports = r