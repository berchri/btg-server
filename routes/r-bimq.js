const express = require( 'express' )
const r = express.Router()

const { useBimQAcessToken } = require( '../bimq.js' )
const bimq = require( '../controller/c-bimq.js' )

const checkAdminRole = ( req, res, next ) => {
    if ( req.user.role === 'admin' ) {
        next()
    } else {
        res.send( { status: 'error', message: 'You do not have permission to access this page!' } )
    }
}

r.use( '/', async ( req, res, next ) => {
    req.accessToken = await useBimQAcessToken();
    // console.log( 'req.accessToken :>> ', req.accessToken );
    next();
} )

function sendResponse( req, res ) {
    if ( res.error ) return res.send( { status: 'error', message: res.message || 'BIMQ API Error!' } )
    if ( res.message ) return res.send( { status: 'OK', message: res.message } )
    res.send( { status: 'OK', data: res.data } )
}

r.post( '/getConcept', bimq.getBimqElementTree, sendResponse )
r.post( '/getMappingID', bimq.getBimqMappingID, sendResponse )
r.post( '/getElementProperties', bimq.getBimqElementProperties, sendResponse )
r.post( '/refreshDatabase', checkAdminRole, bimq.refreshDatabase, sendResponse )

module.exports = r