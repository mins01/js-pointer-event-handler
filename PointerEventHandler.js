class PointerEventHandler{
    pointers = null
    maxPointers = 0;
    target = null; 
    downAt = null //down 이벤트 발생시간

    inputMode = 'all'; //all, pen, mouse, touch

    constructor(target){
        // this.editor = editor
        this.pointers = new Map(); // 멀티터치 제어용
        this.maxPointers = 0;
        this.downAt = null;
        if(target){
            this.addEventListener(target);
        }
    }
    addEventListener(target){
        this.target = target
        target.addEventListener('pointerdown',this.pointerdown);
        target.addEventListener('pointermove',this.pointermove,{passive: false})
        target.addEventListener('pointerup',this.pointerup)
        target.addEventListener('pointerleave',this.pointerleave); // 거의 발생하지 않을꺼다
        target.addEventListener('pointercancel',this.pointercancel) // 시스템 메세지 등이 뜨면 발생.
    }
    removeEventListener(){
        if(this.target) {
            this.target.removeEventListener('pointerdown',this.pointerdown);
            this.target.removeEventListener('pointermove',this.pointermove,{ passive: false })
            this.target.removeEventListener('pointerup',this.pointerup)
            this.target.removeEventListener('pointerleave',this.pointerleave)
            this.target.removeEventListener('pointercancel',this.pointercancel)
        }
    }
    
    extractPointerData(event){
        return { 
            x:event.clientX,
            y:event.clientY,
            pointerId:event.pointerId,
            pointerType:event.pointerType,
            isPrimary:event.isPrimary,
            clientX:event.clientX,
            clientY:event.clientY,
            pageX:event.pageX,
            pageY:event.pageY,
            screenX:event.screenX,
            screenY:event.screenY,
            pressure:event.pressure,
            tiltX:event.tiltX,
            tiltY:event.tiltY,
            buttons:event.buttons,
            width:event.width,
            height:event.height,
            twist:event.twist,
            timeStamp:event.timeStamp,
            tangentialPressure:event.tangentialPressure,
        }
    }
    pointerdown = (event)=>{
        if(this.pointers.size===0){ this.downAt = Date.now(); this.maxPointers=0; }
        if(!this.pointers.has(event.pointerId)){
            this.target.setPointerCapture(event.pointerId);
            this.pointers.set(event.pointerId, this.extractPointerData(event));
            this.maxPointers = Math.max(this.maxPointers,this.pointers.size)       
        }
        
        if(this.onpointerdown){this.onpointerdown(event)}
    }
    pointermove = (event)=>{
        if(this.downAt){
            if(this.pointers.has(event.pointerId)) this.pointers.set(event.pointerId, this.extractPointerData(event));
            if(this.onpointermove){this.onpointermove(event)}
        }
    }
    pointerup = (event)=>{
        if(this.downAt){
            this.pointers.delete(event.pointerId);
            if(this.onpointerup){this.onpointerup(event)}
            if(this.pointers.size===0){this.downAt = null; this.maxPointers=0;}
        }
        this.target.releasePointerCapture(event.pointerId);
    }
    pointerleave = (event)=>{
        if(this.downAt){
            this.pointers.delete(event.pointerId);
            if(this.onpointerleave){this.onpointerleave(event)}
            if(this.pointers.size===0){this.downAt = null; this.maxPointers=0;}
        }
        this.target.releasePointerCapture(event.pointerId);
    }
    pointercancel = (event)=>{
        if(this.downAt){
            this.pointers.delete(event.pointerId);
            if(this.onpointercancel){this.onpointercancel(event)}
            if(this.pointers.size===0){this.downAt = null; this.maxPointers=0;}
        }
        this.target.releasePointerCapture(event.pointerId);
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

