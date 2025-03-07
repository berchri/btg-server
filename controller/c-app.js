const appModel = require( '../model/m-app.js' );

const getRevitCategories = async ( req, res, next ) => {
    try {
        res.data = await appModel.getRevitCategories();
        if ( !res.data ) {
            res.error = true
            res.message = 'No Data Found!'
        }
    } catch ( error ) {
        // console.log( 'error getRevitCategories:>> ', error );
        res.error = true
        res.message = 'Error getting Revit Categories.'
    }
    next();
}

const saveTemplateData = async ( req, res, next ) => {
    try {
        res.data = await appModel.saveTemplateData( req.body );
    } catch ( error ) {
        // console.log( 'error :>> ', error );
        res.error = true
        res.message = 'Error saving template data.'
    }
    next();
}

const getTemplateData = async ( req, res, next ) => {
    try {
        res.data = await appModel.Template.findOne( req.body );
        if ( !res.data ) {
            res.message = 'No Data Found!'
        }
    } catch ( error ) {
        // console.log( 'error getTemplateData:>> ', error );
        res.error = true
    }
    next();
}

const removeElement = async ( req, res, next ) => {
    try {
        res.data = await appModel.removeElement( req.body );
        res.message = 'Element removed successfully.'

        if ( res.data.configurationData.length === 0 ) {
            await appModel.removeTemplateData( req.body );
            res.message = 'No more elements in the template. Removed empty template.'
        }

    } catch ( error ) {
        // console.log( 'Error removeElement:>> ', error );
        res.error = true
        res.message = 'Error removing element.'
    }
    next();
}

const getUnitsData = async ( req, res, next ) => {
    try {
        res.data = appModel.unitsData;
    } catch ( error ) {
        res.error = true
        res.message = 'Error getting units Data.'
    }
    next();
}

module.exports = { getRevitCategories, saveTemplateData, getTemplateData, removeElement, getUnitsData }