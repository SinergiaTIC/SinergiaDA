


  export function muSqlBuilderServiceCustomGetMinFractionDigits(target: Object, propertyKey: string, descriptor: any) {
	descriptor.value = function (el: any) {
        if (!el.hasOwnProperty('minimumFractionDigits')) {
            el.minimumFractionDigits = 0;
          }
          /*SDA CUSTOM*/if(el.aggregation_type ==='avg'){
          /*SDA CUSTOM*/  el.minimumFractionDigits = 2;
          /*SDA CUSTOM*/}
          return el;
    }
    return descriptor;
}