import { Component, Input } from '@angular/core';
import { CdkDrag, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';


@Component({
  selector: 'drag-drop',
  templateUrl: './drag-drop.component.html',
  styleUrls: ['./drag-drop.component.css']
})
export class DragDropComponent {

  @Input() attributes?:any[];

  itemX = [];
  itemY = []
  itemZ = [];

  constructor() { }

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
    if(data.filter(e => e.display_name==value)[0].column_type==='numeric') return false;
    return true;
  }


}
