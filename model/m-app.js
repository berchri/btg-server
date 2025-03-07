const fs = require( 'fs' );
const mongoose = require( 'mongoose' );
const { httpsAgent, bimqMongo, swietoolskyMongo } = require( '../main.js' );
const { get } = require( 'http' );

class RevitProperty {
    constructor( prop ) {
        const { name, nameUI, exportPosition, ifcType, ifcUnit, ifcUnitAbbr } = prop;
        this.id = name;
        this.name = name;
        this.nameUI = nameUI;
        this.exportPosition = exportPosition || '';
        this.origin = 'Revit';
        this.min = '';
        this.max = '';
        this.unit = 'cm';
        this.ifcType = ifcType || 'IfcLengthMeasure';
        this.ifcUnit = ifcUnit || 'CENTI-METRE'
        this.ifcUnitAbbr = ifcUnitAbbr || 'cm';
        this.get_value_from = [];
        this.get_min_from = [];
        this.get_max_from = [];
        this.influenceOn = [];
        this.required = true;
        this.active = true;
        this.defaultValue = '';
    }
}

const getRevitCategories = async ( req, res, next ) => {
    const data = fs.readFileSync( './data/params.json', 'utf8' );
    let categories = JSON.parse( data )
    categories = categories.map( e => (
        {
            ...e,
            properties: e.properties.map( prop =>
                new RevitProperty( prop )
            )
        }
    ) )
    return categories;
}

const templateSchema = new mongoose.Schema( {
    bimqProjectID: Number,
    bimqProjectName: String,
    bimqRequirementsID: Number,
    bimqRequirementsName: String,
    bimqMappingID: Number,
    configurationData: [{
        id: Number,
        propertySettingsList: [{ type: Object, _id: false }],
        elementDetails: { type: Object, _id: false },
        relationsData: { type: Object, _id: false },
        _id: false
    }],
    elementTree: { type: Array, default: [] }
}, { strict: false } )

const Template = swietoolskyMongo.model( 'Template', templateSchema, 'templates' )

const saveTemplateData = async ( data ) => {
    let newDocument = {
        bimqProjectID: data.projectID,
        bimqProjectName: data.projectName,
        bimqRequirementsID: data.requirementsID,
        bimqRequirementsName: data.requirementsName,
        bimqMappingID: data.mappingID,
        configurationData: data.configurationData,
        elementTree: data.elementTree
    }

    let savedDocument = await Template.findOneAndUpdate( {
        bimqRequirementsID: data.requirementsID,
        bimqProjectID: data.projectID
    }, newDocument, { new: true } )

    if ( savedDocument === null ) {
        newDocument = new Template( newDocument );
        savedDocument = await newDocument.save()
        if ( savedDocument === null ) throw new Error( 'Error saving template data' )
    }
    return savedDocument
}

const removeElement = async ( data ) => {
    let updatedTemplate = await Template.findOneAndUpdate( {
        bimqRequirementsID: data.bimqRequirementsID,
        bimqProjectID: data.bimqProjectID
    }, { $pull: { configurationData: { id: data.bimqElementID } } }, { new: true } )

    if ( updatedTemplate === null ) throw new Error( 'Error removing element' )
    return updatedTemplate
}

const removeTemplateData = async ( data ) => {
    let removedDocument = await Template.findOneAndDelete( {
        bimqRequirementsID: data.bimqRequirementsID,
        bimqProjectID: data.bimqProjectID
    } )
    if ( removedDocument === null ) throw new Error( 'Error removing template' )
    return true
}

const getUnitsData = () => {
    const data = fs.readFileSync( './data/units.json', 'utf8' );
    return JSON.parse( data );
}
const unitsData = getUnitsData()


module.exports = { getRevitCategories, saveTemplateData, removeTemplateData, removeElement, Template, unitsData }