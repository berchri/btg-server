import { config } from 'dotenv';
config( { path: '../.env' } );
/*
***********************
*   Database Access   *
***********************
*/
import mongoose from 'mongoose';

const name = encodeURIComponent( process.env.MONGODB_USER_BIMQ )
const pw = encodeURIComponent( process.env.MONGODB_PW_BIMQ )

console.log( 'Connecting to Database...' )
try {
    await mongoose.connect( `mongodb://${name}:${pw}@127.0.0.1:27017/bimq?authSource=bimq` )
    console.log( 'Database connected' )
} catch ( error ) {
    console.log( error );
    throw new Error( 'Database Connection Error!' )
}

/*
******************
*   BimQ Access  *
******************
*/
import fs from 'fs'
import axios from 'axios'
import https from 'https'
import url from 'url'
import qs from 'querystring'
import { group } from 'console';

console.log( 'Getting BimQ Access Token...' )

let httpsAgent
try {
    httpsAgent = new https.Agent( { ca: fs.readFileSync( '../../certs.pem' ) } )
} catch ( e ) {
    httpsAgent = null
}

const postData = qs.stringify( {
    'refresh_token': process.env.BIMQ_REFRESH_TOKEN,
    'grant_type': 'refresh_token',
    'client_id': process.env.BIMQ_CLIENT_ID
} );

const options = {
    headers: {
        'content-type': 'application/x-www-form-urlencoded',
    },
    httpsAgent
};

let token;
try {
    const response = await axios.post( 'https://server.bim-q.de/oauth/token', postData, options )
    token = response.data.access_token
    console.log( 'Access Token received.' )
} catch ( error ) {
    // console.log( error );
    throw new Error( 'Error. Cannot get Access Token' )
}


/*
************************************
*   BimQ Requests and Data Saving   *
************************************
*/

async function getBimQConceptTree( { template, root_node_id, context } ) {
    let urlparams = new url.URLSearchParams( {
        template,
        root_node_id,
    } )

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://server.bim-q.de/api/v1/contexts/${context}/get_concept_tree.json?${urlparams}`,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        httpsAgent
    };
    // console.log( config )

    try {
        let res = await axios.request( config )
        // console.log( 'res: ', res.data )
        return res.data
    } catch ( error ) {
        // console.log( error )
        console.log( 'Error!' )
        return null
    }

}

const apiRequests = [
    { template: true, root_node_id: 19603238, context: 2223 },
]

const ConceptSchema = new mongoose.Schema( {
    project_id: Number,
    group: Number,
    id: Number,
    name: String,
    child_concept: Array,
}, { strict: false } )
const Concept = mongoose.model( 'Models', ConceptSchema, 'models' );

async function saveToDatabase( conceptData ) {
    const groupID = conceptData.id
    const propertyList = conceptData.child_concept

    try {
        let savedConcept = await Concept.findOneAndReplace( { id: conceptData.id, project_id: conceptData.project_id }, conceptData, { new: true } )
        if ( savedConcept === null ) {
            const newConcept = new Concept( {
                ...conceptData
            } );
            savedConcept = await newConcept.save()
        }
        console.log( 'New concept saved. => ' + savedConcept.name )
    } catch ( error ) {
        // console.log( 'error :>> ', error );
        console.log( 'Error!' )
    }
}

for ( const request of apiRequests ) {
    const conceptData = await getBimQConceptTree( request )
    await saveToDatabase( conceptData )
}

process.exit()
