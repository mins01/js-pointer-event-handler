export default class PointerEventHandler{
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
    extractPointer({ pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y }) {
        return { pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y };
    }

    firstPointer = null
    prevPointer = null
    pointerdown = (event)=>{
        const pointer = this.extractPointer(event)
        if(this.pointers.size===0){
            this.downAt = Date.now();
            this.maxActivePointers=0;
            this.firstPointer = pointer;
            this.prevPointer = pointer;
        }
        if(!this.pointers.has(event.pointerId)){
            this.target.setPointerCapture(event.pointerId);
            this.pointers.set(event.pointerId, pointer);
            this.maxActivePointers = Math.max(this.maxActivePointers,this.pointers.size)
        }

        this.onpointerdown?.(event)
        this._pointerEvent(event,pointer) // 포인터 이벤트 처리
    }
    pointermove = (event)=>{
        if (!this.downAt || !this.pointers.has(event.pointerId)) return;
        const pointer = this.extractPointer(event)
        this.pointers.set(event.pointerId, pointer);
        this.onpointermove?.(event);
        this._pointerEvent(event,pointer) // 포인터 이벤트 처리
        if(event.isPrimary){
            this.prevPointer = pointer;
        }
    }
    _pointerend = (event)=>{
        const pointer = this.extractPointer(event)
        if(this.pointers.has(event.pointerId)){
            this?.[`on${event.type}`]?.(event);
            this._pointerEvent(event,pointer) // 포인터 이벤트 처리

            this.pointers.delete(event.pointerId)
        }
        this.target.releasePointerCapture(event.pointerId);
        if(this.pointers.size===0){
            this.downAt = null;
            this.maxActivePointers=0;
            this.firstPointer = null;
            this.prevPointer = null;
        }
    }

    // primary 포인터에 대한 계산처리
    getPointerMetrics(pointer1, pointer2 ) {
        // ----------------------
        // 이동량
        // ----------------------
        const distanceX = pointer2.clientX - pointer1.clientX;
        const distanceY = pointer2.clientY - pointer1.clientY;
        const distance = Math.hypot(distanceX, distanceY);

        // ----------------------
        // 시간 간격
        // ----------------------
        const time = (pointer2.timeStamp - pointer1.timeStamp) / 1000 ;

        // ----------------------
        // 순간 속도 (프레임 기준)
        // ----------------------
        const velocityX = time?(distanceX / time):0;
        const velocityY = time?(distanceY / time):0;
        const velocity = time?(distance / time):0;

        // ----------------------
        // 이동 방향 (각도, 0~360도)
        // ----------------------
        const angle = Math.atan2(distanceY, distanceX) * 180 / Math.PI;

        // ----------------------
        // 속도 벡터
        // ----------------------
        const velocityVector = {
            x: velocityX,
            y: velocityY,
            magnitude: velocity,
            angle: angle
        };

        // ----------------------
        // 반환
        // ----------------------
        return {
            distanceX,
            distanceY,
            distance,
            time,
            velocityX,
            velocityY,
            velocity,
            angle,
            velocityVector,
        };
    }
    _pointerEvent(event,pointer){
        const firstPointer = this.firstPointer;
        const prevPointer = this.prevPointer;
        const metrics = this.getPointerMetrics(prevPointer, pointer );
        const totalMetrics = this.getPointerMetrics(firstPointer, pointer );
        const detail = this.getCustomPointerEventDetail({originalEvent:event,pointer,metrics,totalMetrics})
        this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));

        // 멀티 포인터 동작
        if(this.pointers.size>1){ this._multiPointerEvent(event) }
    }

    // 프로퍼티 이벤트 콜백
    onpointerdown(event){  };
    // 프로퍼티 이벤트 콜백
    onpointermove(event){  };
    // 프로퍼티 이벤트 콜백
    onpointerup(event){  };
    // 프로퍼티 이벤트 콜백
    onpointerleave(event){  };
    // 프로퍼티 이벤트 콜백
    onpointercancel(event){  };



    // 멀티 포인터 처리부


    getMultiPointer(pointer1,pointer2){
        const distanceX = pointer2.clientX - pointer1.clientX;
        const distanceY = pointer2.clientY - pointer1.clientY;
        const distance = Math.hypot(distanceX, distanceY);
        const centerX = (pointer1.clientX + pointer2.clientX) / 2;
        const centerY = (pointer1.clientY + pointer2.clientY) / 2;
        const angle = Math.atan2(distanceY, distanceX); // rad
        const timeStamp = pointer2.timeStamp;
        return {
            centerX,
            centerY,
            distanceX,
            distanceY,
            distance,
            angle,
            timeStamp
        }
    }

    getMultiPointerMetrics(multiPointer1, multiPointer2) {
        // ----------------------
        // 이동량
        // ----------------------
        const distanceX = multiPointer2.centerX - multiPointer1.centerX;
        const distanceY = multiPointer2.centerY - multiPointer1.centerY;
        const distance = Math.hypot(distanceX, distanceY);

        // ----------------------
        // 시간 간격
        // ----------------------
        const time = (multiPointer2.timeStamp - multiPointer1.timeStamp) / 1000 ;

        // ----------------------
        // 순간 속도 (프레임 기준)
        // ----------------------
        const velocityX = time?(distanceX / time):0;
        const velocityY = time?(distanceY / time):0;
        const velocity = time?(distance / time):0;

        // ----------------------
        // 이동 방향 (각도, 0~360도)
        // ----------------------
        const angle = Math.atan2(distanceY, distanceX) * 180 / Math.PI;

        // ----------------------
        // 속도 벡터
        // ----------------------
        const velocityVector = {
            x: velocityX,
            y: velocityY,
            magnitude: velocity,
            angle: angle
        };

        // ----------------------
        // 반환
        // ----------------------
        return {
            distanceX,
            distanceY,
            distance,
            time,
            velocityX,
            velocityY,
            velocity,
            angle,
            velocityVector,
        };
    }

    prevMultiPointer = null;
    firstMultiPointer = null;

    _multiPointerEvent(event){
        // const pointer = this.pointers.get(event.pointerId)??this.extractPointer(event);
        //-- 멀티포인터 데이터 계산
        const pointersValues = Array.from(this.pointers.values());
        const pointer1 = pointersValues[0];
        const pointer2 = pointersValues[1];
        const multiPointer = this.getMultiPointer(pointer1,pointer2); //2개의 포인터만 체크해서 계산한다.

        if(this.pointers.size==2 && this.maxActivePointers==2){
            if(event.type =='pointerdown'){
                this.prevMultiPointer = multiPointer;
                this.firstMultiPointer = multiPointer;
            }
        }
        const metrics = this.getMultiPointerMetrics(this.prevMultiPointer,multiPointer);
        const totalMetrics = this.getMultiPointerMetrics(this.firstMultiPointer,multiPointer,);
        const detail = this.getCustomPointerEventDetail({multiPointer,metrics,totalMetrics})
        this.target.dispatchEvent(this.getCustomPointerEvent(`multi${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));

        if(this.pointers.size==2 && this.maxActivePointers==2){
            this._pinchEvent(event,multiPointer);
            this._rotateEvent(event,multiPointer);
        }

        this.prevMultiPointer = multiPointer;
    }



    getPinchMetrics(multiPointer1, multiPointer2) {
        const scale = multiPointer2.distance  / multiPointer1.distance
        return {
            scale ,
        };
    }
    _pinchEvent(event,multiPointer){
        const metrics = this.getPinchMetrics(this.prevMultiPointer,multiPointer)
        const totalMetrics = this.getPinchMetrics(this.firstMultiPointer,multiPointer)
        const detail = this.getCustomPointerEventDetail({multiPointer,metrics,totalMetrics})
        this.target.dispatchEvent(this.getCustomPointerEvent(`pinch.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
    }


    getRotateMetrics(multiPointer1, multiPointer2) {
        const angleDelta = multiPointer2.angle - multiPointer1.angle
        return {
            angleDelta ,  //rad
        };
    }

    _rotateEvent(evnet,multiPointer){
        const metrics = this.getRotateMetrics(this.prevMultiPointer,multiPointer)
        const totalMetrics = this.getRotateMetrics(this.firstMultiPointer,multiPointer)
        const detail = this.getCustomPointerEventDetail({multiPointer,metrics,totalMetrics})
        this.target.dispatchEvent(this.getCustomPointerEvent(`rotate.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail }));
    }




}

