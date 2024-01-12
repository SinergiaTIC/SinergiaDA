# PROCEDIMEINTO DE INTEGRACIÓN Y GUIA DE ESTILO DE DESARROLLO PARA SINERGIA DATA ANALYTICS 

Este documento recoge la guia de estilo para los desarrollos propios de Sinergia Data Analytics con el objetivo de que la sincronización en ambos sentidos con EDA sea lo más eficiente posible. 


## Guia de estilo para las clases typescript


Cuando se tenga que modificar un método de una clase específico para SDA y que entre en conflicto con el método original de EDA se hará mediante un decorador ( https://www.typescriptlang.org/docs/handbook/decorators.html ) Esto permite aislar las modificaciones específicas de SDA. 

Gracias a los decoradores podemos mantener el método original de EDA inalterado y sobreescribirlo de forma segura mediante el decorador de método. Todos los decoradores es escribirán en el mismo archivo de la clase typescrit. O si son muchos o muy extensos se pueden escribir en un archivo aparte con el mismo nombre de la clase con el nombre custom precediendolo. 

Para la app, por defecto, ya está habilitada la posibilidad de sobrecargar las clases con decoradores. Para la api. Habrá que habilitarlo la primera vez en  **eda/eda_api/tsconfig.json**

      "experimentalDecorators": true,

Existe un ejemplo en eda/eda_api/lib/module/admin/users/user.controller.ts


Delcaramos la función decorador al principio del archivo. fuera de la clase. Pasandole todos los parámetros que necestia la función que vamos a sobreescribir. Luego invocamos el decorador justo encima del método para que se sobreescriba. 

El código queda parecido a esto: 

```
function CustomSingleSingnOn(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      console.log('Nueva lógica de Single Sign On', req.body);
      return res.status(200).json({ok: 'nuevo sign on'});
    };
}

export class UserController {
    static async login(req: Request, res: Response, next: NextFunction) {
...
    }

    @CustomSingleSingnOn
    static async singleSingnOn(req:Request, res:Response, next:NextFunction){
        console.log('Single Sign On', req.body);
        return res.status(200).json({foo:"var"})
    }
```


## Guia de estilo para código html y css

El html y el CSS son lenguajes declarativos por lo que no se puede sobreescribir fácilmente. En caso de que se tengan que hacer cammbios en el html o css que sean incompatibles con EDA se añadirá un comentario al principio de cada línea.  La linea original de EDA se mantendrá pero comentada con el fin de mantener la trazabilidad. Añadiremos 
<!--SDA CUSTOM--> al principio de cada linea html 
/*SDA CUSTOM*/ al principio de cada linea css.

El código queda parecido a esto:
### HTML
```
                            <div class = "langoption">
                                <span class="language" (click)="redirectLocale('CAT')">Català &nbsp;</span>
                                <span class="language" (click)="redirectLocale('ES')">Español &nbsp;</span>
                                <span class="language" (click)="redirectLocale('EN')">English &nbsp;</span>
                                <!--span class="language" (click)="redirectLocale('PL')">Polski &nbsp;</span-->
                                <!--SDA CUSTOM--> <span class="language" (click)="redirectLocale('GL')">Galego &nbsp;</span>
                            </div>
```
### CSS

```
.login .btn:hover {
  /* background-color: #C7CE43; */
  /*SDA CUSTOM*/ background-color: #C7CE43;
  color: #000;
}
```
En caso de que se creen clases nuevas específicas de SDA se prefijarán con el nombre **SDA_XXXX**


## PROCEDIMEINTO DE INTEGRACIÓN 

### Sincronizar SDA con EDA

1. se hará un una nueva rama a partir de la rama Reporting.
2. se hará un merge a partir de la rama de EDA que se quiere integrar. 
3. Cuando se haga un merge hay que:


3.1 Respetar los archivos propios de SDA:

SinergiaDA\.github\PULL_REQUEST_TEMPLATE\Plantilla para Pull Request.md
SinergiaDA\.github\PULL_REQUEST_TEMPLATE.md
SinergiaDA\eda\eda_api\config\base_datamodel.json
SinergiaDA\eda\eda_api\config\sinergiacrm.config.js
SinergiaDA\eda\eda_api\lib\guards\updateModel-guard.ts
SinergiaDA\eda\eda_api\lib\module\updateModel
SinergiaDA\eda\eda_api\lib\module\updateModel\models
SinergiaDA\eda\eda_api\lib\module\updateModel\models\dashboard.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\models\data-source.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\models\groups.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\models\users.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\service
SinergiaDA\eda\eda_api\lib\module\updateModel\service\cleanModel.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\service\enumerations.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\service\push.Model.to.Mongo.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\service\sda_basic.group.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\service\usersAndGroupsToMongo.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\updateModel.controller.ts
SinergiaDA\eda\eda_api\lib\module\updateModel\updateModel.router.ts
SinergiaDA\eda\eda_app\src\locale\messages.es.xlf
SinergiaDA\eda\eda_app\src\locale\messages.gl.xlf
**ESTA LISTA SE DEBE ACTUALIZAR CON TODOS LOS NUEVOS ARCHIVOS QUE SE GENEREN NUEVOS EN SINERGIA DATA ANALYTICS**