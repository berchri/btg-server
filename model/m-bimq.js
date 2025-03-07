const fs = require( 'fs' );
const axios = require( 'axios' );
const https = require( 'https' );
const url = require( 'url' );
const qs = require( 'querystring' );
const mongoose = require( 'mongoose' );

const { unitsData } = require( './m-app.js' );
const { httpsAgent, bimqMongo, swietoolskyMongo } = require( '../main.js' );

async function getBimqConceptTree( root_node_id, mapping_id = '', context, token ) {
    let urlparams = new url.URLSearchParams( {
        template: false,
        root_node_id,
    } )
    if ( mapping_id ) urlparams.append( 'mapping_id', mapping_id )

    let config = {
        method: 'get',
        // maxBodyLength: Infinity,
        url: `https://server.bim-q.de/api/v1/contexts/${context}/get_concept_tree.json?${urlparams}`,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        httpsAgent
    };

    let res = await axios.request( config )
    return res.data
}

async function getBimqMapItem( mapping_id, token ) {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://server.bim-q.de/api/v1/map_items.json?mapping_id=${mapping_id}`,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        httpsAgent
    };

    let res = await axios.request( config )
    return res.data
}

async function getBimqMappingID( context, token ) {
    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://server.bim-q.de/api/v1/contexts/${context}/mappings.json`,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        httpsAgent
    };

    let res = await axios.request( config )
    return res.data
}

async function getBimQModels( actor_id = 12890, context = 2164, token ) {
    let urlparams = new url.URLSearchParams( {
        actor_id,
    } )

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://server.bim-q.de/api/v1/contexts/${context}/models.json?${urlparams}`,
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        httpsAgent
    };

    let res = await axios.request( config )
    return res.data
}

function prepareTreeViewData( treeData, level = 0, path = [0], parentNames = [] ) {
    let tree = {
        id: treeData.id,
        level: level,
        name: treeData.name,
        code: treeData.code,
        children: [],
        parentNames: [...parentNames],
        path: [...path]
    }
    if ( level === 0 ) {
        tree.project_id = treeData.project_id
        tree.project = treeData.project
    }

    if ( treeData.child_concept && treeData.datatype !== 'Type' ) {
        level++
        treeData.child_concept.forEach( ( child, index ) => {
            tree.children.push( prepareTreeViewData( child, level, [...path, index], [...parentNames, tree.name] ) )
        } )
    }
    return tree
}

// function mapModelProperties( treeNode, mapping ) {
//     if ( treeNode.child_concept ) {
//         treeNode.child_concept.map( child => mapModelProperties( child, mapping ) )
//     }
//     if ( treeNode.datatype === 'Property' ) {
//         const revitParameterType = mapping.find( e => e.concept_id === treeNode.template_id )
//         treeNode.revitParameterType = revitParameterType ? revitParameterType.name : null;
//     }
//     return treeNode
// }

function prepareElementPropertiesData( treeData ) {
    //20968290
    let children = treeData.child_concept[0].child_concept
    children = children.filter( e => e.map_item === 'Typ' )
    children = children.map( e => createInputSettingsObject( e ) )
    return {
        ...treeData,
        children,
        child_concept: [] // remove to get original child Data
    }
}

class InputSettings {
    constructor( prop ) {
        this.id = prop.id
        this.origin = 'BIMQ'
        this.name = prop.name
        this.nameUI = ''
        this.active = true
        // this.defaultValue = ''

        const [group, ifcType, ifcUnit = ''] = prop.unit_reference.split( '.' );
        this.bimqType = group
        this.ifcType = ifcType
        this.ifcUnit = ifcUnit
    }
}

class BooleanProp extends InputSettings {
    constructor( prop ) {
        super( prop )
        this.inputType = 'boolean'

        this.defaultValue = false
        this.changeable = true
        this.typeNameTrue = ''
        this.typeNameFalse = ''

        if ( prop.constraint ) {
            const value = prop.constraint.expression.constraint_value
            this.defaultValue = value === 'true'
            this.changeable = false
        }
    }
}

class TextProp extends InputSettings {
    constructor( prop ) {
        super( prop )
        if ( prop.child_concept ) {
            // this.child_concept = prop.child_concept
            this.inputType = 'select'
            this.active = prop.child_concept.length <= 1 ? false : true
            this.values = prop.child_concept.map( e => ( { value: e.name, nrValue: '', shortname: '' } ) )
            this.defaultValue = 0
            this.influenceOn = []
        } else {
            this.inputType = 'text'
            this.length = ''
            this.typeNameSuffix = true
        }
    }
}

class NumberProp extends InputSettings {
    constructor( prop, numberType = 'real' ) {
        super( prop )
        this.inputType = 'number'
        this.numberType = numberType
        this.defaultValue = ''
        this.constraint = false


        const expression = prop.constraint?.expression || null
        if ( expression && Array.isArray( expression.left_value ) && Array.isArray( expression.right_value ) ) {
            this.constraint = true
            this.values = expression.left_value.map( ( e, i ) => ( { value: e, shortname: '' } ) )
            // this.child_concept = expression.left_value.map( ( e, i ) => ( { id: prop.id + '-' + i, name: e } ) )
            this.defaultValue = 0
            this.inputType = 'select number'
        } else {
            this.get_value_from = []
            this.min = ''
            this.max = ''
            this.equalToMin = true
            this.equalToMax = true
        }

        if ( expression && !Array.isArray( expression.left_value ) && !Array.isArray( expression.right_value ) ) {
            // this.min = prop.constraint.expression.left_value === 'Infinity' ? -Infinity : prop.constraint.expression.left_value
            // this.max = prop.constraint.expression.right_value === 'Infinity' ? Infinity : prop.constraint.expression.right_value
            this.constraint = true
            this.min = prop.constraint.expression.left_value
            this.max = prop.constraint.expression.right_value
            this.equalToMin = prop.constraint.expression.left_bound === '['
            this.equalToMax = prop.constraint.expression.right_bound === ']'
        }
    }
}

class MeasurementProp extends NumberProp {
    constructor( prop ) {
        super( prop )
        // console.log( prop )
        // console.log( unitsData )
        const measures = unitsData.find( e => e.unitType === this.ifcType )?.units || null
        // this.measures = measures

        this.ifcUnitDefault = measures.find( e => e.factor === 1 ).name
        this.ifcUnitChangeable = this.ifcUnit ? false : true


        const { name, abbr, factor } = measures.find( e => e.name === ( this.ifcUnit || this.ifcUnitDefault ) )
        this.ifcUnitAbbr = abbr
        this.ifcUnitFactor = factor // factor to convert from base unit to this unit
        this.ifcUnit = name

        if ( this.values ) {
            this.values = this.values.map( e => ( { ...e, nrValue: e.value / factor } ) )
            this.influenceOn = []
        }
    }
}


function createInputSettingsObject( prop ) {
    const [group, ifcType, ifcUnit = ''] = prop.unit_reference.split( '.' );

    if ( ifcType === 'IfcBoolean' ) {
        return new BooleanProp( prop )
    }

    const textTypes = ['IfcText', 'IfcLabel', 'IfcIdentifier']
    const integerTypes = ['IfcInteger', 'IfcCountMeasure']
    const realTypes = ['IfcReal', 'IfcNumericMeasure']

    if ( textTypes.includes( ifcType ) ) {
        return new TextProp( prop )
    }

    if ( integerTypes.includes( ifcType ) ) {
        return new NumberProp( prop, 'integer' )
    }

    if ( realTypes.includes( ifcType ) ) {
        return new NumberProp( prop, 'real' )
    }

    if ( group === 'Measurements' ) {
        return new MeasurementProp( prop )
    }

    return null
}



const Schema = new mongoose.Schema( {
    id: Number,
    name: String,
    project_id: Number,
    child_concept: Array,
}, { strict: false } )

const Schemas = {
    elements: bimqMongo.model( 'Elements', Schema, 'elements' ),
    model: bimqMongo.model( 'Model', Schema, 'models' ),
    properties: bimqMongo.model( 'Properties', Schema, 'properties' )
}

async function saveToDatabase( schemaName, data ) {
    let savedDocument = await Schemas[schemaName].findOneAndReplace( { id: data.id, project_id: data.project_id }, data, { new: true } )
    if ( savedDocument === null ) {
        const newDocument = new Schemas[schemaName]( data );
        savedDocument = await newDocument.save()
    }
    console.log( 'New concept saved. => ' + savedDocument.name )
}


module.exports = { getBimqConceptTree, getBimqMappingID, prepareTreeViewData, getBimqMapItem, saveToDatabase, prepareElementPropertiesData }