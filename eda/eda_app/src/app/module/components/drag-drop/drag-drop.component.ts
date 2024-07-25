import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';
import { CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';


@Component({
  selector: 'drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.css']
})
export class DragDropComponent implements OnInit, OnChanges {

  @Input() attributes?:any[];
  @Output() sortedAttributes: EventEmitter<any[]> = new EventEmitter();

  temporalAttributes = [];
  itemX = [];
  itemY = [];
  itemZ = [];
  validated: boolean = false;

  constructor() { }

  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.afterExecutionEBP();
  }
  
  initialization() {

  }

  ordering() {
    console.log('----------------------------------------------------------------------');
    console.log('Verifica si todos estan llenos con almenos 1 y el principal vacio');
    console.log('temporalAttributes',this.temporalAttributes, this.temporalAttributes.length);
    console.log('itemX',this.itemX, this.itemX.length);
    console.log('itemY',this.itemY, this.itemY.length);
    console.log('itemZ',this.itemZ, this.itemZ.length);

    if(this.temporalAttributes.length==0 && this.itemX.length>=1 && this.itemY.length>=1 && this.itemZ.length>=1) this.validated = true;
    else this.validated = false;
  }
  
  afterExecutionEBP() {
    this.temporalAttributes = this.attributes;
    this.itemX = [];
    this.itemY = [];
    this.itemZ = [];
  }

  temporalExecution(){
    console.log('heyyyyy');
  }

  // Pasar items de un contenido a otro
  drop(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
      this.ordering();
    }
  }

  isNumeric(item: CdkDrag<any>) {
    const data = item.dropContainer.data;
    const value = item.element.nativeElement.innerText.toString();
    if(data.filter(e => e.display_name==value)[0].column_type!=='numeric') return false;
    return true;
  }


}
