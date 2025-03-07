require( 'dotenv' ).config()

// const os = require( 'os' )
const fs = require( 'fs' )
const http = require( 'http' )
const https = require( 'https' )
const crypto = require( 'crypto' )
const express = require( 'express' )
const cors = require( 'cors' )
const session = require( 'express-session' )
const mongoose = require( 'mongoose' );

( async function () {
    /*
    ************
    * Database *
    ************
    */
    const userMongoDBSwietoolsky = encodeURIComponent( process.env.MONGODB_USER_SWIETOOLSKY )
    const pwMongoDBSWietoolsky = encodeURIComponent( process.env.MONGODB_PW_SWIETOOLSKY )
    const userMongoDBBIMQ = encodeURIComponent( process.env.MONGODB_USER_BIMQ )
    const pwMongoDBBIMQ = encodeURIComponent( process.env.MONGODB_PW_BIMQ )

    let bimqMongo;
    let swietoolskyMongo;
    try {
        swietoolskyMongo = await mongoose.createConnection( `mongodb://${userMongoDBSwietoolsky}:${pwMongoDBSWietoolsky}@${process.env.DB_HOST}:27017/swietoolsky?authSource=swietoolsky` ).asPromise();
        console.log( 'Swietoolsky Database connected' );
    } catch ( error ) {
        console.log( 'Swietoolsky Database Connection Error' );
    }
    try {
        bimqMongo = await mongoose.createConnection( `mongodb://${userMongoDBBIMQ}:${pwMongoDBBIMQ}@${process.env.DB_HOST}:27017/bimq?authSource=bimq` ).asPromise();
        console.log( 'BIMQ Database connected' );
    } catch ( error ) {
        console.log( 'BIMQ Database Connection Error' );
    }

    /*
    ************
    * BIMQ API *
    ************
    */
    let certAuthority = null
    let httpsAgent = null
    try {
        certAuthority = fs.readFileSync( '../certs.pem' )
        httpsAgent = new https.Agent( { ca: certAuthority } )
    } catch ( e ) {
        // console.log( e )
        console.log( 'Cannot read CA File.' )
    }
    module.exports = { certAuthority, httpsAgent }

    const bimq = require( './bimq.js' );
    const bimqToken = await bimq.useBimQAcessToken()

    /*
    ******************
    * Express Server *
    ******************
    */

    const app = express()
    const port = process.env.PORT || 3333;
    const reactDevPort = process.env.REACT_DEV_PORT || 3000;

    if ( process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'atsrvbtk001_dev' ) {
        const serverHTTP = http.createServer( app )
        serverHTTP.listen( port, () => console.log( `Server is running on http://localhost:${port}` ) )
    } else {
        const options = {
            pfx: fs.readFileSync( process.env.HTTPS_CERT_PATH ),
            passphrase: process.env.HTTPS_CERT_PW
        }
        const serverHTTPS = https.createServer( options, app )
        serverHTTPS.listen( port, () => console.log( `Server is running on https://localhost:${port}` ) )
    }

    // Parser
    app.use( express.json() )
    app.use( express.urlencoded( { extended: false } ) )

    // View Engine
    // app.engine( 'handlebars', hbs.engine );
    // app.set( 'view engine', 'handlebars' );


    if ( process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'atsrvbtk001_dev' ) {
        app.use( cors( { origin: `http://localhost:${reactDevPort}` } ) )
    }

    /*
    ***********
    * Session *
    ***********
    */

    const sessionOptions = {
        secret: 'rlgD.GZer3HTR7-8rhUT',
        genid: () => crypto.randomUUID(),
        saveUninitialized: false,
        resave: false,
        cookie: { secure: false }
    }

    if ( process.env.NODE_ENV === 'production' ) {
        app.set( 'trust proxy', 1 ) // trust first proxy
        sessionOptions.cookie.secure = true // serve secure cookies
    }

    app.use( session( sessionOptions ) )

    /*
    ************
    * Passport *
    ************
    */
    const passport = require( 'passport' )
    const MicrosoftStrategy = require( 'passport-microsoft' ).Strategy
    var LocalStrategy = require( 'passport-local' )

    let callbackURL = `http://localhost:3333/login/response`

    if ( process.env.NODE_ENV === 'production' ) callbackURL = `https://atsrvbtk001:3333/login/response`

    passport.use( new MicrosoftStrategy( {
        clientID: process.env.SWIETOOLSKY_MS_APPLICATION_ID,
        clientSecret: process.env.SWIETOOLSKY_MS_CLIENT_SECRET,
        tenant: process.env.SWIETOOLSKY_MS_TENANT,
        // authorizationURL: `https://login.microsoftonline.com/${process.env.SWIETOOLSKY_MS_TENANT}/oauth2/v2.0/authorize`,
        callbackURL: callbackURL,
        scope: ['user.read']
    },
        function ( accessToken, refreshToken, profile, done ) {
            process.nextTick( function () {
                // console.log( accessToken )
                // console.log( refreshToken )
                // console.log( profile )
                return done( null, profile );
            } );
        }
    ) );

    passport.use( new LocalStrategy( async ( username, password, done ) => {
        let hasAccess = false;
        console.log( 'username :>> ', username );
        if ( username === 'localPostman' && password === '123456' ) hasAccess = true;
        if ( hasAccess ) {
            console.log( username + ' logged in.' )
            done( null, {
                username,
            } )
        } else {
            done( null )
        }
    } ) )

    passport.serializeUser( ( user, done ) => { done( null, user ); } );
    passport.deserializeUser( ( user, done ) => { done( null, user ); } );

    app.use( passport.initialize() )
    app.use( passport.session() )

    /*
    ***********
    * Exports *
    ***********
    */
    module.exports = { port, reactDevPort, certAuthority, httpsAgent, bimqMongo, swietoolskyMongo }

    /*
    **********
    * Routes *
    **********
    */
    const routesApp = require( './routes/r-app.js' )
    const routesLogin = require( './routes/r-ms.js' )
    const routesBimQ = require( './routes/r-bimq.js' )

    app.use( '/login', routesLogin )
    app.use( '/', routesApp )
    app.use( '/bimq', routesBimQ )
} )()
