import { QueryBuilderService } from './../query-builder.service';
import * as _ from 'lodash';



export class MySqlBuilderService extends QueryBuilderService {
  parseSchema(tables: string[], schema: string) {
    return tables;
  }

  public normalQuery(columns: string[], origin: string, dest: any[], joinTree: any[], grouping: any[], tables:Array<any>, limit:number): any {

    let o = tables.filter(table => table.name === origin).map(table => {return table.query? table.query : table.name})[0];
    let myQuery = `SELECT ${columns.join(', ')} \nFROM ${o}`;

    const filters = this.queryTODO.filters;

    // JOINS
    const joinString = this.getJoins(joinTree, dest, tables);

    joinString.forEach(x => {
      myQuery = myQuery + '\n' + x;
    });

    // WHERE
    myQuery += this.getFilters(filters);



    // GroupBy
    if (grouping.length > 0) {
      myQuery += '\ngroup by ' + grouping.join(', ');
    }

    // OrderBy
    const orderColumns = this.queryTODO.fields.map(col => {
      let out;

      if (col.ordenation_type !== 'No' && col.ordenation_type !== undefined) {
        out = `\`${col.display_name}\` ${col.ordenation_type}`
      } else {
        out = false;
      }

      return out;
    }).filter(e => e !== false);

    const order_columns_string = orderColumns.join(',');
    if (order_columns_string.length > 0) {
      myQuery = `${myQuery}\norder by ${order_columns_string}`;
    }

    if(limit) myQuery += `\nlimit ${limit}`;

    return myQuery;
  };

  public getFilters(filters): any {
    if (this.permissions.length > 0) {
      this.permissions.forEach(permission => { filters.push(permission); });
    }
    if (filters.length) {
      let filtersString = '\nwhere 1 = 1 ';
      filters.forEach(f => {
        if (f.filter_type === 'not_null') {
          filtersString += '\nand ' + this.filterToString(f);
        } else {
          /* Control de nulos... se genera la consutla de forma diferente */
          let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
          if (nullValueIndex != - 1) {
            if (f.filter_elements[0].value1.length === 1) {
              /* puedo haber escogido un nulo en la igualdad */
              if( f.filter_type == '='   ){
                  filtersString += `\nand \`${f.filter_table}\`.\`${f.filter_column}\`  is null `;
              }else{
                filtersString += `\nand \`${f.filter_table}\`.\`${f.filter_column}\`  is not null `;
              }
            } else {
                if( f.filter_type == '='   ){
                  filtersString += `\nand (${this.filterToString(f)} or \`${f.filter_table}\`.\`${f.filter_column}\`  is null) `;
                 }else{
                  filtersString += `\nand (${this.filterToString(f)} or \`${f.filter_table}\`.\`${f.filter_column}\`  is not null) `;
                }             
            }
          } else {
            filtersString += '\nand ' + this.filterToString(f);
          }
        }
      });
      //console.log(filtersString)
      return filtersString;
    } else {
      return '';
    }
  }

  public getJoins(joinTree: any[], dest: any[], tables:Array<any>): any {

    let joins = [];
    let joined = [];
    let joinString = [];

    for (let i = 0; i < dest.length; i++) {
      let elem = joinTree.find(n => n.name === dest[i]);
      let tmp = [];
      elem.path.forEach(parent => {
        tmp.push(parent);
      });
      tmp.push(elem.name);
      joins.push(tmp);
    }

    joins.forEach(e => {
      for (let i = 0; i < e.length - 1; i++) {
        let j = i + 1;
        if (!joined.includes(e[j])) {

          let joinColumns = this.findJoinColumns(e[j], e[i]);
          joined.push(e[j]);
          let t = tables.filter(table => table.name === e[j]).map(table => {return table.query? table.query : `\`${table.name}\``})[0];
          joinString.push(`inner join ${t} on \`${e[j]}\`.\`${joinColumns[1]}\` = \`${e[i]}\`.\`${joinColumns[0]}\``);
        }
      }
    });

    return joinString;

  }

  public getSeparedColumns(origin: string, dest: string[]): any {

    const columns = [];
    const grouping = [];

    this.queryTODO.fields.forEach(el => {
      el.order !== 0 && el.table_id !== origin && !dest.includes(el.table_id) ? dest.push(el.table_id) : false;


      // chapuza de JJ para integrar expresiones. Esto hay que hacerlo mejor.
      if (el.computed_column === 'computed_numeric') {
        columns.push(` cast( ${el.SQLexpression}  as decimal(32,2) ) as "${el.display_name}"`);
      } else {
        if (el.aggregation_type !== 'none') {
          if (el.aggregation_type === 'count_distinct') {
            columns.push(`cast( count( distinct \`${el.table_id}\`.\`${el.column_name}\`) as decimal(32,2) ) as \`${el.display_name}\``);
          } else {
            columns.push(`cast(${el.aggregation_type}(\`${el.table_id}\`.\`${el.column_name}\`) as decimal(32,2) ) as \`${el.display_name}\``);
          }
        } else {
          if (el.column_type === 'numeric') {
            columns.push(`cast(\`${el.table_id}\`.\`${el.column_name}\` as decimal(32,2)) as \`${el.display_name}\``);
          } else if (el.column_type === 'date') {
            if (el.format) {
              if (_.isEqual(el.format, 'year')) {
                columns.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y') as \`${el.display_name}\``);
              } else if (_.isEqual(el.format, 'month')) {
                columns.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y-%m') as \`${el.display_name}\``);
              } else if (_.isEqual(el.format, 'day')) {
                columns.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y-%m-%d') as \`${el.display_name}\``);
              } else {
                columns.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y-%m-%d') as \`${el.display_name}\``);
              }
            } else {
              columns.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y-%m-%d') as \`${el.display_name}\``);
            }
          } else {
            columns.push(`\`${el.table_id}\`.\`${el.column_name}\` as \`${el.display_name}\``);
          }

          // GROUP BY
          if (el.format) {
            if (_.isEqual(el.format, 'year')) {
              grouping.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y')`);
            } else if (_.isEqual(el.format, 'month')) {
              grouping.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y-%m')`);
            } else if (_.isEqual(el.format, 'day')) {
              grouping.push(`DATE_FORMAT(\`${el.table_id}\`.\`${el.column_name}\`, '%Y-%m-%d')`);
            } else {
              grouping.push(`\`${el.table_id}\`.\`${el.column_name}\``);
            }
          } else {
            grouping.push(`\`${el.table_id}\`.\`${el.column_name}\``);
          }
        }
      }
    });
    return [columns, grouping];

  }
  public filterToString(filterObject: any): any {
    let colType = this.findColumnType(filterObject.filter_table, filterObject.filter_column);
    switch (this.setFilterType(filterObject.filter_type)) {
      case 0:
        if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>' }
        if (filterObject.filter_type === 'like') {
          return `\`${filterObject.filter_table}\`.\`${filterObject.filter_column}\`  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
        }
        return `\`${filterObject.filter_table}\`.\`${filterObject.filter_column}\`  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
      case 1:
        if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in' }
        return `\`${filterObject.filter_table}\`.\`${filterObject.filter_column}\`  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
      case 2:
        return `\`${filterObject.filter_table}\`.\`${filterObject.filter_column}\`  ${filterObject.filter_type} 
                    ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilter(filterObject.filter_elements[1].value2, colType)}`;
      case 3:
        return `\`${filterObject.filter_table}\`.\`${filterObject.filter_column}\` is not null`;
    }
  }

  public processFilter(filter: any, columnType: string) {
    filter = filter.map(elem => {
      if (elem === null || elem === undefined) return 'ihatenulos';
      else return elem;
    });

    if (!Array.isArray(filter)) {
      switch (columnType) {
        case 'text': return `'${filter}'`;
        //case 'text': return `'${filter}'`;
        case 'numeric': return filter;
        case 'date': return `STR_TO_DATE('${filter}','%Y-%m-%d')`
      }
    } else {
      let str = '';
      filter.forEach(value => {
        const tail = columnType === 'date'
          ? `STR_TO_DATE('${value}','%Y-%m-%d')`
          : columnType === 'numeric' ? value : `'${value.replace(/'/g, "''")}'`;
        str = str + tail + ','
      });
      return str.substring(0, str.length - 1);
    }

  }
  buildPermissionJoin(origin: string, joinStrings: string[], permissions: any[]) {

    let joinString = `( SELECT ${origin}.* from ${origin} `;
    joinString += joinStrings.join(' ') + ' where ';
    permissions.forEach(permission => {
      joinString += ` ${this.filterToString(permission)} and `
    });
    return `${joinString.slice(0, joinString.lastIndexOf(' and '))} )`;
  }

  sqlQuery(query: string, filters: any[], filterMarks: string[]): string {

    //Get cols present in filters
    const colsInFilters = [];

    filters.forEach((filter, i) => {
      let col = filter.type === 'in' ?
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('in')).replace(/`/g, '') :
        filter.string.slice(filter.string.indexOf('.') + 1, filter.string.indexOf('between')).replace(/`/g, '');
      colsInFilters.push({ col: col, index: i });
    });

    filterMarks.forEach((mark, i) => {

      let subs = mark.split('').slice(filterMarks[0].indexOf('{') + 1, mark.indexOf('}') - mark.indexOf('$')).join('');
      let col = subs.slice(subs.indexOf('.') + 1);
      let arr = [];

      if (!colsInFilters.map(f => f.col.toUpperCase().trim()).includes(col.toUpperCase().trim())) {

        arr.push(`${subs} like '%'`);

      } else {
        const index = colsInFilters.filter(f => f.col.toUpperCase().trim() === col.toUpperCase().trim()).map(f => f.index)[0];
        arr = filters[index].string.split(' ');
        arr[0] = subs;
      }
      query = query.replace(mark, arr.join(' '));
    });

    return query;
  }
}