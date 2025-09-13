class PointerEventHandler{
    pointers = null
    maxActivePointers = 0;
    target = null;
    downAt = null //down 이벤트 발생시간

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
    getCustomPointerEventDetail(data){
        return {pointerEventHandler:this, ...data};
    }
    getCustomPointerEvent(type,{ bubbles = false, cancelable = false, composed = false, detail = null } = {}){
        return new CustomEvent(type, { bubbles,cancelable,composed,detail });
    }
    extractPointerData({ pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y }) {
        return { pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y };
    }
    pointerdown = (event)=>{
        if(this.pointers.size===0){ this.downAt = Date.now(); this.maxActivePointers=0; }
        const pointerData = this.extractPointerData(event)
        if(!this.pointers.has(event.pointerId)){
            this.target.setPointerCapture(event.pointerId);
            this.pointers.set(event.pointerId, pointerData);
            this.maxActivePointers = Math.max(this.maxActivePointers,this.pointers.size)
        }

        this.onpointerdown?.(event)
        // 커스텀 이벤트 발생
        const detail = this.getCustomPointerEventDetail({pointerData})
        this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
        // 멀티 포인터 동작
        console.log(this.pointers.size);
        
        if(this.pointers.size>1){ this.multipointerdown(event); }
    }
    pointermove = (event)=>{
        if (!this.downAt || !this.pointers.has(event.pointerId)) return;
        const pointerData = this.extractPointerData(event)
        this.pointers.set(event.pointerId, pointerData);
        this.onpointermove?.(event);
        // 커스텀 이벤트 발생
        const detail = this.getCustomPointerEventDetail({pointerData})
        this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
        if(this.pointers.size>1){ this.multipointermove(event); } // 멀티 포인터 동작
    }
    _pointerend = (event)=>{
        const pointerData = this.extractPointerData(event)
        if(this.pointers.has(event.pointerId)){
            if (event.type === 'pointerup'){
                this.onpointerup?.(event);
                // 커스텀 이벤트 발생
                const detail = this.getCustomPointerEventDetail({pointerData})
                this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
                if(this.pointers.size>1){ this.multipointerup(event); } // 멀티 포인터 동작
            }
            else if (event.type === 'pointerleave'){
                this.onpointerleave?.(event);
                // 커스텀 이벤트 발생
                const detail = this.getCustomPointerEventDetail({pointerData})
                this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
                if(this.pointers.size>1){ this.multipointerleave(event); } // 멀티 포인터 동작
            }
            else if (event.type === 'pointercancel'){
                this.onpointercancel?.(event);
                // 커스텀 이벤트 발생
                const detail = this.getCustomPointerEventDetail({pointerData})
                this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
                if(this.pointers.size>1){ this.multipointercancel(event); } // 멀티 포인터 동작
            }
            this.pointers.delete(event.pointerId)
        }
        this.target.releasePointerCapture(event.pointerId);
        if(this.pointers.size===0){this.downAt = null; this.maxActivePointers=0;}
    }


    onpointerdown(event){
        console.debug('onpointerdown');
    };
    onpointermove(event){
        console.debug('onpointermove');
    };
    onpointerup(event){
        console.debug('onpointerup');
    };
    onpointerleave(event){
        console.debug('onpointerleave');
    };
    onpointercancel(event){
        console.debug('onpointercancel');
    };


    // TODO;
    // 멀티 포인터 처리부
    multipointerdown(event){
        return this._multipointerEvent(event);
    };
    multipointermove(event){
        return this._multipointerEvent(event);
    };
    multipointerup(event){
        return this._multipointerEvent(event);
    };
    multipointerleave(event){
        return this._multipointerEvent(event);
    };
    multipointercancel(event){
        return this._multipointerEvent(event);
    };
    _multipointerEvent(event){
        const pointerData = this.pointers.get(event.pointerId)??this.extractPointerData(event);
        
        //-- 멀티포인터 데이터 계산
        const pointersValues = Array.from(this.pointers.values());
        const multiPointerData = {
            centerX:pointersValues.reduce((sum, p) => sum + p.clientX, 0) / pointersValues.length,
            centerY:pointersValues.reduce((sum, p) => sum + p.clientY, 0) / pointersValues.length,
        }
        
        const detail = this.getCustomPointerEventDetail({pointerData,multiPointerData})
        this.target.dispatchEvent(this.getCustomPointerEvent(`multi${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
        if(this.pointers.size==2 && this.maxActivePointers==2){
            this.target.dispatchEvent(this.getCustomPointerEvent(`two${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));    
        }
    }
}

