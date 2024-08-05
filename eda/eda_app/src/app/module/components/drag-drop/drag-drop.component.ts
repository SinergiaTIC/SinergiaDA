import { Component, Input, Output, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';
import { CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';


@Component({
  selector: 'drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.css']
})
export class DragDropComponent implements OnChanges {

  @Input() attributes?:any[];
  @Output() newCurrentQuery: EventEmitter<any[]> = new EventEmitter();


  temporalAttributes = [];
  newSortedAttributes = [];
  itemX = [];
  itemY = [];
  itemZ = [];
  validated: boolean = false;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    this.initialization();
  }
  
  initialization() {
    this.temporalAttributes = this.attributes;

    console.log('attributes ==> ', this.attributes);

    this.itemX = [this.attributes.find(e => e.column_type==='text')];
    this.itemY = this.attributes.filter( e => (e.description.default !== this.itemX[0].description.default) && e.column_type !== "numeric");
    this.itemZ = this.attributes.filter( e => e.column_type === "numeric");
    
    this.validated = true;
  }

  public ordering() {
    this.validated = (this.itemX.length>=1 && this.itemY.length>=1 && this.itemZ.length>=1) ? true : false;  

    if(this.validated) {
      this.newSortedAttributes = [{itemX: this.itemX, itemY: this.itemY, itemZ: this.itemZ}]
    }
  }

  temporalExecution(){
    this.attributes = [];
    this.itemX.forEach(e => this.attributes.push(e));
    this.itemY.forEach(e => this.attributes.push(e));
    this.itemZ.forEach(e => this.attributes.push(e));

    // Agregamos el ordenamiento
    this.attributes.forEach(e =>  {
      e.ordering = this.newSortedAttributes
    })

    this.newCurrentQuery.emit(this.attributes);
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
    if(data.filter((e:any) => e.description.default==value)[0].column_type!=='numeric') return false;
    return true;
  }


}
