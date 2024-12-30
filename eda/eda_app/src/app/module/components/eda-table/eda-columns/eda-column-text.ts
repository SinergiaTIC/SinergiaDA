import { EdaColumn } from './eda-column';

export class EdaColumnText extends EdaColumn {

    rangeOption: boolean;

    constructor(init: Partial<EdaColumnText>) {
        super();
        Object.assign(this, init);
        this.type = 'EdaColumnText';
    }
}
