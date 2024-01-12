import { NextFunction, Request, Response } from 'express';
import DataSource, { IDataSource } from './model/datasource.model';
import Dashboard from '../dashboard/model/dashboard.model';
import { HttpException } from '../global/model/index';
import ManagerConnectionService from '../../services/connection/manager-connection.service';
import ConnectionModel from './model/connection.model';
import { EnCrypterService } from '../../services/encrypter/encrypter.service';
import BigQueryConfig from './model/BigQueryConfig.model';
import CachedQuery, { ICachedQuery } from '../../services/cache-service/cached-query.model';
import { Mongoose, QueryOptions } from 'mongoose';
import { upperCase } from 'lodash';
import Group from '../admin/groups/model/group.model';
import { json } from 'body-parser';
const cache_config = require('../../../config/cache.config');




export function CustomGetDataSourcesNamesForEdit(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
        const groups = await Group.find({users: {$in: req.user._id}}).exec();
        const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;
        const output = [];
        let options:QueryOptions = {};
        // Si l'usuari es admin retorna tots els ds.
        if(isAdmin){
            DataSource.find({}, '_id ds.metadata.model_name ds.security', options, (err, ds) => {
                if (!ds) {
                    return next(new HttpException(500, 'Error loading DataSources'));
                }
                const names = JSON.parse(JSON.stringify(ds));
                for (let i = 0, n = names.length; i < n; i += 1) {
                    const e = names[i];
                    if (e._id != "111111111111111111111111") {
                    output.push({ _id: e._id, model_name: e.ds.metadata.model_name });
                    }
                }
                output.sort((a,b) => (upperCase(a.model_name) > upperCase(b.model_name)) ? 1 : 
                ((upperCase(b.model_name) > upperCase(a.model_name)) ? -1 : 0));
                return res.status(200).json({ ok: true, ds: output });
            });
            
        }else{
            // Si l'usuari NO es admin retorna els seus.
            DataSource.find({}, '_id ds.metadata.model_name ds.metadata.model_owner',options, (err, ds) => {
            if (!ds) {
                return next(new HttpException(500, 'Error loading DataSources'));
            }
            const names = JSON.parse(JSON.stringify(ds));
            
            for (let i = 0, n = names.length; i < n; i += 1) {
                const e = names[i];
                // Si tenim  propietari....
                if (e.ds.metadata.model_owner) {
                    // Si el model es meu....
                    if ( (req.user._id  == e.ds.metadata.model_owner)) {
                        // Si no es diu el _id no es el de SinergiaDA...
                        if (e._id != "111111111111111111111111") {
                            output.push({ _id: e._id, model_name: e.ds.metadata.model_name });
                        } 
                    }

                } 
            } 
            output.sort((a,b) => (upperCase(a.model_name) > upperCase(b.model_name)) ? 1 : ((upperCase(b.model_name) > upperCase(a.model_name)) ? -1 : 0));
            return res.status(200).json({ ok: true, ds: output });
            });
        }
    };
}
