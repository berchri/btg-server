const bimqModel = require( '../model/m-bimq.js' );
const appModel = require( '../model/m-app.js' );
const fs = require( 'fs' );
const axios = require( 'axios' );
const https = require( 'https' );
const url = require( 'url' );
const qs = require( 'querystring' );


let context = 2164;
// let mapping_id = 17967;
let root_node_id = 18740745;

const getBimqElementTree = async ( req, res, next ) => {
    root_node_id = req.body.bimqRequirementsID || root_node_id;
    context = req.body.bimqProjectID || context
    mapping_id = req.body.mappingID || ''

    try {
        const apiData = await bimqModel.getBimqConceptTree( root_node_id, mapping_id, context, req.accessToken );
        res.data = bimqModel.prepareTreeViewData( apiData );
        // console.log( 'res.data :>> ', res.data );
    } catch ( error ) {
        // console.log( 'error :>> ', error );
        res.error = error
    }
    return next();
}

const getBimqMappingID = async ( req, res, next ) => {
    context = req.body.bimqProjectID || context

    try {
        let mappings = await bimqModel.getBimqMappingID( context, req.accessToken );
        let mappingObj = mappings.find( mapping => mapping.target === 'Typ/Exemplar' );

        if ( !mappingObj ) throw new Error( 'Mapping not found!' );
        res.data = mappingObj;
    } catch ( error ) {
        res.error = error
    }
    return next();
}

const getBimqElementProperties = async ( req, res, next ) => {
    context = req.body.bimqProjectID || context
    root_node_id = req.body.elementID || root_node_id
    mapping_id = req.body.mappingID

    try {
        let bimqData = await bimqModel.getBimqConceptTree( root_node_id, mapping_id, context, req.accessToken );
        res.data = bimqModel.prepareElementPropertiesData( bimqData );
    } catch ( error ) {
        console.log( 'error :>> ', error );
        res.error = error
    }
    return next();
}

const refreshDatabase = async ( req, res, next ) => {

    let conceptRequests = [
        {
            context: 2164,
            root_node_id: 18738473,
            type: 'elements'
        },
        {
            context: 2164,
            root_node_id: 18767536,
            type: 'properties'
        },
        {
            context: 2164,
            root_node_id: 18740745,
            type: 'model'
        },
        {
            context: 2223,
            root_node_id: 19603229,
            type: 'elements'
        },
        {
            context: 2223,
            root_node_id: 19603228,
            type: 'properties'
        },
        {
            context: 2223,
            root_node_id: 19603238,
            type: 'model'
        },
        {
            context: 2468,
            root_node_id: 22512866,
            type: 'elements'
        },
        {
            context: 2468,
            root_node_id: 22699594,
            type: 'properties'
        },
        {
            context: 2468,
            root_node_id: 22638355,
            type: 'model'
        }
    ]

    let bimqContexts = new Set( conceptRequests.map( request => request.context ) );
    bimqContexts = [...bimqContexts];

    for ( const context of bimqContexts ) {
        try {
            let mappings = await bimqModel.getBimqMappingID( context, req.accessToken );
            let mappingObj = mappings.find( mapping => mapping.target === 'Typ/Exemplar' );
            if ( !mappingObj ) throw new Error( 'Mapping not found! Context: ' + context );
            conceptRequests = conceptRequests.map( request =>
                request.context === context ? { ...request, mappingID: mappingObj.id } : request
            )
        } catch ( error ) {
            res.error = error
            return next();
        }
    }

    for ( const request of conceptRequests ) {
        try {
            let conceptData = await bimqModel.getBimqConceptTree( request.root_node_id, request.mappingID, request.context, req.accessToken );
            // if ( request.type === 'properties' ) {
            //     conceptData = bimqModel.mapProperties( conceptData, mapping );
            // }
            // if ( request.type === 'model' ) {
            //     conceptData = bimqModel.mapModelProperties( conceptData, mapping )
            // }
            await bimqModel.saveToDatabase( request.type, conceptData );

        } catch ( error ) {
            res.error = error
            return next();
        }
    }

    res.message = 'Database Refreshed!'
    return next();
}


module.exports = { getBimqElementTree, getBimqElementProperties, getBimqMappingID, refreshDatabase }