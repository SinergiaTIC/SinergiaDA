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
  newSortedAttributes = [];
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
    this.validated = (this.temporalAttributes.length==0 && this.itemX.length>=1 && this.itemY.length>=1 && this.itemZ.length>=1) ? true : false;  

    if(this.validated) {
      this.newSortedAttributes = [{itemX: this.itemX, itemY: this.itemY, itemZ: this.itemZ}]
    }
  }
  
  afterExecutionEBP() {
    this.temporalAttributes = this.attributes;
    this.itemX = [];
    this.itemY = [];
    this.itemZ = [];
  }

  temporalExecution(){
    console.log('Emitiendo la nueva forma de consulta -->  ');
    this.sortedAttributes.emit(this.newSortedAttributes);
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
