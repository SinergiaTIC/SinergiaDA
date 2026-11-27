import cluster from 'cluster';
import os from 'os';

const apiConfig = require('../config/eda_api_config');
const numCPUs: number = (apiConfig.cluster_workers > 0) ? apiConfig.cluster_workers : os.cpus().length;

interface IError extends Error {
    status?: any;
}

const PORT = apiConfig.port;

if (cluster.isMaster) {
    console.log(`\n\x1b[34m=====\x1b[0m Master \x1b[32m[PID:${process.pid}]\x1b[0m iniciando \x1b[32m${numCPUs}\x1b[0m workers en puerto \x1b[32m[${PORT}]\x1b[0m \x1b[34m=====\x1b[0m\n`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`\x1b[31m[Cluster] Worker ${worker.process.pid} terminó (code: ${code}, signal: ${signal}). Reiniciando...\x1b[0m`);
        cluster.fork();
    });

} else {
    const app = require('./app').default;

    // catch 404 and forward to error handler
    app.use(function(_req: any, _res: any, next: any) {
        let err: IError = new Error();
        err.status = 404;
        err.message = 'Not Found';
        next(err);
    });

    // error handler
    app.use(function(err: IError, _req: any, res: any, _next: any) {
        // set locals, only providing error in development
        res.message = err.message;
        res.error = err;

        // render the error page
        res.status(err.status || 500);
        res.status(err.status).json(err);
    });

    app.listen(PORT, () => {
        console.log(`\n\x1b[34m=====\x1b[0m Worker \x1b[32m[PID:${process.pid}]\x1b[0m escuchando en puerto \x1b[32m[${PORT}]\x1b[0m \x1b[34m=====\x1b[0m\n`);
    });

}
