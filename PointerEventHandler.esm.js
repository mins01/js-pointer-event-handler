export default class PointerEventHandler{
    static VERSION = '2026.01.12 14'; // 버전 날짜.

    pointers = null
    maxActivePointers = 0;
    target = null;
    downAt = null //down 이벤트 발생시간
    static interactionThreshold = {
        mouse: 4,
        pen: 5,
        touch: 8,
    }; // 요소 클릭 후 드래그 캡처 시작 임계값(px)
    // interactionThreshold = null; //요소 클릭 후 드래그 캡처 시작 임계값(px)

    constructor(target){
        this.interactionThreshold = { ... this.constructor.interactionThreshold }
        
        this.pointers = new Map(); // 멀티터치 제어용
        this.maxActivePointers = 0;
        this.downAt = null;
        if(target){
            this.addEventListener(target);
        }
    }
    addEventListenerOptions = { passive: false }
    addEventListener(target){
        this.target = target
        // const options = { passive: false };
        this.target.addEventListener('pointerdown',this.pointerdown);
        this.target.addEventListener('pointermove',this.pointermove,this.addEventListenerOptions)
        
        this.target.addEventListener('pointerup',this._pointerend)
        // this.target.addEventListener('pointerleave',this._pointerend); // 거의 발생하지 않을꺼다. 발생시 문제가 될 수 있어서 체크 안한다.
        this.target.addEventListener('pointercancel',this._pointerend) // 시스템 메세지 등이 뜨면 발생.
        
        this.target.addEventListener('gotpointercapture',this.gotpointercapture) // 포인터 캡처
        this.target.addEventListener('lostpointercapture',this.lostpointercapture) // 포인터 캡처
    }
    removeEventListener(){
        if(!this.target) {return; }
        // const options = { passive: false };
        this.target.removeEventListener('pointerdown',this.pointerdown);
        this.target.removeEventListener('pointermove',this.pointermove,this.addEventListenerOptions)

        this.target.removeEventListener('pointerup',this._pointerend)
        // this.target.removeEventListener('pointerleave',this._pointerend)
        this.target.removeEventListener('pointercancel',this._pointerend)
        
        this.target.removeEventListener('gotpointercapture',this.gotpointercapture) // 포인터 캡처
        this.target.removeEventListener('lostpointercapture',this.lostpointercapture) // 포인터 캡처
    }
    getCustomPointerEventDetail(data){
        return {pointerEventHandler:this, ...data};
    }
    getCustomPointerEvent(type,{ bubbles = false, cancelable = false, composed = false, detail = null } = {}){
        return new CustomEvent(type, { bubbles,cancelable,composed,detail });
    }
    extractPointer({ pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp, tangentialPressure,x,y }) {
        // timeStamp 값 신뢰하지 마라. 브라우저마다 기준값이 다를 수 있다!!!! time: performance.now() 를 대신 사용함.
        return { pointerId, pointerType, isPrimary, clientX, clientY, pageX, pageY, screenX, screenY, pressure, tiltX, tiltY, buttons, width, height, twist, timeStamp,time: performance.now(), tangentialPressure,x,y };
    }

    get isPointerCaptured(){
        return !!( this.firstPointer && this.target.hasPointerCapture(this.firstPointer.pointerId) );
    }
    gotpointercapture = (event)=>{
        const detail = this.getCustomPointerEventDetail({originalEvent:event})
        this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));
    }
    lostpointercapture = (event)=>{
        // this._pointerend(event)
        // 이벤트 흐름 안 끝냄. 모바일에서 자주 발생된다.
        const detail = this.getCustomPointerEventDetail({originalEvent:event})
        this.target.dispatchEvent(this.getCustomPointerEvent(`${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));
    }

    firstPointer = null
    prevPointer = null
    pointerdown = (event)=>{
        // console.log(event.target,event.currentTarget);
        
        const pointer = this.extractPointer(event)
        if(this.pointers.size===0){
            this.downAt = Date.now();
            this.maxActivePointers=0;
            this.firstPointer = pointer;
            this.prevPointer = pointer;
        }
        if(!this.pointers.has(event.pointerId)){
            if(event.target === this.target){ this.target.setPointerCapture(event.pointerId); } // 이벤트 발생 요소가 이벤트 처리 요소가 같은 경우만 pointerdown 에서 캡처한다.
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
        const detail  = this._pointerEvent(event,pointer) // 포인터 이벤트 처리

        // 캡처를 안했고 드래그 이동이 4~8px 이 있을 경우만 캡처한다.
        if(!this.target.hasPointerCapture(event.pointerId) && Math.abs(detail.totalMetrics.distance) >= (this.interactionThreshold[event.pointerType]??8)){
            this.target.setPointerCapture(event.pointerId); 
        }

        if(event.isPrimary){
            this.prevPointer = pointer;
        }
    }
    _pointerend = (event)=>{
        if(this.pointers.has(event.pointerId)){
            const pointer = this.extractPointer(event)
            this?.[`on${event.type}`]?.(event);
            this._pointerEvent(event,pointer) // 포인터 이벤트 처리
            this._pointerEvent(event,pointer,'pointerend') // 포인터 end 이벤트 처리
            if(this.target.hasPointerCapture(event.pointerId)) this.target.releasePointerCapture(event.pointerId);
            this.pointers.delete(event.pointerId)
        }
        
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
        // const time = (pointer2.timeStamp - pointer1.timeStamp) / 1000 ;
        const time = (pointer2.time - pointer1.time) ;

        // ----------------------
        // 순간 속도 (프레임 기준)
        // ----------------------
        const velocityX = time?(distanceX / time):0;
        const velocityY = time?(distanceY / time):0;
        const velocity = time?(distance / time):0;

        // ----------------------
        // 이동 방향 (각도, 0~360도)
        // ----------------------
        const angle = Math.atan2(distanceY, distanceX) * 180 / Math.PI; // degree

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
    _pointerEvent(event,pointer,eventType=event.type){
        const firstPointer = this.firstPointer;
        const prevPointer = this.prevPointer;
        const metrics = this.getPointerMetrics(prevPointer, pointer );
        const totalMetrics = this.getPointerMetrics(firstPointer, pointer );
        const detail = this.getCustomPointerEventDetail({originalEvent:event,pointer,prevPointer,metrics,totalMetrics})
        this.target.dispatchEvent(this.getCustomPointerEvent(`${eventType}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));

        // 멀티 포인터 동작
        if(this.pointers.size>1){ this._multiPointerEvent(event) }

        return detail;
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
        const angle = Math.atan2(distanceY, distanceX) * 180 / Math.PI; //degree
        const timeStamp = pointer2.timeStamp;
        const time = pointer2.time;
        return {
            pointer1,
            pointer2,
            centerX,
            centerY,
            distanceX,
            distanceY,
            distance,
            angle,
            timeStamp,
            time,
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
        // const time = (multiPointer2.timeStamp - multiPointer1.timeStamp) / 1000 ;
        const time = (multiPointer2.time - multiPointer1.time) ;

        // ----------------------
        // 순간 속도 (프레임 기준)
        // ----------------------
        const velocityX = time?(distanceX / time):0;
        const velocityY = time?(distanceY / time):0;
        const velocity = time?(distance / time):0;

        // ----------------------
        // 이동 방향 (각도, 0~360도)
        // ----------------------
        const angle = Math.atan2(distanceY, distanceX) * 180 / Math.PI; //degree

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
        const prevMultiPointer = this.prevMultiPointer
        const firstMultiPointer = this.firstMultiPointer
        const metrics = this.getMultiPointerMetrics(prevMultiPointer,multiPointer);
        const totalMetrics = this.getMultiPointerMetrics(firstMultiPointer,multiPointer,);
        const detail = this.getCustomPointerEventDetail({originalEvent:event,pointer1,pointer2,multiPointer,prevMultiPointer,firstMultiPointer,metrics,totalMetrics})
        this.target.dispatchEvent(this.getCustomPointerEvent(`multi${event.type}.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));

        
        let r = detail
        if(this.pointers.size==2 && this.maxActivePointers==2){
            const detail = this._gestureEvent(event,multiPointer);
            r = detail;
        }
        
        this.prevMultiPointer = multiPointer;

        return r;

        
    }



    // 제스쳐 이벤트. pinch와 rotate도 연관되어 발생
    getGestureMetrics(multiPointer1, multiPointer2) {
        const scale = multiPointer2.distance  / multiPointer1.distance
        const rotation = multiPointer2.angle - multiPointer1.angle
        return {
            multiPointer1, 
            multiPointer2,
            scale ,
            rotation ,
        };
    }
    _gestureEvent(event,multiPointer){
        const prevMultiPointer = this.prevMultiPointer
        const firstMultiPointer = this.firstMultiPointer
        const metrics = this.getGestureMetrics(prevMultiPointer,multiPointer)
        const totalMetrics = this.getGestureMetrics(firstMultiPointer,multiPointer)
        const detail = this.getCustomPointerEventDetail({originalEvent:event,multiPointer,prevMultiPointer,firstMultiPointer,metrics,totalMetrics})
        // this.target.dispatchEvent(this.getCustomPointerEvent(`pinch.peh`,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));

        const detalEvent = {
            "pointerdown":"gesturestart.peh",
            "pointermove":"gesturechange.peh",
            "pointerup":"gestureend.peh",
            // "pointerleave":"gestureleave.peh",
            "pointercancel":"gesturecancel.peh",
        }?.[event.type];
        if(detalEvent){
            this.target.dispatchEvent(this.getCustomPointerEvent(detalEvent,{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));
        }
        if(detalEvent == "gesturechange.peh"){ // 이벤트 변화에 따라서
            console.log('xxxxxxxxxxxxxxxxx',metrics);
            
            if(metrics.scale !== 1){ // scale이 변경될 경우 pinch 이벤트 발생
                this.target.dispatchEvent(this.getCustomPointerEvent('pinch.peh',{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));
            }
            if(metrics.rotation !== 0){ // rotation에 변화가 있으면  rotate 이벤트 발생
                this.target.dispatchEvent(this.getCustomPointerEvent('rotate.peh',{bubbles:event.bubbles,cancelable:event.cancelable,composed:event.composed,detail}));
            }
        }
        return detail;

    }

}

