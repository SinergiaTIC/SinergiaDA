import { Component, EventEmitter, OnInit, Output, Input  } from '@angular/core';
import { EdaFilterAndOrComponent } from '../../../eda-filter-and-or/eda-filter-and-or.component';


@Component({
  selector: 'filter-and-or-dialog',
  templateUrl: './filter-and-or-dialog.component.html',
  styleUrls: ['./filter-and-or-dialog.component.css']
})
export class FilterAndOrDialogComponent implements OnInit {

  @Input() selectedFilters: any[] = [];
  @Input() globalFilters: any[] = [];
  @Input() tables: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;
  public dashboardRecibido = [];

  constructor() { }

  ngOnInit(): void {
  }

    // Recibe el dashboard del componente <eda-filter-and-or>
    public handleDashboardChanged(event: any) {
      this.dashboardRecibido = event
    }
  
    public onApplyFilterAndOrDialog() {
      console.log('Se confirman los cambios : ', this.dashboardRecibido);
      if (this.dashboardRecibido?.length) {
        EdaFilterAndOrComponent.guardarDashboard(this.dashboardRecibido);
        
      }
      this.close.emit();
    }
  
    public oncloseFilterAndOrDialog() {
      console.log('Se ha cancelado los cambios ')
      this.close.emit();
    }

}
