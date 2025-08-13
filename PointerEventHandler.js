class PointerEventHandler{
    pointers = null
    maxActivePointers = 0;
    target = null; 
    downAt = null //down 이벤트 발생시간

    inputMode = 'all'; //all, pen, mouse, touch

    constructor(target){
        // this.editor = editor
        this.pointers = new Map(); // 멀티터치 제어용
        this.maxActivePointers = 0;
        this.downAt = null;
        if(target){
            this.addEventListener(target);
        }
    }
    addEventListener(target){
        this.target = target
        const options = { passive: false };
        target.addEventListener('pointerdown',this.pointerdown);
        target.addEventListener('pointermove',this.pointermove,options)
        target.addEventListener('pointerup',this._pointerend)
        target.addEventListener('pointerleave',this._pointerend); // 거의 발생하지 않을꺼다
        target.addEventListener('pointercancel',this._pointerend) // 시스템 메세지 등이 뜨면 발생.
    }
    removeEventListener(){
        if(!this.target) {return; }
        const options = { passive: false };
        this.target.removeEventListener('pointerdown',this.pointerdown);
        this.target.removeEventListener('pointermove',this.pointermove,options)
        this.target.removeEventListener('pointerup',this._pointerend)
        this.target.removeEventListener('pointerleave',this._pointerend)
        this.target.removeEventListener('pointercancel',this._pointerend)
    }
    
     extractPointerData({ pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y }) {
        return { pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y };
    }
    pointerdown = (event)=>{
        if(this.pointers.size===0){ this.downAt = Date.now(); this.maxActivePointers=0; }
        if(!this.pointers.has(event.pointerId)){
            this.target.setPointerCapture(event.pointerId);
            this.pointers.set(event.pointerId, this.extractPointerData(event));
            this.maxActivePointers = Math.max(this.maxActivePointers,this.pointers.size)       
        }
        
        this.onpointerdown?.(event)
    }
    pointermove = (event)=>{
        if (!this.downAt || !this.pointers.has(event.pointerId)) return;
        this.pointers.set(event.pointerId, this.extractPointerData(event));
        this.onpointermove?.(event);
    }
    _pointerend = (event)=>{
        if (this.pointers.delete(event.pointerId)) {
            if (event.type === 'pointerup') this.onpointerup?.(event);
            else if (event.type === 'pointerleave') this.onpointerleave?.(event);
            else if (event.type === 'pointercancel') this.onpointercancel?.(event);
        }
        this.target.releasePointerCapture(event.pointerId);
        if(this.pointers.size===0){this.downAt = null; this.maxActivePointers=0;}
    }
    

    onpointerdown(event){
        console.log('onpointerdown');
    };
    onpointermove(event){
        console.log('onpointermove');
    };
    onpointerup(event){
        console.log('onpointerup');
    };
    onpointerleave(event){
        console.log('onpointerleave');
    };
    onpointercancel(event){
        console.log('onpointercancel');
    };
}

