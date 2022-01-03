/*
* PointerListener class
*	- implements the possibility to listen to gesture events performed on a specific DOM Element
*	  expample: element.addEventListener("pan", function(event){});
*	- creates and destroys Contact instances
*	- updates the Contact instances
*	- uses the Contact instances to determine which gesture(s) are performed by passing Contact instances to GestureRegonizers
*
*	- var listener = new PointerListener(domElement, {});
*	- domElement.addEventListener("pan", function(){});
*/

var ALL_GESTURE_CLASSES = [Tap, Pan, Pinch, Rotate, TwoFingerPan];

class PointerListener {

	constructor (domElement, options){
	
		this.DEBUG = false;
	
		var self = this;
		
		var options = options || {};
		
		var supportedGestures = ALL_GESTURE_CLASSES;
		
		this.options = {
			supportedGestures : []
		};
		
		if (options.hasOwnProperty("supportedGestures")){
			supportedGestures = options.supportedGestures;
		}
		
			
		for (let i=0; i<supportedGestures.length; i++){
			let GestureClass = supportedGestures[i];
			let gesture = new GestureClass(domElement);
			this.options.supportedGestures.push(gesture);
		}
		
		
		this.domElement = domElement;
		
		// the Contact instance - only active during an active pointerdown
		this.contact = null;
		
		// disable context menu on long taps - this kills pointermove
		/*domElement.addEventListener("contextmenu", function(event) {
			event.preventDefault();
			return false;
		});*/
		
		// javascript fires the events "pointerdown", "pointermove", "pointerup" and "pointercancel"
		// on each of these events, the contact instance is updated and GestureRecognizers of this.supported_events are run		
		domElement.addEventListener("pointerdown", function(event){
		
			// re-target all pointerevents to the current element
			// see https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
			domElement.setPointerCapture(event.pointerId);
			
			if (self.contact == null || self.contact.isActive == false) {
				self.contact = new Contact(event);
			}
			else {
				// use existing contact instance if a second pointer becomes present
				self.contact.addPointer(event);
			}
					
			if (self.options.hasOwnProperty("pointerdown")){
				self.options.pointerdown(event, self);
			}
			
		}, { "passive": true });
		
		domElement.addEventListener("pointermove", function(event){
		
			// pointermove is also firing if the mouse button is not pressed
		
			if (self.contact != null && self.contact.isActive == true){
		
				// this would disable vertical scrolling - which should only be disabled if a panup/down or swipeup/down listener has been triggered
				// event.preventDefault();
			
				self.contact.onPointerMove(event);
				self.recognizeGestures();
				
				if (self.options.hasOwnProperty("pointermove")){
					self.options.pointermove(event, self);
				}
			}
			
		}, { "passive": true });
		
		domElement.addEventListener("pointerup", function(event){
		
			domElement.releasePointerCapture(event.pointerId);
		
			if (self.contact != null && self.contact.isActive == true){
		
				// use css: touch-action: none instead of js to disable scrolling
				//self.domElement.classList.remove("disable-scrolling");
			
				self.contact.onPointerUp(event);
				self.recognizeGestures();
				
				if (self.options.hasOwnProperty("pointerup")){
					self.options.pointerup(event, self);
				}
			}
		});
		
		/*
		* case: user presses mouse button and moves element. while moving, the cursor leaves the element (fires pointerout)
		*		while outside the element, the mouse button is released. pointerup is not fired.
		*		during pan, pan should not end if the pointer leaves the element.
		* MDN: Pointer capture allows events for a particular pointer event (PointerEvent) to be re-targeted to a particular element instead of the normal (or hit test) target at a pointer's location. This can be used to ensure that an element continues to receive pointer events even if the pointer device's contact moves off the element (such as by scrolling or panning). 
		*/
		
		/*domElement.addEventListener("pointerout", function(event){
			
			if (self.contact != null && self.contact.isActive == true){
				self.contact.onPointerOut(event);
				self.recognizeGestures();
			}		
		});*/

		
		domElement.addEventListener("pointercancel", function(event){
		
			domElement.releasePointerCapture(event.pointerId);
		
			if (this.DEBUG == true){
				console.log("[TouchListener] pointercancel detected");
			}
		
			//self.domElement.classList.remove("disable-scrolling");
		
			self.contact.onPointerCancel(event);
			self.recognizeGestures();
			
			if (self.options.hasOwnProperty("pointercancel")){
				self.options.pointercancel(event, self);
			}
			
			
		}, { "passive": true });
		
	
	}
	
	// run all configured recognizers
	recognizeGestures (){
	
		for (let g=0; g<this.options.supportedGestures.length; g++){
		
			let gesture = this.options.supportedGestures[g];
			
			gesture.recognize(this.contact);
			
		}
		
	}
	
}
