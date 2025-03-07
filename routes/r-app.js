const express = require( 'express' )
const querystring = require( 'querystring' )
const r = express.Router()
const c = require( '../controller/c-app.js' )

const checkAuth = ( req, res, next ) => {
    if ( req.user ) {
        // console.log( 'checkAuth: ', req.user )
        next()
    } else {
        // redirect to login
        if ( Object.keys( req.query ).length !== 0 ) {
            res.redirect( `/login/?${querystring.stringify( req.query )}` );
        } else {
            res.redirect( '/login' );
        }
    }
}

const checkAdminRole = ( req, res, next ) => {
    if ( req.user.role === 'admin' ) {
        next()
    } else {
        res.send( { status: 'error', message: 'You do not have permission to access this page!' } )
    }
}

// Authentication for all Routes
r.use( checkAuth )

try {
    r.use( '/', express.static( process.env.PATH_REACT_BUILD ) );
} catch ( err ) {
    console.error( 'Error reading the React app file:', err );
}

r.post( '/start', ( req, res, next ) => {
    res.send( { status: 'OK', user: req.user } )
} )

function sendResponse( req, res ) {
    if ( res.error ) return res.send( { status: 'error', message: res.message || 'Server Error!' } )
    if ( res.message ) return res.send( { status: 'OK', message: res.message, data: res.data || null } )
    return res.send( { status: 'OK', data: res.data } )
}

r.post( '/revit-categories', c.getRevitCategories, sendResponse )
r.post( '/get-template', c.getTemplateData, sendResponse )
r.post( '/remove-element', c.removeElement, sendResponse )
r.post( '/save-template', checkAdminRole, c.saveTemplateData, sendResponse )
r.post( '/get-units', c.getUnitsData, sendResponse )

module.exports = r