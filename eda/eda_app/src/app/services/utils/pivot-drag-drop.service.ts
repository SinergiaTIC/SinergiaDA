import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PivotDragDropService {

  newOrderingBehaviorSubject = new BehaviorSubject([]);
  newOrdering = this.newOrderingBehaviorSubject.asObservable()

  constructor() { }

  updatingNewOrdering(ordering: any) {
    this.newOrderingBehaviorSubject.next(ordering);
  }

}
