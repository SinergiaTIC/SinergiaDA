import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';


@Component({
  selector: 'drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.css']
})
export class DragDropComponent implements OnInit, OnChanges {

  @Input() attributes?:any[];

  itemGroup = [];
  itemX = [];
  itemY = [];
  itemZ = [];

  constructor() { }

  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.afterExecutionEBP();
  }
  
  initialization() {

  }
  
  afterExecutionEBP() {
    this.itemGroup = this.attributes;
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
    }
  }

  isNumeric(item: CdkDrag<any>) {
    const data = item.dropContainer.data;
    const value = item.element.nativeElement.innerText.toString();
    if(data.filter(e => e.display_name==value)[0].column_type!=='numeric') return false;
    return true;
  }


}
