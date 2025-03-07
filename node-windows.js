// npm install node-windows -g
// npm link node-windows

var Service = require( 'node-windows' ).Service;
var fs = require( 'fs' )

const processType = process.argv[2];
const appName = process.argv[3];
// const argumentStage = process.argv[ 4 ];

function startProcess( processType ) {
    switch ( processType ) {
        case 'install': return svc.install();
        case 'uninstall': return svc.uninstall();
    }
}

// Create a new service object
var svc = new Service( {
    name: appName,
    description: 'A Node.js WebApplication.',
    script: require( 'path' ).join( __dirname, 'main.js' ),
    // scriptOptions: argumentStage
} );


// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on( 'install', function () {
    svc.start();
    console.log( 'Process complete.' );
    console.log( 'The Service exists: ', svc.exists );
} );

svc.on( 'alreadyinstalled', function () {
    console.log( 'The service: ' + svc.name + ' is already installed.' );
} );

svc.on( 'alreadyuninstalled', function () {
    console.log( 'The service: ' + svc.name + ' is already uninstalled.' );
} );

svc.on( 'start', function () {
    console.log( svc.name + ' started!' );
    // let fileName = appName.replace( /\W/g, '' )
    // fileName = fileName.toLowerCase();
    // fs.readFile( `${__dirname}/daemon/${fileName}.out.log`, ( err, data ) => {
    //     if ( err ) throw err;
    //     console.log( '---main.js log---', data );
    // } );
} );

svc.on( 'uninstall', function () {
    console.log( 'Uninstall of ' + svc.name + ' complete.' );
    console.log( 'The service exists: ', svc.exists );
} );

startProcess( processType )