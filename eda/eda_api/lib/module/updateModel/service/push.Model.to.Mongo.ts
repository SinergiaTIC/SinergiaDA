import { HttpException } from "module/global/model";
import DataSource ,{ IDataSource }   from "../../datasource/model/datasource.model";
import _ from "lodash";

export class pushModelToMongo {

    // en esta clase haremos métodos para actualizar la tabla data-source de EDA mongo

    public async  pushModel(model, res) {
      

            let model_id = model._id;
            let model_ds = _.cloneDeep(model.ds);
        
            const found = await DataSource.findById(model_id);
            
            if (found == null) {
                try {
                    if (model_id !== '111111111111111111111111') {
                        console.log('El modelo no es el esperado.');
                        res.status(500).json({'status4':'ko'})
                    } else {
                        const data = await new DataSource(model) ;
                        data.save();
                        console.timeLog('UpdateModel', '(TOTAL)')
                        console.log('\x1b[33m=====\x1b[0m \x1b[1;34mEnd Update Model (Created)\x1b[0m \x1b[33m=====\x1b[0m');
                    }
                    
                } catch(e) {
                    console.log('Error 6', e);
                    res.status(500).json({'status':'ko'})
                }
                
            }else {
                try {
                    //console.log('El modelo ya existe.....')
                    if (model_ds != null || model_ds != undefined) {
                        await DataSource.updateOne({_id: model_id}, {ds: model_ds})  
                        console.timeLog('UpdateModel', '\x1b[1;34m(TOTAL)\x1b[0m');
                        console.log('\x1b[33m=====\x1b[0m \x1b[1;34mEnd Update Model (Updated)\x1b[0m \x1b[33m=====\x1b[0m');
                    } else {
                        console.log("Error actualizando 7", model_ds )
                        res.status(500).json({'status':'ko'})
                    }

                } catch (e) {
                    if (e) {
                        console.log('Error 8: ', e);
                        res.status(500).json({'status':'ko'})
                    }
                    
                } 
                
            } 

     

    
    }    

}